const path = require("path");
const express = require("express");
const { Pool } = require("pg");
const catalogue = require("./data/catalogue.js");
const { search, byCategoryThenDescription, natural } = require("./search.js");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Set it to a Postgres connection string.");
  process.exit(1);
}

const isLocalDb = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

async function setup() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      code TEXT,
      description TEXT NOT NULL,
      price NUMERIC NOT NULL,
      unit TEXT NOT NULL,
      is_custom BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  // Reseed the master rows on every boot so data/catalogue.js stays the source of
  // truth for the transcribed price list. Rows added through the "Add item" form
  // are marked is_custom and are never touched by the reseed.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM products WHERE is_custom = FALSE");
    for (const row of catalogue) {
      await client.query(
        "INSERT INTO products (category, code, description, price, unit, is_custom) VALUES ($1, $2, $3, $4, $5, FALSE)",
        [row.category, row.code, row.description, row.price, row.unit]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/categories", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT category, COUNT(*)::int AS count FROM products GROUP BY category ORDER BY category"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get("/api/products", async (req, res, next) => {
  try {
    const { q, category, minPrice, maxPrice, sort } = req.query;

    const clauses = [];
    const params = [];

    if (category) {
      params.push(category);
      clauses.push(`category = $${params.length}`);
    }
    if (minPrice) {
      params.push(Number(minPrice));
      clauses.push(`price >= $${params.length}`);
    }
    if (maxPrice) {
      params.push(Number(maxPrice));
      clauses.push(`price <= $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const sortMap = {
      price_asc: "price ASC",
      price_desc: "price DESC",
      name_asc: "description ASC",
      name_desc: "description DESC",
    };
    const orderBy = sortMap[sort] || "category ASC, description ASC";

    const { rows } = await pool.query(
      `SELECT id, category, code, description, price::float8 AS price, unit, is_custom FROM products ${where} ORDER BY ${orderBy}`,
      params
    );

    // Text sorts compare numbers as numbers ("2.5mm" before "10mm"), which
    // SQL's ORDER BY can't do.
    if (sort === "name_asc") rows.sort((a, b) => natural.compare(a.description, b.description));
    else if (sort === "name_desc") rows.sort((a, b) => natural.compare(b.description, a.description));
    else if (!sortMap[sort]) rows.sort(byCategoryThenDescription);

    if (!q || !String(q).trim()) return res.json(rows);

    // Search ranks by relevance unless the user picked a sort; with an explicit
    // sort, keep that order and just filter.
    const result = search(rows, String(q));
    const ids = new Set(result.rows.map((r) => r.id));
    const out = sortMap[sort] ? rows.filter((r) => ids.has(r.id)) : result.rows;

    res.set("X-Search-Match", result.match);
    res.set("X-Search-Unmatched", encodeURIComponent(result.unmatched.join(" ")));
    res.json(out);
  } catch (err) {
    next(err);
  }
});

app.post("/api/products", async (req, res, next) => {
  try {
    const body = req.body || {};
    const category = String(body.category || "").trim();
    const code = String(body.code || "").trim();
    const description = String(body.description || "").trim();
    const unit = String(body.unit || "").trim() || "each";
    const price = Number(body.price);

    if (!category || !description) {
      return res.status(400).json({ error: "category and description are required" });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: "price must be a non-negative number" });
    }

    const { rows } = await pool.query(
      `INSERT INTO products (category, code, description, price, unit, is_custom)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, category, code, description, price::float8 AS price, unit, is_custom`,
      [category, code, description, price, unit]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

const PORT = process.env.PORT || 3000;

setup()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Benjamin & Winston catalogue running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to set up database:", err);
    process.exit(1);
  });

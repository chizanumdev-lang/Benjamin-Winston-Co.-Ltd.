// The catalogue's Express app, shared by the local server (server.js) and the
// Vercel serverless function (api/index.js).
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const { Pool } = require("pg");
const catalogue = require("./data/catalogue.js");
const { search, byCategoryThenDescription, natural } = require("./search.js");

const connectionString = process.env.DATABASE_URL;
const isLocalDb = /localhost|127\.0\.0\.1/.test(connectionString || "");
const pool = new Pool({
  connectionString,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
  // Serverless instances each hold their own pool; keep it small.
  max: process.env.VERCEL ? 2 : 10,
});

// Fingerprint of data/catalogue.js: the price list is only reseeded when it changes.
const catalogueVersion = crypto.createHash("sha256").update(JSON.stringify(catalogue)).digest("hex");

async function setup() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Set it to a Postgres connection string.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // One instance at a time: concurrent cold starts must not double-seed.
    await client.query("SELECT pg_advisory_xact_lock(4227)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        code TEXT,
        description TEXT NOT NULL,
        price NUMERIC NOT NULL,
        unit TEXT NOT NULL,
        is_custom BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE TABLE IF NOT EXISTS catalogue_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const { rows } = await client.query("SELECT value FROM catalogue_meta WHERE key = 'version'");
    if (rows[0]?.value !== catalogueVersion) {
      // data/catalogue.js is the source of truth for the transcribed price list.
      // Rows added through the "Add item" form are marked is_custom and are
      // never touched by the reseed.
      await client.query("DELETE FROM products WHERE is_custom = FALSE");
      await client.query(
        `INSERT INTO products (category, code, description, price, unit, is_custom)
         SELECT category, code, description, price, unit, FALSE
         FROM unnest($1::text[], $2::text[], $3::text[], $4::numeric[], $5::text[])
           AS t(category, code, description, price, unit)`,
        [
          catalogue.map((r) => r.category),
          catalogue.map((r) => r.code),
          catalogue.map((r) => r.description),
          catalogue.map((r) => r.price),
          catalogue.map((r) => r.unit),
        ]
      );
      await client.query(
        `INSERT INTO catalogue_meta (key, value) VALUES ('version', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [catalogueVersion]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Runs setup once per process; a failed attempt is retried on the next request.
let readyPromise = null;
function ready() {
  if (!readyPromise) {
    readyPromise = setup().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Every API request waits for the one-time database setup (a no-op once done).
app.use("/api", (req, res, next) => {
  ready().then(() => next(), next);
});

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
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: "price must be more than 0" });
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

// Errors are logged (visible in Vercel's function logs) and returned as JSON.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Server error" });
});

module.exports = { app, ready };

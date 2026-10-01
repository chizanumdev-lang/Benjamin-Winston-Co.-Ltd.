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
      ALTER TABLE products ADD COLUMN IF NOT EXISTS price_edited_at TIMESTAMPTZ;
      -- Every price change: staff edits, items added, and price-list reloads.
      CREATE TABLE IF NOT EXISTS price_audit (
        id SERIAL PRIMARY KEY,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        changed_by TEXT NOT NULL,
        source TEXT NOT NULL,
        category TEXT NOT NULL,
        code TEXT,
        description TEXT NOT NULL,
        unit TEXT NOT NULL,
        old_price NUMERIC,
        new_price NUMERIC NOT NULL
      );
    `);

    const { rows } = await client.query("SELECT value FROM catalogue_meta WHERE key = 'version'");
    if (rows[0]?.value !== catalogueVersion) {
      // data/catalogue.js is the source of truth for the transcribed price list.
      // Rows added through the "Add item" form are marked is_custom and are
      // never touched by the reseed. Prices staff have edited are kept, and
      // every list price that changes is written to the audit log.
      const before = await client.query(
        "SELECT category, code, description, price, price_edited_at FROM products WHERE is_custom = FALSE"
      );
      const keyOf = (r) => `${r.category}\u0000${r.code || ""}\u0000${r.description}`;
      const previous = new Map(before.rows.map((r) => [keyOf(r), r]));

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

      for (const row of catalogue) {
        const old = previous.get(keyOf(row));
        if (old?.price_edited_at) {
          await client.query(
            `UPDATE products SET price = $1, price_edited_at = $2
             WHERE is_custom = FALSE AND category = $3 AND COALESCE(code, '') = $4 AND description = $5`,
            [old.price, old.price_edited_at, row.category, row.code || "", row.description]
          );
        } else if (old && Number(old.price) !== Number(row.price)) {
          await client.query(
            `INSERT INTO price_audit (changed_by, source, category, code, description, unit, old_price, new_price)
             VALUES ('Price list', 'price-list', $1, $2, $3, $4, $5, $6)`,
            [row.category, row.code, row.description, row.unit, old.price, row.price]
          );
        }
      }

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

// Writes need the staff PIN (EDIT_PIN, a server secret) and a name for the
// audit log. With no EDIT_PIN configured, editing stays switched off.
function pinMatches(given) {
  const expected = Buffer.from(String(process.env.EDIT_PIN || ""));
  const actual = Buffer.from(String(given || ""));
  return expected.length > 0 && actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function requireStaff(req, res, next) {
  if (!process.env.EDIT_PIN) {
    return res.status(503).json({ error: "editing isn't switched on: set EDIT_PIN on the server" });
  }
  if (!pinMatches(req.get("X-Staff-Pin"))) {
    return res.status(401).json({ error: "wrong staff PIN" });
  }
  const name = decodeURIComponent(req.get("X-Staff-Name") || "").trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: "enter your name for the change log" });
  req.staffName = name;
  next();
}

// Lets the client check a PIN before showing staff-only screens.
app.post("/api/staff/check", requireStaff, (req, res) => {
  res.json({ ok: true });
});

app.patch("/api/products/:id", requireStaff, async (req, res, next) => {
  const id = Number(req.params.id);
  const price = Number((req.body || {}).price);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "unknown item" });
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "price must be more than 0" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query("SELECT * FROM products WHERE id = $1 FOR UPDATE", [id]);
    const item = current.rows[0];
    if (!item) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "this item no longer exists; reload the list" });
    }
    const { rows } = await client.query(
      `UPDATE products SET price = $1, price_edited_at = now() WHERE id = $2
       RETURNING id, category, code, description, price::float8 AS price, unit, is_custom, price_edited_at`,
      [price, id]
    );
    await client.query(
      `INSERT INTO price_audit (changed_by, source, category, code, description, unit, old_price, new_price)
       VALUES ($1, 'edit', $2, $3, $4, $5, $6, $7)`,
      [req.staffName, item.category, item.code, item.description, item.unit, item.price, price]
    );
    await client.query("COMMIT");
    res.json({ ...rows[0], old_price: Number(item.price) });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

app.get("/api/price-changes", requireStaff, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, changed_at, changed_by, source, category, code, description, unit,
              old_price::float8 AS old_price, new_price::float8 AS new_price
       FROM price_audit ORDER BY changed_at DESC, id DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
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
      code_asc: "code ASC",
    };
    const orderBy = sortMap[sort] || "category ASC, description ASC";

    const { rows } = await pool.query(
      `SELECT id, category, code, description, price::float8 AS price, unit, is_custom, price_edited_at
       FROM products ${where} ORDER BY ${orderBy}`,
      params
    );

    // Text sorts compare numbers as numbers ("2.5mm" before "10mm"), which
    // SQL's ORDER BY can't do.
    if (sort === "code_asc") rows.sort((a, b) => (!a.code) - (!b.code) || natural.compare(a.code, b.code));
    else if (sort === "name_asc") rows.sort((a, b) => natural.compare(a.description, b.description));
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

app.post("/api/products", requireStaff, async (req, res, next) => {
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
      `WITH added AS (
         INSERT INTO products (category, code, description, price, unit, is_custom)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id, category, code, description, price, unit, is_custom, price_edited_at
       ), logged AS (
         INSERT INTO price_audit (changed_by, source, category, code, description, unit, old_price, new_price)
         SELECT $6, 'added', category, code, description, unit, NULL, price FROM added
       )
       SELECT id, category, code, description, price::float8 AS price, unit, is_custom, price_edited_at FROM added`,
      [category, code, description, price, unit, req.staffName]
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

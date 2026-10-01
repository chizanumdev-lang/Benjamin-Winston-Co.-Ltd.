// Catalogue search tuned for how counter staff actually ask for things:
// "2.5mm twin and earth", "ansell flood", "4mm single", "nu-era".
//
// Every query word must match somewhere in the item (description, code,
// category or unit). Spacing and unit spellings are normalised on both sides,
// so "2.5 mm", "4.0mm", "250 watt" and "1 gang" match the price list's
// "2.5mm", "4mm", "250W" and "1-Gang". When no item matches every word, the
// items matching the most words come back as "closest matches", so a lookup
// never dead-ends while a customer waits.

// Phrases staff say that the price list spells differently.
const PHRASES = [
  [/\bt\s*(?:&|\+|and|n)\s*e\b/g, "twin earth"],
  [/\btwin\s*(?:&|\+|and|n)\s*earth\b/g, "twin earth"],
  [/\bflou?rescent\b|\bflorescent\b/g, "fluorescent"],
  [/\b(?:3|three)[\s-]*ph(?:ase)?\b/g, "three phase"],
  [/\b(?:1|one|single)[\s-]*ph(?:ase)?\b/g, "single phase"],
];

// Single words with accepted alternatives (any one may match).
const SYNONYMS = {
  bulb: ["lamp"],
  bulbs: ["lamp"],
  db: ["distribution board", "dist/board"],
  cu: ["consumer unit"],
  breaker: ["mcb", "rccb", "mccb", "elcb"],
  breakers: ["mcb", "rccb", "mccb", "elcb"],
  wire: ["cable"],
  wires: ["cable"],
};

const STOPWORDS = new Set([
  "and", "the", "of", "for", "with", "in", "to", "a", "an",
  "price", "prices", "cost", "how", "much", "is",
]);

// Number + unit spellings collapsed to one form: "250 Watt" -> "250w".
const UNIT_FORMS = [
  [/watts?/, "w"],
  [/amps?|amp/, "a"],
  [/mts|mtrs?|metres?|meters?/, "m"],
  [/yds|yards?/, "yd"],
  [/hrs?|hours?/, "hr"],
  [/gang|g/, "gang"],
  [/way/, "way"],
  [/poles?|p/, "pole"],
  [/core/, "core"],
  [/mm|ma|ka|kw|v|ft|inch|w|a|m|k/, null],
];

function normaliseUnits(text) {
  return text.replace(/(\d)\s*-?\s*([a-z]+)\b/g, (whole, digit, word) => {
    for (const [pattern, canonical] of UNIT_FORMS) {
      const full = new RegExp(`^(?:${pattern.source})$`);
      if (full.test(word)) return digit + (canonical ?? word);
    }
    return whole;
  });
}

function normalise(text) {
  let s = String(text || "").toLowerCase();
  for (const [pattern, replacement] of PHRASES) s = s.replace(pattern, replacement);
  return normaliseUnits(
    s
      .replace(/(\d+)\.0(?!\d)/g, "$1") // 4.0mm -> 4mm
      .replace(/(\d)\s*x\s*(\d)/g, "$1x$2") // 1 x 20W -> 1x20w
  );
}

const compact = (s) => s.replace(/[^a-z0-9.]/g, "");

function tokenise(query) {
  return normalise(query)
    .split(/[\s,()]+/)
    .map((t) => t.replace(/^[^a-z0-9]+|[^a-z0-9.]+$/g, ""))
    .filter((t) => t && !STOPWORDS.has(t));
}

function alternativesFor(token) {
  const alts = new Set([token, ...(SYNONYMS[token] || [])]);
  // Plurals: "lamps" should find "Lamp", "switches" should find "Switch".
  if (token.length > 3 && token.endsWith("es")) alts.add(token.slice(0, -2));
  if (token.length > 3 && token.endsWith("s")) alts.add(token.slice(0, -1));
  return [...alts].map((a) => normalise(a));
}

function indexRow(row) {
  const fields = {
    code: normalise(row.code),
    description: normalise(row.description),
    category: normalise(row.category),
    unit: normalise(row.unit),
  };
  const all = `${fields.description} ${fields.code} ${fields.category} ${fields.unit}`;
  return { fields, all, allCompact: compact(all), codeCompact: compact(fields.code) };
}

const FIELD_WEIGHTS = { description: 10, code: 8, category: 4, unit: 1 };

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Short letter-only words ("cu", "db", "sp", "mk") match whole words only;
// otherwise "cu" would find "curved" and "circular". Longer words match
// anywhere, ignoring punctuation, so "nuera" finds "NU-ERA/4X18".
function matcherFor(alt) {
  if (/^[a-z]{1,2}$/.test(alt)) {
    const word = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(alt)}(?![a-z0-9])`);
    return (value) => word.test(value);
  }
  const altCompact = compact(alt);
  return (value, valueCompact = compact(value)) =>
    value.includes(alt) || (altCompact !== "" && valueCompact.includes(altCompact));
}

// Returns the weight of the best field the token hit, or 0 for no match.
function scoreToken(index, alternatives) {
  let best = 0;
  for (const alt of alternatives) {
    if (!compact(alt)) continue;
    const matches = matcherFor(alt);
    if (!matches(index.all, index.allCompact)) continue;
    for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
      if (weight > best && matches(index.fields[field])) best = weight;
    }
    best = Math.max(best, 1);
  }
  return best;
}

// Natural order: "2.5mm" before "10mm", "70W" before "400W".
const natural = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function byCategoryThenDescription(a, b) {
  return natural.compare(a.category, b.category) || natural.compare(a.description, b.description);
}

function search(rows, query) {
  const tokens = tokenise(query);
  if (tokens.length === 0) return { rows, match: "all", unmatched: [] };

  const queryCompact = compact(normalise(query));
  const tokenAlts = tokens.map(alternativesFor);

  const scored = rows.map((row) => {
    const index = indexRow(row);
    const hits = tokenAlts.map((alts) => scoreToken(index, alts));
    let rank = 0;
    if (index.codeCompact && index.codeCompact === queryCompact) rank = 3;
    else if (index.codeCompact && queryCompact.length >= 3 && index.codeCompact.startsWith(queryCompact)) rank = 2;
    // Every word found in the item's own description or code beats matches
    // that lean on the category name.
    else if (hits.every((h) => h >= FIELD_WEIGHTS.code)) rank = 1;
    return { row, hits, matched: hits.filter((h) => h > 0).length, rank };
  });

  // Within a rank, results follow the price list: category, then size order.
  const byRank = (a, b) => b.rank - a.rank || byCategoryThenDescription(a.row, b.row);

  const exact = scored.filter((s) => s.matched === tokens.length);
  if (exact.length > 0) {
    return { rows: exact.sort(byRank).map((s) => s.row), match: "all", unmatched: [] };
  }

  // No item has every word: fall back to the items matching the most words,
  // preferring the rarer (more specific) words, so "mk socket" leads with MK
  // sockets rather than every socket on the list.
  const best = Math.max(0, ...scored.map((s) => s.matched));
  if (best === 0 || tokens.length < 2) return { rows: [], match: "none", unmatched: tokens };

  const frequency = tokens.map((_, i) => scored.filter((s) => s.hits[i] > 0).length);
  const specificity = (s) =>
    s.hits.reduce((sum, h, i) => (h > 0 ? sum + Math.log((rows.length + 1) / frequency[i]) : sum), 0);

  const closest = scored
    .filter((s) => s.matched === best)
    .map((s) => ({ ...s, specificity: specificity(s) }))
    .sort((a, b) => b.specificity - a.specificity || byRank(a, b));
  const unmatched = tokens.filter((_, i) => closest.every((s) => s.hits[i] === 0));
  return { rows: closest.map((s) => s.row), match: "partial", unmatched };
}

module.exports = { search, tokenise, normalise, byCategoryThenDescription, natural };

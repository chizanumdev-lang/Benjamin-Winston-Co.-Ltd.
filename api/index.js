// Vercel serverless entry: every /api/* request is rewritten here (vercel.json)
// and handled by the same Express app the local server uses.
const { app } = require("../app.js");

module.exports = app;

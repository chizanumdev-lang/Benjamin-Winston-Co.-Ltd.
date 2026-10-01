// Local / long-running server. On Vercel the same app runs from api/index.js.
const { app, ready } = require("./app.js");

const PORT = process.env.PORT || 3000;

ready()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Benjamin & Winston catalogue running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to set up database:", err.message);
    process.exit(1);
  });

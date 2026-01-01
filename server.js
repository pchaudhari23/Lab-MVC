const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/database");

const PORT = process.env.PORT || 3000;

(async function startServer() {
  try {
    // 1.Connect to DB
    await connectDB();

    // 2.Start server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
})();

const express = require("express");
const path = require("path");

// Import routers
const neurapathRouter = require("./routes/neurapathRoutes");
const vitasureRouter = require("./routes/vitasureRoutes");
const quantiadxRouter = require("./routes/quantiadxRoutes");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set EJS as template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files (CSS, JS, static HTML)
app.use(express.static(path.join(__dirname, "requisitions")));

// Dashboard route
app.get("/", (req, res) => {
  res.send("Dashboard");
});

// Mount routers
app.use("/neurapath", neurapathRouter);
app.use("/vitasure", vitasureRouter);
app.use("/quantiadx", quantiadxRouter);

module.exports = app;

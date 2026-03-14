const express = require("express");
const path = require("path");

// Import routers
const neurapathRouter = require("./routes/neurapathRoutes");
const vitasureRouter = require("./routes/vitasureRoutes");
const quantiadxRouter = require("./routes/quantiadxRoutes");

// EHR helpers
const { listPatients } = require("./EHR/handlers/ehr");

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
app.get("/", async (req, res) => {
  const labs = [
    {
      code: "NP",
      name: "NeuraPath Diagnostics",
      description: "Neurology-focused lab services with requisition support.",
      path: "/neurapath/requisition",
      key: "neurapath",
    },
    {
      code: "QD",
      name: "QuantiaDx",
      description: "Molecular diagnostics and assay test ordering.",
      path: "/quantiadx/requisition",
      key: "quantiadx",
    },
    {
      code: "VS",
      name: "Vitasure Labs",
      description: "Comprehensive lab test panels and patient data forms.",
      path: "/vitasure/requisition",
      key: "vitasure",
    },
  ];

  try {
    const patients = await listPatients();
    res.render("dashboard", { labs, patients });
  } catch (error) {
    console.error("Error loading patients:", error);
    res.status(500).send("Failed to load dashboard");
  }
});

// Mount routers
app.use("/neurapath", neurapathRouter);
app.use("/vitasure", vitasureRouter);
app.use("/quantiadx", quantiadxRouter);

module.exports = app;

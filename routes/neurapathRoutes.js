const express = require("express");
const router = express.Router();

const {
  getNeuraPathStatic,
  getNeuraPathForm,
  submitNeuraPathRequisition,
} = require("../controllers/neurapath_diagnostics");

// Static route
router.get("/static", getNeuraPathStatic);

// Dynamic form route
router.get("/requisition", getNeuraPathForm);

// Submit route
router.post("/submit", submitNeuraPathRequisition);

module.exports = router;

const express = require("express");
const router = express.Router();

const {
  getQuantiaDxStatic,
  getQuantiaDxForm,
  submitQuantiaDxRequisition,
} = require("../controllers/quantiaDX");

// Static route
router.get("/static", getQuantiaDxStatic);

// Dynamic form route
router.get("/requisition", getQuantiaDxForm);

// Submit route
router.post("/submit", submitQuantiaDxRequisition);

module.exports = router;

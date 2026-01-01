const mongoose = require("mongoose");

const patientDemographics = new mongoose.Schema(
  {
    firstname: { type: String, required: true },
    middlename: { type: String },
    lastname: { type: String, required: true },
    gender: { type: String, required: true },
    dob: { type: Date, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false }
);

const insuranceDetails = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    id: { type: String, required: true },
  },
  { _id: false }
);

const providerDetails = new mongoose.Schema(
  {
    name: { type: String, required: true },
    npi: { type: String, required: true },
    address: { type: String, required: true },
  },
  { _id: false }
);

const patientData = new mongoose.Schema(
  {
    patient: { type: patientDemographics, required: true },
    insurance: { type: insuranceDetails, required: true },
    provider: { type: providerDetails, required: true },
  },
  { _id: false }
);

const labTest = new mongoose.Schema(
  {
    labname: {
      type: String,
      required: true,
      enum: ["neurapath", "vitasure", "quantiadx"],
    },
    testSelected: {
      type: [String],
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const labOrder = new mongoose.Schema({
  patientData: {
    type: patientData,
    required: true,
  },
  labTest: {
    type: labTest,
    required: true,
  },
});

module.exports = mongoose.model("LabOrders", labOrder);

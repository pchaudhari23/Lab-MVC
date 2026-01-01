const path = require("path");
const LabOrders = require("../models/LabOrder");
const { fetchAndFormatPatientData } = require("../ehr");

const getNeuraPathStatic = (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "..",
      "requisitions",
      "Neurapath_diagnostics",
      "Neurapath_diagnostics.html"
    )
  );
};

const getNeuraPathForm = async (req, res) => {
  try {
    const patientEHR = await fetchAndFormatPatientData();
    res.render("neurapath_diagnostics", { ehrData: patientEHR });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load EHR data");
  }
};

const submitNeuraPathRequisition = async (req, res) => {
  const order = {
    patientData: {
      patient: {
        firstname: req.body["firstname"],
        middlename: req.body["middlename"],
        lastname: req.body["lastname"],
        gender: req.body["gender"],
        dob: req.body["dob"],
        email: req.body["email"],
        phone: req.body["phone"],
      },
      insurance: {
        provider: req.body["insurance-provider"],
        id: req.body["insurance-id"],
      },
      provider: {
        name: req.body["provider-name"],
        npi: req.body["npi-number"],
        address: req.body["provider-address"],
      },
    },
    labTest: {
      labname: "neurapath",
      testSelected: req.body["tests"] || [],
    },
  };

  try {
    // Save to database
    const newRequisition = new LabOrders(order);
    await newRequisition.save();

    console.log("NeuraPath Lab Order Submitted and Saved:", order);
    res.send("NeuraPath Diagnostics form submitted and saved successfully!");
  } catch (error) {
    console.error("Error saving requisition:", error);
    res.status(500).send("Error submitting form. Please try again.");
  }
};

module.exports = {
  getNeuraPathStatic,
  getNeuraPathForm,
  submitNeuraPathRequisition,
};

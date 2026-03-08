const path = require("path");
const LabOrders = require("../models/LabOrder");
const { fetchAndFormatPatientData } = require("../EHR/handlers/ehr");
const { generateAndUploadPDF } = require("../utils/pdfUtils");
const { v4: uuidv4 } = require("uuid");

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
    // 1. Save order in DB first
    const newRequisition = new LabOrders(order);
    const savedOrder = await newRequisition.save();

    // 2. Generate PDF + Upload to S3
    const fileKey = `requisitions/neurapath/${uuidv4()}.pdf`;
    const { s3Url } = await generateAndUploadPDF(
      "neurapath_diagnostics",
      {
        ehrData: order.patientData,
        tests: order.labTest.testSelected
      },
      fileKey
    );

    // 3. Save PDF URL in order
    savedOrder.pdfUrl = s3Url;
    await savedOrder.save();
    console.log("NeuraPath Lab Order Submitted:", savedOrder);
    res.send("NeuraPath Diagnostics form submitted and PDF generated!");
  } catch (error) {
    console.error("Error submitting requisition:", error);
    res.status(500).send("Error submitting form. Please try again.");
  }
};

module.exports = {
  getNeuraPathStatic,
  getNeuraPathForm,
  submitNeuraPathRequisition,
};

const path = require("path");
const LabOrders = require("../models/LabOrder");
const FormDocument = require("../models/FormDocument");
const { fetchAndFormatPatientData } = require("../EHR/handlers/ehr");
const { generateAndUploadPDF } = require("../utils/pdfUtils");
const { v4: uuidv4 } = require("uuid");

const getQuantiaDxStatic = (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "requisitions", "QuantiaDx", "QuantiaDx.html")
  );
};

const getQuantiaDxForm = async (req, res) => {
  try {
    const patientEHR = await fetchAndFormatPatientData(req.query.patient);
    res.render("quantiadx", { ehrData: patientEHR });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load EHR data");
  }
};

const submitQuantiaDxRequisition = async (req, res) => {
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
      labname: "quantiadx",
      testSelected: req.body["tests"] || [],
    },
  };

  try {
    // Save order in DB first
    const newRequisition = new LabOrders(order);
    const savedOrder = await newRequisition.save();

    // Generate PDF + Upload to S3
    const fileKey = `requisitions/quantiadx/${uuidv4()}.pdf`;
    const { s3Url } = await generateAndUploadPDF(
      "quantiadx",
      {
        ehrData: order.patientData,
        tests: order.labTest.testSelected,
      },
      fileKey
    );

    // Save PDF URL in order
    savedOrder.pdfUrl = s3Url;
    await savedOrder.save();

    // Save metadata in FormDocument collection
    await FormDocument.create({
      formId: savedOrder._id.toString(),
      userId: order.patientData.patient.email,
      fileName: fileKey.split("/").pop(),
      s3Url,
    });

    console.log("QuantiaDx Lab Order Submitted and Saved:", savedOrder);
    res.send("QuantiaDx form submitted and saved successfully!");
  } catch (error) {
    console.error("Error saving requisition:", error);
    res.status(500).send("Error submitting form. Please try again.");
  }
};

module.exports = {
  getQuantiaDxStatic,
  getQuantiaDxForm,
  submitQuantiaDxRequisition,
};

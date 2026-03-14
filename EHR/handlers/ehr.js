const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const { parseHL7Message } = require("./hl7_parser");
const {
  extractPatientDemographics,
  extractInsuranceDetails,
  extractProviderDetails,
} = require("./hl7_extractor");

const PATIENT_DATA_DIR = path.join(__dirname, "..", "patient_data");

/**
 * Read a raw HL7 file and parse it into a structured object.
 * @param {string} filePath - Absolute path to HL7 file
 */
const parseHL7File = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  return parseHL7Message(raw);
};

/**
 * Returns a list of patient records (from HL7 files) with minimal display info.
 * @returns {Promise<Array<{id:string, displayName:string, dob:string, gender:string}>>}
 */
const listPatients = async () => {
  const files = await fs.readdir(PATIENT_DATA_DIR);
  const hl7Files = files.filter((f) => f.toLowerCase().endsWith(".txt") || f.toLowerCase().endsWith(".hl7"));

  const patients = [];
  for (const filename of hl7Files) {
    try {
      const parsed = await parseHL7File(path.join(PATIENT_DATA_DIR, filename));
      const demographics = extractPatientDemographics(parsed);
      const id = path.parse(filename).name;
      patients.push({
        id,
        displayName: `${demographics.firstname} ${demographics.lastname}`.trim(),
        dob: demographics.dob ? demographics.dob.toISOString().split("T")[0] : "",
        gender: demographics.gender,
      });
    } catch (error) {
      // If a single file fails, ignore it but log for debugging
      console.warn(`Failed to parse patient file ${filename}:`, error.message);
    }
  }

  return patients;
};

/**
 * Load patient data for a given patient identifier (based on file name) and map it into the EHR form structure.
 * @param {string} patientId - Identifier matching the HL7 file basename (e.g., "Patient 1 HL7")
 */
const getPatientDataFromHL7 = async (patientId) => {
  if (!patientId) return null;

  const files = await fs.readdir(PATIENT_DATA_DIR);
  const normalizedId = patientId.toLowerCase();

  // Try exact match first, fall back to partial match
  let match = files.find((f) => {
    const base = path.parse(f).name;
    return base.toLowerCase() === normalizedId;
  });

  if (!match) {
    match = files.find((f) => path.parse(f).name.toLowerCase().includes(normalizedId));
  }

  if (!match) {
    return null;
  }

  const parsed = await parseHL7File(path.join(PATIENT_DATA_DIR, match));
  const patientDemographics = extractPatientDemographics(parsed);
  const insurance = extractInsuranceDetails(parsed);
  const provider = extractProviderDetails(parsed);

  return {
    patient: {
      firstname: patientDemographics.firstname,
      middlename: patientDemographics.middlename,
      lastname: patientDemographics.lastname,
      gender: patientDemographics.gender ? patientDemographics.gender.toLowerCase() : "",
      dob: patientDemographics.dob ? patientDemographics.dob.toISOString().split("T")[0] : "",
      email: patientDemographics.email,
      phone: patientDemographics.phone,
    },
    insurance: {
      provider: insurance.provider,
      id: insurance.id,
    },
    provider: {
      name: provider.name,
      npi: provider.npi,
      address: provider.address,
    },
  };
};

async function fetchAndFormatPatientData(patientId) {
  if (patientId) {
    const ehrData = await getPatientDataFromHL7(patientId);
    if (ehrData) return ehrData;
  }

  // Fallback to dummy data when no patientId is provided or HL7 parsing fails
  try {
    const response = await axios.get("https://dummyjson.com/users/4");
    const data = response.data;

    // Map API data to your requisition form structure
    const reqObj = {
      patient: {
        firstname: data.firstName || "Michael",
        middlename: data.middleName || "Andrew",
        lastname: data.lastName || "Thompson",
        gender: data.gender || "male",
        dob: data.birthDate || "1987-09-14",
        email: data.email || "michael.thompson87@gmail.com",
        phone: data.phone || "617-555-8392",
      },
      insurance: {
        provider: "Blue Cross Blue Shield",
        id: "BCBS-MA-784392615",
      },
      provider: {
        name: "Dr. Sarah L. Martinez, MD",
        npi: "1467583920",
        address: "1250 Medical Plaza Dr, Suite 420, Boston, MA 02115",
      },
    };

    console.log(reqObj);
    return reqObj;
  } catch (error) {
    console.error("Error fetching user data:", error.message);
    return null;
  }
}

module.exports = {
  fetchAndFormatPatientData,
  listPatients,
  getPatientDataFromHL7,
};

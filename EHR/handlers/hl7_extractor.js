const {
  getSegment,
  getAllSegments,
  getField,
  getComponentField
} = require('./hl7_parser');

/**
 * Extract patient demographics from HL7
 * @param {object} parsedData - Parsed HL7 data
 * @returns {object} Patient demographics object
 */
const extractPatientDemographics = (parsedData) => {
  const pidSegment = getSegment(parsedData, 'PID');
  
  if (!pidSegment) {
    throw new Error('Patient Identification (PID) segment not found');
  }

  // PID fields:
  // [0] - Set ID
  // [1] - Patient ID (external)
  // [2] - Patient ID (internal)
  // [4] - Patient Name
  // [6] - Date of Birth
  // [7] - Gender
  // [10] - Address
  // [12] - Phone
  // [13] - Email

  const nameComponents = getComponentField(pidSegment, 4); // Lastname^Firstname^Middlename^Prefix^Suffix
  const addressComponents = getComponentField(pidSegment, 10); // Street^City^State^Zip^Country
  const field12 = getField(pidSegment, 12);
  const field13 = getField(pidSegment, 13);
  const field14 = getField(pidSegment, 14);

  const isEmail = (value) => typeof value === 'string' && value.includes('@');
  const isPhone = (value) => typeof value === 'string' && /\d/.test(value);

  const email = [field12, field13, field14].find(isEmail) || '';
  const phone = [field12, field13, field14].find((v) => v && !isEmail(v) && isPhone(v)) || '';
  
  const dob = parseDate(getField(pidSegment, 6));
  
  return {
    firstname: nameComponents[1] || '',
    middlename: nameComponents[2] || '',
    lastname: nameComponents[0] || '',
    gender: mapGender(getField(pidSegment, 7)),
    dob: dob,
    email,
    phone
  };
};

/**
 * Extract insurance information from HL7
 * @param {object} parsedData - Parsed HL7 data
 * @returns {object} Insurance details object
 */
const extractInsuranceDetails = (parsedData) => {
  const in1Segment = getSegment(parsedData, 'IN1');
  
  if (!in1Segment) {
    throw new Error('Insurance (IN1) segment not found');
  }

  // IN1 fields (1-based HL7):
  //  2 - Insurance Plan ID
  //  3 - Insurance Company Name (may be compound: ID^Name)
  //  5 - Insurance Company Address/Location
  //  6 - Insurance Phone
  //  10 - Policy Number (depends on vendor, may be in different fields)

  const planId = getField(in1Segment, 1);
  const companyRaw = getField(in1Segment, 2);
  const policyNumber = getField(in1Segment, 9);

  // If companyRaw is compound (e.g., LIC^Life Insurance Corporation), prefer the human-readable name.
  const companyComponents = companyRaw.split('^').map((c) => c.trim()).filter(Boolean);
  const companyName = companyComponents.length > 1 ? companyComponents[1] : companyComponents[0] || '';

  return {
    provider: companyName || 'Unknown',
    id: planId || policyNumber || ''
  };
};

/**
 * Extract provider information from HL7
 * @param {object} parsedData - Parsed HL7 data
 * @returns {object} Provider details object
 */
const extractProviderDetails = (parsedData) => {
  const pv1Segment = getSegment(parsedData, 'PV1');
  if (!pv1Segment) {
    throw new Error('Encounter Information (PV1) segment not found');
  }

  // PV1 fields (0-based indices):
  //  2 - Assigned Patient Location (location info)
  //  5 - Attending Doctor (ID^LastName^FirstName^MiddleName^Suffix^Prefix^Degree)

  const attendingDoctor = getComponentField(pv1Segment, 5);
  const npi = attendingDoctor[0] || '';
  const doctorName = `${attendingDoctor[1] || ''} ${attendingDoctor[2] || ''}`.trim();

  const locationRaw = getField(pv1Segment, 2) || '';
  const locationParts = locationRaw.split('^').map((p) => p.trim()).filter(Boolean);
  const location = locationParts.join(', ');

  return {
    name: doctorName || 'Unknown Provider',
    npi: npi || 'N/A',
    address: location || 'Unknown'
  };
};

/**
 * Extract lab tests/orders from HL7
 * @param {object} parsedData - Parsed HL7 data
 * @returns {object} Lab test information
 */
const extractLabTests = (parsedData) => {
  const obrSegments = getAllSegments(parsedData, 'OBR');
  
  if (obrSegments.length === 0) {
    throw new Error('Observation Request (OBR) segment not found');
  }

  const tests = [];
  
  obrSegments.forEach(obrSegment => {
    // OBR fields:
    // [3] - Filler Order Number
    // [4] - Universal Service ID (test code)
    // [6] - Observation DateTime
    
    const testCode = getComponentField(obrSegment, 4); // Code^Description^CodeSystem
    const testName = testCode[1] || testCode[0] || 'Unknown Test';
    
    tests.push({
      testCode: testCode[0] || '',
      testName: testName,
      orderedAt: parseDate(getField(obrSegment, 6))
    });
  });

  return tests;
};

/**
 * Extract all observations (test results) from HL7
 * @param {object} parsedData - Parsed HL7 data
 * @returns {array} Array of observation results
 */
const extractObservations = (parsedData) => {
  const obxSegments = getAllSegments(parsedData, 'OBX');
  
  if (obxSegments.length === 0) {
    return [];
  }

  // OBX fields:
  // [1] - Sequence ID
  // [2] - Value Type (NM=Numeric, ST=String, etc.)
  // [3] - Observation ID
  // [5] - Observation Value
  // [6] - Units of Measurement
  // [7] - Reference Range
  // [8] - Interpretation Codes

  return obxSegments.map(obxSegment => ({
    sequence: getField(obxSegment, 1),
    valueType: getField(obxSegment, 2),
    observationCode: getComponentField(obxSegment, 3)[0],
    observationName: getComponentField(obxSegment, 3)[1],
    value: getField(obxSegment, 5),
    units: getField(obxSegment, 6),
    referenceRange: getField(obxSegment, 7),
    interpretation: getField(obxSegment, 8)
  }));
};

/**
 * Helper: Parse HL7 date format (YYYYMMDD) to JavaScript Date
 * @param {string} dateStr - HL7 date string
 * @returns {Date} JavaScript Date object
 */
const parseDate = (dateStr) => {
  if (!dateStr || dateStr.length < 8) {
    return null;
  }
  
  try {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    
    return new Date(year, month, day);
  } catch (error) {
    console.warn('Failed to parse date:', dateStr);
    return null;
  }
};

/**
 * Helper: Map HL7 gender codes to standard format
 * @param {string} genderCode - HL7 gender code
 * @returns {string} Standardized gender
 */
const mapGender = (genderCode) => {
  const genderMap = {
    'M': 'Male',
    'F': 'Female',
    'O': 'Other',
    'U': 'Unknown'
  };
  return genderMap[genderCode] || genderCode || 'Unknown';
};

module.exports = {
  extractPatientDemographics,
  extractInsuranceDetails,
  extractProviderDetails,
  extractLabTests,
  extractObservations,
  parseDate,
  mapGender
};

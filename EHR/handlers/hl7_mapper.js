const {
  extractPatientDemographics,
  extractInsuranceDetails,
  extractProviderDetails,
  extractLabTests,
  extractObservations
} = require('./hl7_extractor');

/**
 * Map HL7 data to LabOrder Mongoose model format
 * @param {string} hl7Message - Raw HL7 message
 * @param {string} labname - Lab name (neurapath, vitasure, quantiadx)
 * @returns {Promise<object>} Formatted lab order object matching Mongoose schema
 */
const mapHL7ToLabOrder = async (hl7Message, labname) => {
  try {
    // Parse the HL7 message
    const { parseHL7Message } = require('./hl7_parser');
    const parsedData = parseHL7Message(hl7Message);

    // Extract all segments
    const patientDemographics = extractPatientDemographics(parsedData);
    const insuranceDetails = extractInsuranceDetails(parsedData);
    const providerDetails = extractProviderDetails(parsedData);
    const labTests = extractLabTests(parsedData);
    const observations = extractObservations(parsedData);

    // Determine test types based on lab name and observations
    const testSelected = determineTestTypes(labname, observations);

    // Build the lab order object matching the Mongoose schema
    const labOrder = {
      patientData: {
        patient: {
          firstname: patientDemographics.firstname,
          middlename: patientDemographics.middlename,
          lastname: patientDemographics.lastname,
          gender: patientDemographics.gender,
          dob: patientDemographics.dob,
          email: patientDemographics.email,
          phone: patientDemographics.phone
        },
        insurance: {
          provider: insuranceDetails.provider,
          id: insuranceDetails.id
        },
        provider: {
          name: providerDetails.name,
          npi: providerDetails.npi,
          address: providerDetails.address
        }
      },
      labTest: {
        labname: labname.toLowerCase(),
        testSelected: testSelected,
        submittedAt: new Date()
      },
      // Additional metadata (not in schema but useful)
      _metadata: {
        labTests: labTests,
        observations: observations
      }
    };

    return labOrder;
  } catch (error) {
    console.error('Error mapping HL7 to LabOrder:', error);
    throw error;
  }
};

/**
 * Determine test types based on lab name and observations
 * @param {string} labname - Lab name (neurapath, vitasure, quantiadx)
 * @param {array} observations - Extracted observations from HL7
 * @returns {array} Array of test names
 */
const determineTestTypes = (labname, observations) => {
  const labname_lower = labname.toLowerCase();
  const testSet = new Set();

  // Extract test names from observations
  observations.forEach(obs => {
    if (obs.observationName) {
      testSet.add(obs.observationName);
    }
  });

  // If no tests found in observations, use defaults based on lab name
  if (testSet.size === 0) {
    const defaults = {
      'neurapath': ['Neuro Pathology Panel', 'CSF Analysis', 'Brain MRI'],
      'vitasure': ['Vital Signs Panel', 'Immunization Record', 'Health Screening'],
      'quantiadx': ['Blood Chemistry Panel', 'Hematology', 'Metabolic Panel']
    };

    return defaults[labname_lower] || ['General Lab Test'];
  }

  return Array.from(testSet);
};

/**
 * Map multiple HL7 messages from directory
 * @param {array} hl7Messages - Array of {filename, content} objects
 * @param {string} defaultLabname - Default lab name if not specified
 * @returns {Promise<array>} Array of formatted lab orders
 */
const mapMultipleHL7ToLabOrders = async (hl7Messages, defaultLabname = 'vitasure') => {
  try {
    const labOrders = [];

    for (const message of hl7Messages) {
      try {
        // Try to determine lab from filename
        let labname = defaultLabname;
        if (message.filename.toLowerCase().includes('neurapath')) {
          labname = 'neurapath';
        } else if (message.filename.toLowerCase().includes('quantia')) {
          labname = 'quantiadx';
        } else if (message.filename.toLowerCase().includes('vitasure')) {
          labname = 'vitasure';
        }

        const labOrder = await mapHL7ToLabOrder(message.content, labname);
        labOrder._filename = message.filename;
        labOrders.push(labOrder);
      } catch (error) {
        console.error(`Failed to process ${message.filename}:`, error.message);
        // Continue processing other files
      }
    }

    return labOrders;
  } catch (error) {
    console.error('Error mapping multiple HL7 messages:', error);
    throw error;
  }
};

/**
 * Validate lab order object against schema requirements
 * @param {object} labOrder - Lab order object to validate
 * @returns {object} {valid: boolean, errors: array}
 */
const validateLabOrder = (labOrder) => {
  const errors = [];

  // Check patientData structure
  if (!labOrder.patientData) errors.push('Missing patientData');
  if (!labOrder.patientData?.patient) errors.push('Missing patientData.patient');
  if (!labOrder.patientData?.insurance) errors.push('Missing patientData.insurance');
  if (!labOrder.patientData?.provider) errors.push('Missing patientData.provider');

  // Check patient required fields
  const patient = labOrder.patientData?.patient;
  if (!patient?.firstname) errors.push('Missing patient.firstname');
  if (!patient?.lastname) errors.push('Missing patient.lastname');
  if (!patient?.gender) errors.push('Missing patient.gender');
  if (!patient?.dob) errors.push('Missing patient.dob');
  if (!patient?.email) errors.push('Missing patient.email');
  if (!patient?.phone) errors.push('Missing patient.phone');

  // Check insurance required fields
  const insurance = labOrder.patientData?.insurance;
  if (!insurance?.provider) errors.push('Missing insurance.provider');
  if (!insurance?.id) errors.push('Missing insurance.id');

  // Check provider required fields
  const provider = labOrder.patientData?.provider;
  if (!provider?.name) errors.push('Missing provider.name');
  if (!provider?.npi) errors.push('Missing provider.npi');
  if (!provider?.address) errors.push('Missing provider.address');

  // Check labTest structure
  if (!labOrder.labTest) errors.push('Missing labTest');
  const labTest = labOrder.labTest;
  if (!labTest?.labname) errors.push('Missing labTest.labname');
  if (!['neurapath', 'vitasure', 'quantiadx'].includes(labTest?.labname)) {
    errors.push(`Invalid labname: ${labTest?.labname}. Must be one of: neurapath, vitasure, quantiadx`);
  }
  if (!labTest?.testSelected || labTest.testSelected.length === 0) {
    errors.push('Missing or empty labTest.testSelected');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
};

module.exports = {
  mapHL7ToLabOrder,
  mapMultipleHL7ToLabOrders,
  validateLabOrder,
  determineTestTypes
};

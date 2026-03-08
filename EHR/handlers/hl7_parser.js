const Hl7 = require('simple-hl7');

/**
 * Parse raw HL7 message string into segments
 * @param {string} hl7Message - Raw HL7 message
 * @returns {object} Parsed HL7 message object
 */
const parseHL7Message = (hl7Message) => {
  try {
    // Remove BOM and extra whitespace
    const cleanMessage = hl7Message.trim();
    
    // Split by line breaks to get segments
    const segments = cleanMessage.split(/\r\n|\r|\n/).filter(line => line.trim());
    
    const parsedData = {};
    
    segments.forEach((segment) => {
      const [segmentType, ...fields] = segment.split('|');
      
      // Store segments by type, handling multiple occurrences
      if (!parsedData[segmentType]) {
        parsedData[segmentType] = [];
      }
      
      parsedData[segmentType].push({
        type: segmentType,
        fields: fields,
        raw: segment
      });
    });
    
    return parsedData;
  } catch (error) {
    console.error('Error parsing HL7 message:', error);
    throw error;
  }
};

/**
 * Get specific segment by index
 * @param {object} parsedData - Parsed HL7 data
 * @param {string} segmentType - Type of segment (MSH, PID, etc.)
 * @param {number} index - Index of segment occurrence (default 0)
 * @returns {object} Segment object
 */
const getSegment = (parsedData, segmentType, index = 0) => {
  if (parsedData[segmentType] && parsedData[segmentType][index]) {
    return parsedData[segmentType][index];
  }
  return null;
};

/**
 * Get all segments of a type
 * @param {object} parsedData - Parsed HL7 data
 * @param {string} segmentType - Type of segment
 * @returns {array} Array of segments
 */
const getAllSegments = (parsedData, segmentType) => {
  return parsedData[segmentType] || [];
};

/**
 * Get field value from segment
 * @param {object} segment - Segment object
 * @param {number} fieldIndex - Zero-based field index
 * @returns {string} Field value
 */
const getField = (segment, fieldIndex) => {
  if (segment && segment.fields && segment.fields[fieldIndex]) {
    return segment.fields[fieldIndex].trim();
  }
  return '';
};

/**
 * Parse repeating field (separated by ~)
 * @param {object} segment - Segment object
 * @param {number} fieldIndex - Zero-based field index
 * @returns {array} Array of values
 */
const getRepeatingField = (segment, fieldIndex) => {
  const field = getField(segment, fieldIndex);
  return field.split('~').map(f => f.trim()).filter(f => f);
};

/**
 * Parse component field (separated by ^)
 * @param {object} segment - Segment object
 * @param {number} fieldIndex - Zero-based field index
 * @returns {array} Array of components
 */
const getComponentField = (segment, fieldIndex) => {
  const field = getField(segment, fieldIndex);
  return field.split('^').map(c => c.trim()).filter(c => c);
};

module.exports = {
  parseHL7Message,
  getSegment,
  getAllSegments,
  getField,
  getRepeatingField,
  getComponentField
};

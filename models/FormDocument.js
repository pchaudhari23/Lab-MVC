const mongoose = require('mongoose');

const formDocumentSchema = new mongoose.Schema({
  formId: String,
  userId: String,
  fileName: String,
  s3Url: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FormDocument', formDocumentSchema);
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z]{2,5}$/ },
  description: { type: String, trim: true, maxlength: 300 },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);

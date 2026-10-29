const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  bookId: { type: String, required: true, unique: true, trim: true },
  isbn: { type: String, trim: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  author: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  publisher: { type: String, trim: true, maxlength: 120 },
  year: { type: Number, min: 1000, max: 2100 },
  coverUrl: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, maxlength: 1000 },
  totalCopies: { type: Number, required: true, min: 1, validate: Number.isInteger },
  availableCopies: { type: Number, required: true, min: 0, validate: Number.isInteger },
  shelf: { type: String, required: true, trim: true, uppercase: true, index: true },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true, toJSON: { virtuals: true } });

bookSchema.virtual('status').get(function () { return this.availableCopies > 0 ? 'Available' : 'Unavailable'; });

module.exports = mongoose.model('Book', bookSchema);

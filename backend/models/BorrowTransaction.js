const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema({
  txnId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
  // Snapshot so reports stay correct even if the profile changes later
  studentName: String, studentId: String, department: String, year: Number,
  borrowDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  returnDate: Date,
  status: { type: String, enum: ['borrowed', 'returned'], default: 'borrowed', index: true },
  overdueDays: { type: Number, default: 0 },
  fineAmount: { type: Number, default: 0 },
  returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// A student can hold only one active copy of the same book (race-condition safe)
borrowSchema.index({ user: 1, book: 1 }, { unique: true, partialFilterExpression: { status: 'borrowed' } });

module.exports = mongoose.model('BorrowTransaction', borrowSchema);

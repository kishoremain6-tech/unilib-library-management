const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema({
  borrow: { type: mongoose.Schema.Types.ObjectId, ref: 'BorrowTransaction', required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  overdueDays: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Unpaid', 'Paid', 'Waived'], default: 'Unpaid', index: true },
  waiverReason: { type: String, trim: true, maxlength: 300 },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Fine', fineSchema);

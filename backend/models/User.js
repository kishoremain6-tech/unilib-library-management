const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  studentId: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
  department: { type: String, trim: true, maxlength: 80 },
  year: { type: Number, min: 1, max: 6 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'librarian'], default: 'student' },
  interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
}, { timestamps: true });

userSchema.methods.toSafe = function () {
  const o = this.toObject(); delete o.password; delete o.__v; return o;
};
module.exports = mongoose.model('User', userSchema);

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const { AppError, asyncHandler, clean } = require('../utils/helpers');
const { readUser } = require('../middleware/auth');

const sign = (res, user) => {
  const days = Number(process.env.JWT_EXPIRES_DAYS) || 1;
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: `${days}d` });
  res.cookie('token', token, {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: days * 86400000,
  });
};

exports.register = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const name = clean(b.name), studentId = clean(b.studentId), department = clean(b.department);
  const email = String(clean(b.email) || '').toLowerCase(), phone = clean(b.phone);
  const year = Number(b.year), password = String(b.password || '');
  const errors = {};
  if (!name || name.length < 2 || name.length > 80) errors.name = 'Enter your full name (2–80 characters).';
  if (!/^[A-Za-z0-9\-\/]{3,20}$/.test(studentId || '')) errors.studentId = 'Student ID: 3–20 letters, numbers, - or /.';
  if (!department) errors.department = 'Choose your department.';
  if (!Number.isInteger(year) || year < 1 || year > 6) errors.year = 'Year of study must be 1–6.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!/^(\+91[\-\s]?)?[6-9]\d{9}$/.test(phone || '')) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'Password needs 8+ characters with letters and numbers.';
  if (password !== String(b.confirmPassword || '')) errors.confirmPassword = 'Passwords do not match.';
  if (Object.keys(errors).length) throw new AppError('Please fix the highlighted fields.', 400, errors);

  const hash = await bcrypt.hash(password, 12);
  // role is set here, never read from the request, so nobody can self-register as librarian
  const user = await User.create({ name, studentId, department, year, email, phone, password: hash, role: 'student' });
  sign(res, user);
  res.status(201).json({ user: user.toSafe() });
});

exports.login = asyncHandler(async (req, res) => {
  const { identifier, password, role } = req.body || {};
  if (!identifier || !password) throw new AppError('Enter your email or student ID and password.', 400);
  const id = String(identifier).trim();
  const user = await User.findOne({ $or: [{ email: id.toLowerCase() }, { studentId: id.toUpperCase() }] }).select('+password');
  const ok = user && await bcrypt.compare(String(password), user.password);
  const wantRole = role === 'librarian' ? 'librarian' : 'student';
  if (!ok || user.role !== wantRole) throw new AppError('Incorrect login details.', 401);
  sign(res, user);
  res.json({ user: user.toSafe() });
});

exports.logout = (req, res) => { res.clearCookie('token'); res.json({ message: 'Logged out.' }); };

exports.me = asyncHandler(async (req, res) => {
  const user = await readUser(req);
  res.json({ user: user ? user.toSafe() : null });
});

exports.setInterests = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.interests) ? req.body.interests.filter(mongoose.isValidObjectId) : [];
  const valid = await Category.find({ _id: { $in: ids } }).select('_id');
  req.user.interests = valid.map((c) => c._id);
  await req.user.save();
  res.json({ user: req.user.toSafe() });
});

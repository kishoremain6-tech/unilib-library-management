const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../utils/helpers');

const readUser = async (req) => {
  const token = req.cookies && req.cookies.token;
  if (!token) return null;
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(p.id);
  } catch { return null; }
};

exports.readUser = readUser;

exports.protect = async (req, res, next) => {
  try {
    const user = await readUser(req);
    if (!user) throw new AppError('Please log in to continue.', 401);
    req.user = user;
    next();
  } catch (e) { next(e); }
};

// Role is always checked on the server, never trusted from the client
exports.restrictTo = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError('You do not have permission to do that.', 403));

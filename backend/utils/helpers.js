class AppError extends Error {
  constructor(message, status = 400, errors) { super(message); this.status = status; this.errors = errors; this.isOperational = true; }
}
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (v) => (typeof v === 'string' ? v.trim() : v);
module.exports = { AppError, asyncHandler, escapeRegex, clean };

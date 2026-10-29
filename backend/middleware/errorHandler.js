module.exports = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.isOperational ? err.message : 'Something went wrong on the server.';
  let errors = err.errors;

  if (err.name === 'ValidationError') {
    status = 400; message = 'Please check the highlighted fields.';
    errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err.name === 'CastError') {
    status = 400; message = 'Invalid identifier supplied.';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    message = `That ${field === 'studentId' ? 'student ID' : field} is already in use.`;
  }
  if (status === 500) console.error(err);
  res.status(status).json({ message, errors });
};

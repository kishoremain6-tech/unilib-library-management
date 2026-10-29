const mongoose = require('mongoose');
const Book = require('../models/Book');
const Borrow = require('../models/BorrowTransaction');
const Fine = require('../models/Fine');
const User = require('../models/User');
const settings = require('../config/settings');
const { dueDateFrom, overdueDays, fineFor, decorate } = require('../services/fineService');
const { AppError, asyncHandler, escapeRegex } = require('../utils/helpers');

const bookFields = 'title author bookId shelf coverUrl category isbn';
const genTxn = () => 'TXN-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

const fineMapFor = async (borrows) => {
  const fines = await Fine.find({ borrow: { $in: borrows.map((b) => b._id) } });
  return Object.fromEntries(fines.map((f) => [String(f.borrow), f]));
};

exports.borrow = asyncHandler(async (req, res) => {
  const { bookId, agree } = req.body || {};
  const user = req.user;
  if (user.role !== 'student') throw new AppError('Only student accounts can borrow books.', 403);
  if (agree !== true) throw new AppError('Please agree to the library rules to continue.', 400);
  if (!mongoose.isValidObjectId(bookId)) throw new AppError('Invalid book.', 400);

  const active = await Borrow.find({ user: user._id, status: 'borrowed' }).select('book dueDate');
  if (active.some((a) => String(a.book) === String(bookId))) throw new AppError('You already have this book on loan.', 409);
  if (active.length >= settings.maxActive) throw new AppError(`You can hold at most ${settings.maxActive} books at a time.`, 409);
  if (active.some((a) => overdueDays(a.dueDate) > 0)) throw new AppError('Return your overdue books before borrowing again.', 403);

  // Atomic decrement: succeeds only if a copy is still available (no oversell under concurrency)
  const book = await Book.findOneAndUpdate({ _id: bookId, availableCopies: { $gt: 0 } }, { $inc: { availableCopies: -1 } }, { new: true });
  if (!book) {
    const exists = await Book.exists({ _id: bookId });
    throw new AppError(exists ? 'No copies are available right now.' : 'Book not found.', exists ? 409 : 404);
  }
  try {
    const now = new Date();
    const txn = await Borrow.create({
      txnId: genTxn(), user: user._id, book: book._id,
      studentName: user.name, studentId: user.studentId, department: user.department, year: user.year,
      borrowDate: now, dueDate: dueDateFrom(now),
    });
    res.status(201).json({ transaction: { txnId: txn.txnId, borrowDate: txn.borrowDate, dueDate: txn.dueDate, book: { title: book.title, bookId: book.bookId, shelf: book.shelf } } });
  } catch (e) {
    await Book.updateOne({ _id: book._id }, { $inc: { availableCopies: 1 } }); // rollback inventory
    if (e.code === 11000) throw new AppError('You already have this book on loan.', 409);
    throw e;
  }
});

exports.returnBook = asyncHandler(async (req, res) => {
  const b = await Borrow.findById(req.params.id);
  const isStaff = req.user.role === 'librarian';
  if (!b || (!isStaff && !b.user.equals(req.user._id))) throw new AppError('Borrowing record not found.', 404);

  const now = new Date();
  const od = overdueDays(b.dueDate, now);   // computed on the server only
  const amount = fineFor(od);
  const done = await Borrow.findOneAndUpdate(
    { _id: b._id, status: 'borrowed' },
    { status: 'returned', returnDate: now, overdueDays: od, fineAmount: amount, returnedBy: req.user._id }, { new: true });
  if (!done) throw new AppError('This book was already returned.', 409);
  try {
    await Book.updateOne({ _id: done.book }, { $inc: { availableCopies: 1 } });
    if (amount > 0) await Fine.create({ borrow: done._id, user: done.user, amount, overdueDays: od });
  } catch (e) {
    await Borrow.updateOne({ _id: done._id }, { status: 'borrowed', $unset: { returnDate: 1, returnedBy: 1 }, overdueDays: 0, fineAmount: 0 });
    throw e;
  }
  res.json({ message: amount ? `Returned ${od} day(s) late. Fine: ₹${amount}.` : 'Returned on time. No fine.', overdueDays: od, fineAmount: amount });
});

exports.mine = asyncHandler(async (req, res) => {
  const list = await Borrow.find({ user: req.user._id }).populate({ path: 'book', select: bookFields, populate: { path: 'category', select: 'name code' } }).sort({ borrowDate: -1 });
  const fm = await fineMapFor(list);
  res.json({ borrows: list.map((b) => decorate(b, fm)) });
});

exports.all = asyncHandler(async (req, res) => {
  const { status, q } = req.query;
  const filter = {};
  if (status === 'returned') filter.status = 'returned';
  if (status === 'active' || status === 'overdue') filter.status = 'borrowed';
  if (status === 'overdue') filter.dueDate = { $lt: require('../services/fineService').startOfDay(new Date()) };
  if (q) { const rx = new RegExp(escapeRegex(String(q).slice(0, 50)), 'i'); filter.$or = [{ studentName: rx }, { studentId: rx }, { txnId: rx }]; }
  const list = await Borrow.find(filter).populate('book', bookFields).sort({ borrowDate: -1 }).limit(200);
  const fm = await fineMapFor(list);
  res.json({ borrows: list.map((b) => decorate(b, fm)) });
});

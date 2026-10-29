const mongoose = require('mongoose');
const Book = require('../models/Book');
const Category = require('../models/Category');
const Borrow = require('../models/BorrowTransaction');
const User = require('../models/User');
const settings = require('../config/settings');
const { AppError, asyncHandler, escapeRegex, clean } = require('../utils/helpers');

const populateCat = { path: 'category', select: 'name code' };

exports.list = asyncHandler(async (req, res) => {
  const { q, category, available, shelf } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(60, Math.max(1, parseInt(req.query.limit) || 12));
  const filter = {};
  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim().slice(0, 60)), 'i');
    filter.$or = [{ title: rx }, { author: rx }, { isbn: rx }, { bookId: rx }];
  }
  if (category && mongoose.isValidObjectId(category)) filter.category = category;
  if (available === 'true') filter.availableCopies = { $gt: 0 };
  if (shelf) filter.shelf = new RegExp('^' + escapeRegex(String(shelf).toUpperCase().slice(0, 20)));
  const [books, total] = await Promise.all([
    Book.find(filter).populate(populateCat).sort({ title: 1 }).skip((page - 1) * limit).limit(limit),
    Book.countDocuments(filter),
  ]);
  res.json({ books, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id).populate(populateCat);
  if (!book) throw new AppError('Book not found.', 404);
  res.json({ book });
});

exports.recent = asyncHandler(async (req, res) => {
  const books = await Book.find().populate(populateCat).sort({ createdAt: -1, _id: -1 }).limit(8);
  res.json({ books });
});

// Popular = most borrowed, counted from real BorrowTransaction records
exports.popular = asyncHandler(async (req, res) => {
  const top = await Borrow.aggregate([{ $group: { _id: '$book', borrows: { $sum: 1 } } }, { $sort: { borrows: -1 } }, { $limit: 8 }]);
  const books = await Book.find({ _id: { $in: top.map((t) => t._id) } }).populate(populateCat);
  const byId = Object.fromEntries(books.map((b) => [String(b._id), b]));
  res.json({ books: top.filter((t) => byId[String(t._id)]).map((t) => ({ ...byId[String(t._id)].toJSON(), borrows: t.borrows })) });
});

// Suggestions from the student's chosen interests + categories they've borrowed before
exports.recommendations = asyncHandler(async (req, res) => {
  const history = await Borrow.find({ user: req.user._id }).populate('book', 'category');
  const score = {};
  (req.user.interests || []).forEach((c) => { score[c] = (score[c] || 0) + 2; });
  const seen = new Set();
  history.forEach((h) => { if (h.book) { seen.add(String(h.book._id)); const c = String(h.book.category); score[c] = (score[c] || 0) + 1; } });
  const cats = Object.keys(score);
  if (!cats.length) return res.json({ books: [], note: 'Pick a few interests to get suggestions.' });
  const picks = await Book.find({ category: { $in: cats }, availableCopies: { $gt: 0 }, _id: { $nin: [...seen] } }).populate(populateCat).limit(80);
  picks.sort((a, b) => (score[String(b.category._id)] - score[String(a.category._id)]) || (b.year - a.year));
  const interestSet = new Set((req.user.interests || []).map(String));
  const books = picks.slice(0, 8).map((b) => ({
    ...b.toJSON(),
    reason: interestSet.has(String(b.category._id)) ? `You picked ${b.category.name} as an interest` : `You've borrowed from ${b.category.name} before`,
  }));
  res.json({ books, note: 'These are suggestions based on your interests and borrowing history, not a verdict on what you should read.' });
});

// Rack map: category -> racks (e.g. CS-R1) with book and availability counts
exports.shelfMap = asyncHandler(async (req, res) => {
  const [cats, books] = await Promise.all([Category.find().sort({ name: 1 }), Book.find().select('category shelf availableCopies')]);
  const map = {};
  books.forEach((b) => {
    const rack = b.shelf.split('-').slice(0, 2).join('-');
    const key = String(b.category);
    map[key] = map[key] || {};
    map[key][rack] = map[key][rack] || { rack, books: 0, available: 0 };
    map[key][rack].books += 1;
    if (b.availableCopies > 0) map[key][rack].available += 1;
  });
  res.json({ shelves: cats.map((c) => ({ category: c, racks: Object.values(map[String(c._id)] || {}).sort((a, b) => a.rack.localeCompare(b.rack, undefined, { numeric: true })) })) });
});

exports.publicStats = asyncHandler(async (req, res) => {
  const [books, copies, categories, students, borrows] = await Promise.all([
    Book.countDocuments(), Book.aggregate([{ $group: { _id: null, n: { $sum: '$totalCopies' } } }]),
    Category.countDocuments(), User.countDocuments({ role: 'student' }), Borrow.countDocuments(),
  ]);
  res.json({ books, copies: copies[0]?.n || 0, categories, students, borrows });
});

exports.settings = (req, res) => res.json({ loanDays: settings.loanDays, finePerDay: settings.finePerDay, maxActive: settings.maxActive });

/* ---------- Admin ---------- */
async function pickFields(b, existing) {
  const f = {};
  const str = (k, max) => { if (b[k] !== undefined) f[k] = String(clean(b[k])).slice(0, max); };
  str('title', 200); str('author', 120); str('publisher', 120); str('isbn', 30); str('description', 1000); str('shelf', 20);
  if (b.coverUrl !== undefined) {
    const u = String(clean(b.coverUrl) || '');
    if (u && !/^(https:\/\/|\/assets\/)/.test(u)) throw new AppError('Cover must be an https:// link or an /assets/ path.', 400);
    f.coverUrl = u;
  }
  if (b.year !== undefined && b.year !== '') f.year = Number(b.year);
  if (b.category !== undefined) {
    if (!mongoose.isValidObjectId(b.category) || !(await Category.exists({ _id: b.category }))) throw new AppError('Choose a valid category.', 400);
    f.category = b.category;
  }
  if (b.totalCopies !== undefined) {
    const t = Number(b.totalCopies);
    if (!Number.isInteger(t) || t < 1) throw new AppError('Total copies must be a whole number of 1 or more.', 400);
    const borrowed = existing ? existing.totalCopies - existing.availableCopies : 0;
    if (t < borrowed) throw new AppError(`${borrowed} copies are currently borrowed, so total cannot be lower than that.`, 400);
    f.totalCopies = t; f.availableCopies = t - borrowed;
  }
  return f;
}

exports.create = asyncHandler(async (req, res) => {
  const f = await pickFields(req.body || {});
  if (!f.title || !f.author || !f.category || !f.totalCopies || !f.shelf) throw new AppError('Title, author, category, copies and shelf are required.', 400);
  const cat = await Category.findById(f.category);
  f.bookId = `UL-${cat.code}-${Date.now().toString().slice(-7)}`;
  const book = await Book.create(f);
  res.status(201).json({ book: await book.populate(populateCat) });
});

exports.update = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw new AppError('Book not found.', 404);
  Object.assign(book, await pickFields(req.body || {}, book));
  await book.save();
  res.json({ book: await book.populate(populateCat) });
});

exports.remove = asyncHandler(async (req, res) => {
  if (await Borrow.exists({ book: req.params.id, status: 'borrowed' })) throw new AppError('This book has active loans. Record the returns before deleting it.', 409);
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) throw new AppError('Book not found.', 404);
  res.json({ message: 'Book deleted.' });
});

/* ---------- Categories ---------- */
exports.categories = asyncHandler(async (req, res) => {
  const [cats, counts] = await Promise.all([Category.find().sort({ name: 1 }), Book.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }])]);
  const m = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json({ categories: cats.map((c) => ({ ...c.toJSON(), bookCount: m[String(c._id)] || 0 })) });
});
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, code, description } = req.body || {};
  const cat = await Category.create({ name: clean(name), code: clean(code), description: clean(description) });
  res.status(201).json({ category: cat });
});
exports.deleteCategory = asyncHandler(async (req, res) => {
  if (await Book.exists({ category: req.params.id })) throw new AppError('Move or delete the books in this category first.', 409);
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Category deleted.' });
});

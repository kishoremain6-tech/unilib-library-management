const User = require('../models/User');
const Book = require('../models/Book');
const Borrow = require('../models/BorrowTransaction');
const Fine = require('../models/Fine');
const { startOfDay, decorate } = require('../services/fineService');
const { AppError, asyncHandler, escapeRegex } = require('../utils/helpers');

exports.summary = asyncHandler(async (req, res) => {
  const today = startOfDay(new Date());
  const [books, copies, students, active, overdueList, unpaid, byCat, week] = await Promise.all([
    Book.countDocuments(),
    Book.aggregate([{ $group: { _id: null, total: { $sum: '$totalCopies' }, available: { $sum: '$availableCopies' } } }]),
    User.countDocuments({ role: 'student' }),
    Borrow.countDocuments({ status: 'borrowed' }),
    Borrow.find({ status: 'borrowed', dueDate: { $lt: today } }),
    Fine.aggregate([{ $match: { status: 'Unpaid' } }, { $group: { _id: null, n: { $sum: '$amount' } } }]),
    Borrow.aggregate([{ $lookup: { from: 'books', localField: 'book', foreignField: '_id', as: 'b' } }, { $unwind: '$b' },
      { $lookup: { from: 'categories', localField: 'b.category', foreignField: '_id', as: 'c' } }, { $unwind: '$c' },
      { $group: { _id: '$c.name', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    Borrow.aggregate([{ $match: { borrowDate: { $gte: new Date(today.getTime() - 6 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$borrowDate' } }, n: { $sum: 1 } } }]),
  ]);
  const accrued = overdueList.reduce((s, b) => s + decorate(b).fineAmount, 0);
  const wk = Object.fromEntries(week.map((w) => [w._id, w.n]));
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today.getTime() - (6 - i) * 86400000); const k = d.toLocaleDateString('en-CA'); return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), n: wk[k] || 0 }; });
  const c = copies[0] || { total: 0, available: 0 };
  res.json({
    totalBooks: books, totalCopies: c.total, availableCopies: c.available, borrowedCopies: c.total - c.available,
    students, activeBorrows: active, overdue: overdueList.length, outstandingFines: (unpaid[0]?.n || 0) + accrued,
    borrowsByCategory: byCat.map((x) => ({ name: x._id, n: x.n })), last7Days: days,
  });
});

exports.students = asyncHandler(async (req, res) => {
  const filter = { role: 'student' };
  if (req.query.q) { const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 50)), 'i'); filter.$or = [{ name: rx }, { studentId: rx }, { email: rx }]; }
  const students = await User.find(filter).sort({ name: 1 }).limit(200);
  const counts = await Borrow.aggregate([{ $match: { status: 'borrowed', user: { $in: students.map((s) => s._id) } } }, { $group: { _id: '$user', n: { $sum: 1 } } }]);
  const m = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json({ students: students.map((s) => ({ ...s.toSafe(), activeLoans: m[String(s._id)] || 0 })) });
});

exports.studentBorrows = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!student) throw new AppError('Student not found.', 404);
  const list = await Borrow.find({ user: student._id }).populate('book', 'title bookId').sort({ borrowDate: -1 });
  res.json({ student: student.toSafe(), borrows: list.map((b) => decorate(b)) });
});

const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;        // block spreadsheet formula injection
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

exports.report = asyncHandler(async (req, res) => {
  const { from, to, category, department, status, format } = req.query;
  const filter = {};
  if (from || to) { filter.borrowDate = {}; if (from) filter.borrowDate.$gte = new Date(from); if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); filter.borrowDate.$lte = t; } }
  if (department) filter.department = String(department);
  if (status === 'returned') filter.status = 'returned';
  if (status === 'active' || status === 'overdue') filter.status = 'borrowed';
  if (status === 'overdue') filter.dueDate = { $lt: startOfDay(new Date()) };
  let rows = await Borrow.find(filter).populate({ path: 'book', select: 'title bookId category', populate: { path: 'category', select: 'name' } }).sort({ borrowDate: -1 }).limit(5000);
  if (category) rows = rows.filter((r) => r.book && String(r.book.category?._id) === String(category));
  const out = rows.map((r) => decorate(r)).map((r) => ({
    txnId: r.txnId, student: r.studentName, studentId: r.studentId, department: r.department,
    book: r.book?.title, bookId: r.book?.bookId, category: r.book?.category?.name,
    borrowDate: r.borrowDate, dueDate: r.dueDate, returnDate: r.returnDate,
    status: r.status === 'returned' ? 'Returned' : (r.isOverdue ? 'Overdue' : 'Borrowed'), overdueDays: r.overdueDays, fine: r.fineAmount, fineStatus: r.fineStatus,
  }));
  if (format === 'csv') {
    const head = ['Transaction', 'Student', 'Student ID', 'Department', 'Book', 'Book ID', 'Category', 'Borrow date', 'Due date', 'Return date', 'Status', 'Overdue days', 'Fine (INR)', 'Fine status'];
    const d = (x) => (x ? new Date(x).toISOString().slice(0, 10) : '');
    const lines = [head.join(',')].concat(out.map((o) => [o.txnId, o.student, o.studentId, o.department, o.book, o.bookId, o.category, d(o.borrowDate), d(o.dueDate), d(o.returnDate), o.status, o.overdueDays, o.fine, o.fineStatus].map(csvCell).join(',')));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="unilib-borrow-report.csv"');
    return res.send('\uFEFF' + lines.join('\r\n'));
  }
  res.json({ rows: out.slice(0, 500), total: out.length });
});

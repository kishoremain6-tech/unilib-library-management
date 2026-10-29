const Fine = require('../models/Fine');
const Borrow = require('../models/BorrowTransaction');
const { decorate, startOfDay } = require('../services/fineService');
const { AppError, asyncHandler, clean } = require('../utils/helpers');

const accruingFor = async (match) => {
  const list = await Borrow.find({ ...match, status: 'borrowed', dueDate: { $lt: startOfDay(new Date()) } }).populate('book', 'title bookId');
  return list.map((b) => decorate(b));
};

exports.mine = asyncHandler(async (req, res) => {
  const [fines, accruing] = await Promise.all([
    Fine.find({ user: req.user._id }).populate({ path: 'borrow', select: 'txnId dueDate returnDate', populate: { path: 'book', select: 'title bookId' } }).sort({ createdAt: -1 }),
    accruingFor({ user: req.user._id }),
  ]);
  const outstanding = fines.filter((f) => f.status === 'Unpaid').reduce((s, f) => s + f.amount, 0) + accruing.reduce((s, a) => s + a.fineAmount, 0);
  res.json({ fines, accruing, outstanding });
});

exports.all = asyncHandler(async (req, res) => {
  const filter = ['Unpaid', 'Paid', 'Waived'].includes(req.query.status) ? { status: req.query.status } : {};
  const [fines, accruing] = await Promise.all([
    Fine.find(filter).populate('user', 'name studentId').populate({ path: 'borrow', select: 'txnId', populate: { path: 'book', select: 'title' } }).sort({ createdAt: -1 }).limit(200),
    accruingFor({}),
  ]);
  res.json({ fines, accruing });
});

const resolve = (status) => asyncHandler(async (req, res) => {
  const update = { status, handledBy: req.user._id, resolvedAt: new Date() };
  if (status === 'Waived') {
    const reason = clean(req.body && req.body.reason);
    if (!reason || reason.length < 3) throw new AppError('Enter a reason for waiving this fine.', 400);
    update.waiverReason = String(reason).slice(0, 300);
  }
  const fine = await Fine.findOneAndUpdate({ _id: req.params.id, status: 'Unpaid' }, update, { new: true });
  if (!fine) throw new AppError('Only unpaid fines can be changed.', 409);
  res.json({ fine });
});
exports.pay = resolve('Paid');
exports.waive = resolve('Waived');

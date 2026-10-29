const settings = require('../config/settings');

const DAY = 86400000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Due date = borrow date + LOAN_DAYS calendar days. Returning on that day is still on time.
const dueDateFrom = (borrowDate) => startOfDay(addDays(borrowDate, settings.loanDays));

// Whole calendar days after the due date. 0 on or before the due date.
const overdueDays = (dueDate, until = new Date()) =>
  Math.max(0, Math.round((startOfDay(until) - startOfDay(dueDate)) / DAY));

const fineFor = (days) => days * settings.finePerDay;

// Adds live values to an active borrow and fine info to returned ones
function decorate(doc, fineMap = {}) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const f = fineMap[String(o._id)];
  if (o.status === 'borrowed') {
    const od = overdueDays(o.dueDate);
    o.overdueDays = od;
    o.fineAmount = fineFor(od);
    o.daysLeft = Math.round((startOfDay(o.dueDate) - startOfDay(new Date())) / DAY);
    o.isOverdue = od > 0;
    o.dueSoon = od === 0 && o.daysLeft <= 1;
    o.fineStatus = od > 0 ? 'Accruing' : 'None';
  } else {
    o.fineStatus = f ? f.status : (o.fineAmount > 0 ? 'Unpaid' : 'None');
    o.fineId = f ? f._id : undefined;
  }
  return o;
}

module.exports = { startOfDay, addDays, dueDateFrom, overdueDays, fineFor, decorate };

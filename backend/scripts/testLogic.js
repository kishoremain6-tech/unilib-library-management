// Offline check of the due-date and fine rules (no database needed). Run: npm run test:logic
process.env.LOAN_DAYS = '3'; process.env.FINE_PER_DAY = '10';
const assert = require('assert');
const { dueDateFrom, overdueDays, fineFor } = require('../services/fineService');

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h);
const borrow = at(2026, 10, 10, 15);
const due = dueDateFrom(borrow);

assert.strictEqual(due.getDate(), 13, 'due date is borrow date + 3 days');
assert.strictEqual(overdueDays(due, at(2026, 10, 12)), 0, 'before due date: no overdue');
assert.strictEqual(overdueDays(due, at(2026, 10, 13, 23)), 0, 'on the due date: no fine');
assert.strictEqual(overdueDays(due, at(2026, 10, 14, 1)), 1, 'day after due date: 1 day overdue');
assert.strictEqual(fineFor(overdueDays(due, at(2026, 10, 18))), 50, '5 days late = Rs 50');
assert.strictEqual(fineFor(overdueDays(due, at(2026, 10, 14))), 10, '1 day late = Rs 10');
console.log('All fine and due-date checks passed.');

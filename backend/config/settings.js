module.exports = {
  get loanDays() { return Number(process.env.LOAN_DAYS) || 3; },
  get finePerDay() { return Number(process.env.FINE_PER_DAY) || 10; },
  get maxActive() { return Number(process.env.MAX_ACTIVE_BORROWS) || 5; },
};

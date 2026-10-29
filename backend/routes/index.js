const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { protect, restrictTo } = require('../middleware/auth');
const auth = require('../controllers/authController');
const books = require('../controllers/bookController');
const borrow = require('../controllers/borrowController');
const fines = require('../controllers/fineController');
const admin = require('../controllers/adminController');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many login attempts. Try again in 15 minutes.' } });
const staff = [protect, restrictTo('librarian')];

// Auth
router.post('/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { message: 'Too many sign-ups from this device. Try later.' } }), auth.register);
router.post('/auth/login', loginLimiter, auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', auth.me);
router.put('/auth/interests', protect, auth.setInterests);

// Books + finder
router.get('/settings', books.settings);
router.get('/stats', books.publicStats);
router.get('/books', books.list);
router.get('/books/recent', books.recent);
router.get('/books/popular', books.popular);
router.get('/books/shelves', books.shelfMap);
router.get('/books/recommendations', protect, books.recommendations);
router.get('/books/:id', books.getOne);
router.post('/books', staff, books.create);
router.put('/books/:id', staff, books.update);
router.delete('/books/:id', staff, books.remove);

// Categories
router.get('/categories', books.categories);
router.post('/categories', staff, books.createCategory);
router.delete('/categories/:id', staff, books.deleteCategory);

// Borrowing
router.post('/borrow', protect, borrow.borrow);
router.get('/borrow/mine', protect, borrow.mine);
router.post('/borrow/:id/return', protect, borrow.returnBook);
router.get('/borrow', staff, borrow.all);

// Fines
router.get('/fines/mine', protect, fines.mine);
router.get('/fines', staff, fines.all);
router.patch('/fines/:id/pay', staff, fines.pay);
router.patch('/fines/:id/waive', staff, fines.waive);

// Admin
router.get('/admin/summary', staff, admin.summary);
router.get('/admin/students', staff, admin.students);
router.get('/admin/students/:id/borrows', staff, admin.studentBorrows);
router.get('/admin/reports/borrows', staff, admin.report);

module.exports = router;

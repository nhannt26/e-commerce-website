const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth');
const paymentController = require('../../controllers/admin/paymentController');
const dashboardController = require('../../controllers/admin/paymentDashboardController');

router.use(protect);
router.use(authorize('admin'));

router.get('/transactions', paymentController.getAllTransactions);
router.get('/stats', paymentController.getPaymentStats);
router.post('/refund/:transactionId', paymentController.processRefund);
router.get('/dashboard', dashboardController.getPaymentDashboard);
router.get('/revenue-report', dashboardController.getRevenueReport);

module.exports = router;
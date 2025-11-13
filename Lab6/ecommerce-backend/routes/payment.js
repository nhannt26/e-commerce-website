const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');
const { paymentRateLimit, ipnRateLimit } = require('../middleware/rateLimiter');
const { verifyPaymentOwnership } = require('../middleware/paymentVerification');
const { vnpayIPNWhitelist } = require('../middleware/ipWhitelist');

// Create payment (requires auth)
router.post('/create', protect, paymentRateLimit, verifyPaymentOwnership, paymentController.createPayment);

// VNPay callbacks (no auth required)
router.get('/vnpay-return', paymentController.vnpayReturn);
router.post('/vnpay-ipn', vnpayIPNWhitelist, ipnRateLimit, paymentController.vnpayIPN);

// Get transaction details (requires auth)
router.get('/transaction/:id', protect, paymentController.getTransaction);
router.get('/order/:orderId/transactions', protect, paymentController.getOrderTransactions);

router.post('/retry/:orderId', protect, paymentController.retryPayment);

module.exports = router;
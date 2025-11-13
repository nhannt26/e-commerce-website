const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

// All routes require authentication
router.use(protect);

// Customer order routes
router.post('/', orderController.createOrder);
router.get('/', orderController.getMyOrders);
router.get('/stats', orderController.getMyOrderStats);
router.get('/:id', orderController.getOrder);
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router;

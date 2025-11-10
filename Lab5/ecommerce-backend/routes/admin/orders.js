const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth');
const orderController = require('../../controllers/admin/orderController');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// Order management routes
router.get('/', orderController.getAllOrders);
router.get('/stats/overview', orderController.getOrderStats);
router.get('/:id', orderController.getOrder);
router.put('/:id/status', orderController.updateOrderStatus);
router.put('/:id/payment', orderController.markAsPaid);
router.put('/:id/tracking', orderController.addTracking);

module.exports = router;

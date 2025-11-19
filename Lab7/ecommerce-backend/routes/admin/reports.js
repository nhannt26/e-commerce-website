const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth');
const reportController = require('../../controllers/admin/reportController');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

router.get('/sales', reportController.getSalesReport);
router.get('/products', reportController.getProductReport);
router.get('/customers', reportController.getCustomerReport);
router.get('/revenue', reportController.getRevenueReport);

module.exports = router;
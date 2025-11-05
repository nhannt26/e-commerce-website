const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
// utils/stockAlerts.js
exports.checkLowStock = async () => {
    const Product = require('../models/Product');
    
    const lowStockProducts = await Product.find({
        stockStatus: 'low-stock'
    }).select('name stock lowStockThreshold');
    
    return lowStockProducts;
};

// Add endpoint to get low stock products
// GET /api/admin/products/low-stock (admin only)
router.get('/low-stock', protect, authorize('admin'), async (req, res) => {
    const products = await Product.find({
        stockStatus: { $in: ['low-stock', 'out-of-stock'] }
    }).select('name stock reserved stockStatus');
    
    res.json({
        success: true,
        count: products.length,
        data: products
    });
});

module.exports = router;
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
// routes/products.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Product = require('../models/Product');

// Helper: handle invalid ObjectId errors
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ========== GET /api/products - Get all products ==========
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().populate('category');
        res.json(products);
    } catch (err) {
        console.error('❌ Error fetching products:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== GET /api/products/:id - Get product by ID ==========
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const product = await Product.findById(id).populate('category');
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (err) {
        console.error('❌ Error fetching product by ID:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== GET /api/products/slug/:slug - Get product by slug ==========
router.get('/slug/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const product = await Product.findOne({ slug }).populate('category');

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (err) {
        console.error('❌ Error fetching product by slug:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== GET /api/products/on-sale - Get products on sale ==========
router.get('/on-sale', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const onSaleProducts = await Product.getOnSaleProducts()
            .skip(skip)
            .limit(limit)
            .populate('category');

        // Sort by discount percentage (higher first)
        onSaleProducts.sort((a, b) => b.discountPercentage - a.discountPercentage);

        res.json({
            page,
            total: onSaleProducts.length,
            products: onSaleProducts
        });
    } catch (err) {
        console.error('❌ Error fetching on-sale products:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== GET /api/products/low-stock - Get low stock products ==========
router.get('/low-stock', async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 10;
        const products = await Product.find({ stock: { $lt: threshold } }).populate('category');
        res.json(products);
    } catch (err) {
        console.error('❌ Error fetching low stock products:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== POST /api/products - Create new product ==========
router.post('/', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        await product.populate('category');
        res.status(201).json(product);
    } catch (err) {
        console.error('❌ Error creating product:', err);
        res.status(400).json({ error: err.message });
    }
});

// ========== PATCH /api/products/:id - Update product ==========
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true }).populate('category');
        if (!updatedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(updatedProduct);
    } catch (err) {
        console.error('❌ Error updating product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== DELETE /api/products/:id - Delete product ==========
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const deleted = await Product.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('❌ Error deleting product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== PATCH /api/products/:id/stock - Update stock ==========
router.patch('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, operation } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        if (typeof quantity !== 'number' || quantity < 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        switch (operation) {
            case 'add':
                product.stock += quantity;
                break;
            case 'subtract':
                if (product.stock - quantity < 0) {
                    return res.status(400).json({ error: 'Stock cannot go negative' });
                }
                product.stock -= quantity;
                break;
            case 'set':
                product.stock = quantity;
                break;
            default:
                return res.status(400).json({ error: 'Invalid operation' });
        }

        await product.save();
        await product.populate('category');
        res.json(product);
    } catch (err) {
        console.error('❌ Error updating stock:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== PATCH /api/products/:id/views - Increment views ==========
router.patch('/:id/views', async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        await product.incrementViews();
        await product.populate('category');

        res.json(product);
    } catch (err) {
        console.error('❌ Error incrementing views:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

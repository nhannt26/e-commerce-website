const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Product = require('../models/Product');

router.use(protect);

// GET /api/wishlist
router.get('/', protect, authorize('customer'), async (req, res, next) => {
    try {
        // Populate wishlist with detailed product info
        await req.user.populate({
            path: 'wishlist',
            select: 'name price images rating stock category',
            populate: {
                path: 'category',
                select: 'name slug'
            }
        });

        // Transform response to match your required format
        const wishlistData = req.user.wishlist.map(product => ({
            _id: product._id,
            name: product.name,
            price: product.price,
            images: product.images,
            category: product.category ? { name: product.category.name } : null,
            inStock: product.stock > 0
        }));

        res.status(200).json({
            success: true,
            count: wishlistData.length,
            data: wishlistData
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/wishlist/:productId
router.post('/:productId', protect, authorize('customer'), async (req, res, next) => {
    try {
        const { productId } = req.params;

        // 1️⃣ Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // 2️⃣ Check if product already in wishlist
        if (req.user.wishlist.includes(productId)) {
            return res.status(400).json({
                success: false,
                message: 'Product already in wishlist'
            });
        }

        // 3️⃣ Add to wishlist
        req.user.wishlist.push(productId);

        // 4️⃣ Save user
        await req.user.save();

        res.status(200).json({
            success: true,
            message: 'Product added to wishlist'
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', protect, authorize('customer'), async (req, res, next) => {
    try {
        const { productId } = req.params;

        // 1️⃣ Check if product is in wishlist
        const index = req.user.wishlist.indexOf(productId);
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in wishlist'
            });
        }

        // 2️⃣ Remove it
        req.user.wishlist.splice(index, 1);

        // 3️⃣ Save user
        await req.user.save();

        res.status(200).json({
            success: true,
            message: 'Product removed from wishlist'
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/wishlist (clear all)
router.delete('/', protect, authorize('customer'), async (req, res, next) => {
    try {
        req.user.wishlist = [];
        await req.user.save();
        
        res.json({
            success: true,
            message: 'Wishlist cleared'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const {
    getCart,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    mergeCart,
    getCartSummary,
    validateCart,
    checkProduct,
    recoverCart,
    saveForLater,
    moveToCart
} = require('../controllers/cartController');

// All cart routes use optionalAuth
// This means user can be logged in or guest

// GET /api/cart - Get cart
router.get('/', optionalAuth, getCart);

// POST /api/cart/items - Add item to cart
router.post('/items', optionalAuth, addItem);

// PUT /api/cart/items/:itemId - Update item quantity
router.put('/items/:itemId', optionalAuth, updateItemQuantity);

// DELETE /api/cart/items/:itemId - Remove item from cart
router.delete('/items/:itemId', optionalAuth, removeItem);

// DELETE /api/cart - Clear cart
router.delete('/', optionalAuth, clearCart);

// POST /api/cart/merge - Merge guest cart with user cart (on login)
router.post('/merge', optionalAuth, mergeCart);

// GET/api/cart/summary - Get cart summary
router.get('/summary', optionalAuth, getCartSummary);

// POST/api/cart/validate - Validate cart
router.post('/validate', optionalAuth, validateCart);

// GET/api/cart/check/:productId - Check if product in cart
router.get('/check/:productId', optionalAuth, checkProduct);

// POST /api/cart/recover - Recover abandoned cart
router.post('/recover', optionalAuth, recoverCart);

// POST /api/cart/save-for-later/:itemId
router.post('/save-for-later/:itemId', optionalAuth, saveForLater);

// POST /api/cart/move-to-cart/:productId - Move from wishlist to cart
router.post('/move-to-cart/:productId', optionalAuth, moveToCart);

module.exports = router;

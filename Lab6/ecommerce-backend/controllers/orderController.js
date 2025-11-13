const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const mongoose = require("mongoose");

// ========== CREATE ORDER ==========
exports.createOrder = async (req, res, next) => {
    try {
        const { shippingAddress, paymentMethod, customerNote } = req.body;
        
        // Validate shipping address
        if (!shippingAddress || !shippingAddress.fullName || 
            !shippingAddress.phone || !shippingAddress.street || 
            !shippingAddress.city || !shippingAddress.postalCode) {
            return res.status(400).json({
                success: false,
                message: 'Complete shipping address is required'
            });
        }
        
        // Get user's cart
        const Cart = mongoose.model('Cart');
        const cart = await Cart.getCartForUser(req.user._id);
        
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }
        
        // Validate cart before creating order
        const validation = await cart.validateCart();
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Cart validation failed',
                errors: validation.errors
            });
        }
        
        // Create order from cart
        const order = await Order.createFromCart(
            cart,
            req.user._id,
            shippingAddress,
            paymentMethod || 'cod',
            customerNote
        );
        
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });
    } catch (error) {
        next(error);
    }
};

// ========== GET USER ORDERS ==========
exports.getMyOrders = async (req, res, next) => {
    try {
        const { status, paymentStatus, page = 1, limit = 10 } = req.query;
        
        const filter = { user: req.user._id };
        if (status) filter.orderStatus = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        
        const skip = (page - 1) * limit;
        
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .populate('items.product', 'name images')
            .select('-statusHistory -adminNote');
        
        const total = await Order.countDocuments(filter);
        
        res.json({
            success: true,
            count: orders.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

// ========== GET SINGLE ORDER ==========
exports.getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product', 'name images category')
            .populate('user', 'firstName lastName email');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check authorization
        if (order.user._id.toString() !== req.user._id.toString() && 
            req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }
        
        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        next(error);
    }
};

// ========== CANCEL ORDER ==========
exports.cancelOrder = async (req, res, next) => {
    try {
        const { reason } = req.body;
        
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check authorization
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this order'
            });
        }
        
        // Check if can be cancelled
        if (!order.canBeCancelled) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel order with status: ${order.orderStatus}`
            });
        }
        
        await order.cancel(reason || 'Customer cancelled', req.user._id);
        
        res.json({
            success: true,
            message: 'Order cancelled successfully',
            data: order
        });
    } catch (error) {
        next(error);
    }
};

// ========== GET ORDER STATS ==========
exports.getMyOrderStats = async (req, res, next) => {
    try {
        const stats = await Order.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(req.user._id) } },
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$pricing.total' }
                }
            }
        ]);
        
        const totalOrders = await Order.countDocuments({ user: req.user._id });
        const totalSpent = await Order.aggregate([
            { $match: { 
                user: new mongoose.Types.ObjectId(req.user._id),
                paymentStatus: 'paid'
            }},
            { $group: { _id: null, total: { $sum: '$pricing.total' } } }
        ]);
        
        res.json({
            success: true,
            data: {
                totalOrders,
                totalSpent: totalSpent[0]?.total || 0,
                byStatus: stats
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;

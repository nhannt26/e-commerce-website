const mongoose = require('mongoose');
const Order = mongoose.model('Order');

// GET /api/admin/orders - Get all orders
exports.getAllOrders = async (req, res, next) => {
    try {
        const { 
            status, 
            paymentStatus, 
            search, 
            startDate, 
            endDate,
            page = 1, 
            limit = 20 
        } = req.query;
        
        const filter = {};
        
        if (status) filter.orderStatus = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }
        
        if (search) {
            filter.$or = [
                { orderNumber: new RegExp(search, 'i') },
                { 'shippingAddress.fullName': new RegExp(search, 'i') },
                { 'shippingAddress.phone': new RegExp(search, 'i') }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .populate('user', 'firstName lastName email')
            .populate('items.product', 'name');
        
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

// GET /api/admin/orders/:id - Get single order (admin view)
exports.getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'firstName lastName email phone')
            .populate('items.product', 'name images category price stock')
            .populate('statusHistory.updatedBy', 'firstName lastName')
            .populate('cancelledBy', 'firstName lastName');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
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

// PUT /api/admin/orders/:id/status - Update order status
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { status, note } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }
        
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        await order.updateStatus(status, note, req.user._id);
        
        res.json({
            success: true,
            message: 'Order status updated',
            data: order
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/orders/:id/payment - Mark order as paid
exports.markAsPaid = async (req, res, next) => {
    try {
        const { transactionId } = req.body;
        
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        if (order.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Order is already paid'
            });
        }
        
        await order.markAsPaid(transactionId);
        
        res.json({
            success: true,
            message: 'Order marked as paid',
            data: order
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/orders/:id/tracking - Add tracking information
exports.addTracking = async (req, res, next) => {
    try {
        const { trackingNumber, carrier, estimatedDelivery } = req.body;
        
        if (!trackingNumber || !carrier) {
            return res.status(400).json({
                success: false,
                message: 'Tracking number and carrier are required'
            });
        }
        
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        await order.addTracking(
            trackingNumber, 
            carrier, 
            estimatedDelivery ? new Date(estimatedDelivery) : null
        );
        
        res.json({
            success: true,
            message: 'Tracking information added',
            data: order
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/orders/stats/overview - Order statistics
exports.getOrderStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        
        const matchStage = Object.keys(dateFilter).length > 0 
            ? { createdAt: dateFilter }
            : {};
        
        const statusStats = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$pricing.total' }
                }
            }
        ]);
        
        const paymentStats = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$paymentStatus',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$pricing.total' }
                }
            }
        ]);
        
        const totalOrders = await Order.countDocuments(matchStage);
        const averageOrderValue = await Order.aggregate([
            { $match: matchStage },
            { $group: { _id: null, avg: { $avg: '$pricing.total' } } }
        ]);
        
        res.json({
            success: true,
            data: {
                totalOrders,
                averageOrderValue: averageOrderValue[0]?.avg?.toFixed(2) || 0,
                byStatus: statusStats,
                byPayment: paymentStats
            }
        });
    } catch (error) {
        next(error);
    }
};

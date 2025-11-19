const mongoose = require('mongoose');
const Order = mongoose.model('Order');

exports.verifyPaymentOwnership = async (req, res, next) => {
    try {
        const { orderId } = req.body;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }
        
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check ownership
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to pay for this order'
            });
        }
        
        // Check order status
        if (order.orderStatus === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot pay for cancelled order'
            });
        }
        
        // Attach order to request
        req.order = order;
        next();
    } catch (error) {
        next(error);
    }
};
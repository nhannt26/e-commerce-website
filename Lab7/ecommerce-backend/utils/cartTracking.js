// utils/cartTracking.js
const CartEvent = require('../models/CartEvent');

exports.trackCartEvent = async (cart, eventType, metadata = {}) => {
    try {
        await CartEvent.create({
            cart: cart._id,
            user: cart.user || null,
            eventType: eventType,
            product: metadata.product || null,
            metadata: metadata
        });
    } catch (error) {
        console.error('Cart tracking error:', error);
        // Don't throw - tracking shouldn't break cart operations
    }
};
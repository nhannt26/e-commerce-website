// models/CartEvent.js
const mongoose = require('mongoose');

const cartEventSchema = new mongoose.Schema({
    cart: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    eventType: {
        type: String,
        enum: ['created', 'item_added', 'item_removed', 'quantity_updated', 
               'cleared', 'checked_out', 'abandoned'],
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    metadata: {
        quantity: Number,
        price: Number,
        previousQuantity: Number
    }
}, {
    timestamps: true
});

cartEventSchema.index({ cart: 1, createdAt: -1 });
cartEventSchema.index({ eventType: 1, createdAt: -1 });
cartEventSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CartEvent', cartEventSchema);

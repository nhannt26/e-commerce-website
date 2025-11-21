// scripts/cleanupCarts.js
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
require('dotenv').config();

async function cleanupExpiredCarts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const now = new Date();
        
        // Delete expired guest carts (MongoDB TTL handles this automatically)
        // But we can manually cleanup very old user carts
        const result = await Cart.deleteMany({
            user: null,  // Guest carts
            updatedAt: { $lt: new Date(now - 30 * 24 * 60 * 60 * 1000) } // 30 days old
        });
        
        console.log(`Cleaned up ${result.deletedCount} expired carts`);
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Cleanup error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    cleanupExpiredCarts();
}

module.exports = cleanupExpiredCarts;

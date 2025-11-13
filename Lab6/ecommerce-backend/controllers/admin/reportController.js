const mongoose = require('mongoose');
const Order = mongoose.model('Order');
const Product = mongoose.model('Product');

// GET /api/admin/reports/sales - Sales report
exports.getSalesReport = async (req, res, next) => {
    try {
        const { startDate, endDate, groupBy = 'day' } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        
        const dateFilter = {
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            paymentStatus: 'paid'
        };
        
        // Group by day, week, or month
        let groupFormat;
        switch (groupBy) {
            case 'month':
                groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                break;
            case 'week':
                groupFormat = { $week: '$createdAt' };
                break;
            default: // day
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        }
        
        const salesByPeriod = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: groupFormat,
                    orderCount: { $sum: 1 },
                    totalRevenue: { $sum: '$pricing.total' },
                    averageOrderValue: { $avg: '$pricing.total' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        const totalRevenue = await Order.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, total: { $sum: '$pricing.total' } } }
        ]);
        
        const totalOrders = await Order.countDocuments(dateFilter);
        
        res.json({
            success: true,
            data: {
                period: { startDate, endDate, groupBy },
                summary: {
                    totalOrders,
                    totalRevenue: totalRevenue[0]?.total || 0,
                    averageOrderValue: totalOrders > 0 
                        ? (totalRevenue[0]?.total / totalOrders).toFixed(2)
                        : 0
                },
                salesByPeriod
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/reports/products - Top selling products
exports.getProductReport = async (req, res, next) => {
    try {
        const { startDate, endDate, limit = 10 } = req.query;
        
        const dateFilter = startDate && endDate ? {
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            paymentStatus: 'paid'
        } : { paymentStatus: 'paid' };
        
        const topProducts = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    name: { $first: '$items.name' },
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.subtotal' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: parseInt(limit) }
        ]);
        
        // Get product details
        const productIds = topProducts.map(p => p._id);
        const products = await Product.find({ _id: { $in: productIds } })
            .select('name images category price stock');
        
        const productsMap = {};
        products.forEach(p => {
            productsMap[p._id.toString()] = p;
        });
        
        const enrichedProducts = topProducts.map(p => ({
            ...p,
            productDetails: productsMap[p._id.toString()]
        }));
        
        res.json({
            success: true,
            count: enrichedProducts.length,
            data: enrichedProducts
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/reports/customers - Top customers
exports.getCustomerReport = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;
        
        const topCustomers = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            {
                $group: {
                    _id: '$user',
                    orderCount: { $sum: 1 },
                    totalSpent: { $sum: '$pricing.total' },
                    averageOrderValue: { $avg: '$pricing.total' }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: parseInt(limit) }
        ]);
        
        // Populate user details
        const User = mongoose.model('User');
        const userIds = topCustomers.map(c => c._id);
        const users = await User.find({ _id: { $in: userIds } })
            .select('firstName lastName email');
        
        const usersMap = {};
        users.forEach(u => {
            usersMap[u._id.toString()] = u;
        });
        
        const enrichedCustomers = topCustomers.map(c => ({
            user: usersMap[c._id.toString()],
            orderCount: c.orderCount,
            totalSpent: c.totalSpent.toFixed(2),
            averageOrderValue: c.averageOrderValue.toFixed(2)
        }));
        
        res.json({
            success: true,
            count: enrichedCustomers.length,
            data: enrichedCustomers
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/reports/revenue - Revenue breakdown
exports.getRevenueReport = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        const dateFilter = startDate && endDate ? {
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            paymentStatus: 'paid'
        } : { paymentStatus: 'paid' };
        
        const revenueByPaymentMethod = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$paymentMethod',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$pricing.total' }
                }
            }
        ]);
        
        const revenueByStatus = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$pricing.total' }
                }
            }
        ]);
        
        res.json({
            success: true,
            data: {
                byPaymentMethod: revenueByPaymentMethod,
                byStatus: revenueByStatus
            }
        });
    } catch (error) {
        next(error);
    }
};

const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');
const Order = mongoose.model('Order');

// GET /api/admin/payment/dashboard - Payment dashboard
exports.getPaymentDashboard = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        
        const matchStage = Object.keys(dateFilter).length > 0 
            ? { createdAt: dateFilter }
            : {};
        
        // Total transactions
        const totalTransactions = await Transaction.countDocuments(matchStage);
        
        // Success rate
        const successCount = await Transaction.countDocuments({
            ...matchStage,
            status: 'success'
        });
        const successRate = totalTransactions > 0 
            ? ((successCount / totalTransactions) * 100).toFixed(2)
            : 0;
        
        // Total revenue
        const revenueData = await Transaction.aggregate([
            { $match: { ...matchStage, status: 'success' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                    avgTransaction: { $avg: '$amount' }
                }
            }
        ]);
        
        // Revenue by day
        const revenueByDay = await Transaction.aggregate([
            { $match: { ...matchStage, status: 'success' } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // Payment methods distribution
        const paymentMethods = await Transaction.aggregate([
            { $match: { ...matchStage, status: 'success' } },
            {
                $group: {
                    _id: '$vnpayData.vnp_BankCode',
                    count: { $sum: 1 },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        // Failed transactions analysis
        const failedTransactions = await Transaction.aggregate([
            { $match: { ...matchStage, status: 'failed' } },
            {
                $group: {
                    _id: '$errorCode',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        res.json({
            success: true,
            data: {
                summary: {
                    totalTransactions,
                    successCount,
                    failedCount: totalTransactions - successCount,
                    successRate: `${successRate}%`,
                    totalRevenue: revenueData[0]?.totalRevenue || 0,
                    avgTransaction: revenueData[0]?.avgTransaction?.toFixed(2) || 0
                },
                revenueByDay,
                paymentMethods,
                failedTransactions
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/payment/revenue-report - Detailed revenue report
exports.getRevenueReport = async (req, res, next) => {
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
            status: 'success'
        };
        
        let groupFormat;
        switch (groupBy) {
            case 'month':
                groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                break;
            case 'week':
                groupFormat = { $week: '$createdAt' };
                break;
            default:
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        }
        
        const revenueByPeriod = await Transaction.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: groupFormat,
                    transactionCount: { $sum: 1 },
                    totalRevenue: { $sum: '$amount' },
                    avgTransaction: { $avg: '$amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        const totalRevenue = await Transaction.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        res.json({
            success: true,
            data: {
                period: { startDate, endDate, groupBy },
                totalRevenue: totalRevenue[0]?.total || 0,
                revenueByPeriod
            }
        });
    } catch (error) {
        next(error);
    }
};
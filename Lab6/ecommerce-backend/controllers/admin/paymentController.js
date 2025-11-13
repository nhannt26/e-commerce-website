const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');
const Order = mongoose.model('Order');
const EmailService = require('../../utils/emailService');

// POST /api/admin/payment/refund/:transactionId
exports.processRefund = async (req, res, next) => {
    try {
        const { amount, reason } = req.body;
        
        const transaction = await Transaction.findById(req.params.transactionId)
            .populate({
                path: 'order',
                populate: { path: 'user', select: 'firstName lastName email' }
            });
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }
        
        if (transaction.status !== 'success') {
            return res.status(400).json({
                success: false,
                message: 'Can only refund successful transactions'
            });
        }
        
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid refund amount is required'
            });
        }
        
        if (amount > transaction.amount) {
            return res.status(400).json({
                success: false,
                message: 'Refund amount exceeds transaction amount'
            });
        }
        
        // Process refund
        await transaction.processRefund(amount, reason);
        
        // Send refund confirmation email
        const order = transaction.order;
        await EmailService.sendRefundConfirmation(order, order.user, transaction);
        
        res.json({
            success: true,
            message: 'Refund processed successfully',
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/payment/transactions - Get all transactions
exports.getAllTransactions = async (req, res, next) => {
    try {
        const { status, gateway, startDate, endDate, page = 1, limit = 20 } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (gateway) filter.paymentGateway = gateway;
        
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }
        
        const skip = (page - 1) * limit;
        
        const transactions = await Transaction.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .populate({
                path: 'order',
                select: 'orderNumber user',
                populate: { path: 'user', select: 'firstName lastName email' }
            });
        
        const total = await Transaction.countDocuments(filter);
        
        res.json({
            success: true,
            count: transactions.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: transactions
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/payment/stats - Payment statistics
exports.getPaymentStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        
        const matchStage = Object.keys(dateFilter).length > 0 
            ? { createdAt: dateFilter }
            : {};
        
        const stats = await Transaction.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);
        
        const gatewayStats = await Transaction.aggregate([
            { $match: { ...matchStage, status: 'success' } },
            {
                $group: {
                    _id: '$paymentGateway',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);
        
        res.json({
            success: true,
            data: {
                byStatus: stats,
                byGateway: gatewayStats
            }
        });
    } catch (error) {
        next(error);
    }
};
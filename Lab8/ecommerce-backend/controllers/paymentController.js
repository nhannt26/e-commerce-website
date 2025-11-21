const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const vnpayService = require("../utils/vnpay");
const EmailService = require("../utils/emailService");

// POST /api/payment/create - Create payment request
exports.createPayment = async (req, res, next) => {
  try {
    const { orderId, bankCode } = req.body;

    // Get order
    const order = await Order.findById(orderId).populate("user");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check authorization
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if already paid
    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Order already paid",
      });
    }

    // Create transaction record
    const transaction = await Transaction.createForOrder(orderId, order.pricing.total, "vnpay");

    // Get client IP
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress || "127.0.0.1";

    // Create payment URL
    const { paymentUrl, txnRef } = vnpayService.createPaymentUrl({
      orderId: order.orderNumber,
      amount: order.pricing.total,
      orderInfo: `Payment for order ${order.orderNumber}`,
      ipAddress,
      locale: "vn",
      bankCode,
    });

    // Save transaction reference
    transaction.vnpayData = {
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Payment for order ${order.orderNumber}`,
    };
    transaction.ipAddress = ipAddress;
    transaction.userAgent = req.headers["user-agent"];
    await transaction.save();

    res.json({
      success: true,
      message: "Payment URL created",
      data: {
        paymentUrl,
        transactionId: transaction.transactionId,
        amount: order.pricing.total,
        orderNumber: order.orderNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payment/vnpay-return - Handle return from VNPay
exports.vnpayReturn = async (req, res, next) => {
  try {
    const vnpParams = req.query;

    // Verify secure hash
    const isValid = vnpayService.verifyReturnUrl(vnpParams);

    if (!isValid) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=invalid_hash`);
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo, vnp_BankCode, vnp_CardType, vnp_PayDate } = vnpParams;

    // Find transaction
    const transaction = await Transaction.findOne({
      "vnpayData.vnp_TxnRef": vnp_TxnRef,
    }).populate({
      path: "order",
      populate: { path: "user", select: "firstName lastName email" },
    });

    if (!transaction) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=transaction_not_found`);
    }

    // Check if transaction successful
    if (vnpayService.isSuccessTransaction(vnp_ResponseCode)) {
      // Update transaction
      await transaction.markAsSuccess({
        vnp_TxnRef,
        vnp_TransactionNo,
        vnp_BankCode,
        vnp_CardType,
        vnp_PayDate,
        vnp_ResponseCode,
        vnp_TransactionStatus: "00",
      });

      // Update order status
      const order = transaction.order;
      await order.updateStatus("processing", "Payment received", null);

      // Send confirmation email
      await EmailService.sendPaymentConfirmation(order, order.user, transaction);

      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${order._id}`);
    } else {
      // Payment failed
      const errorMessage = vnpayService.getResponseMessage(vnp_ResponseCode);

      await transaction.markAsFailed(vnp_ResponseCode, errorMessage);

      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=${vnp_ResponseCode}`);
    }
  } catch (error) {
    console.error("VNPay return error:", error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=system_error`);
  }
};

// POST /api/payment/vnpay-ipn - Handle IPN from VNPay
exports.vnpayIPN = async (req, res, next) => {
  try {
    const vnpParams = req.query;

    // Verify secure hash
    const isValid = vnpayService.verifyReturnUrl(vnpParams);

    if (!isValid) {
      return res.json({
        RspCode: "97",
        Message: "Invalid signature",
      });
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo, vnp_BankCode, vnp_Amount } = vnpParams;

    // Find transaction
    const transaction = await Transaction.findOne({
      "vnpayData.vnp_TxnRef": vnp_TxnRef,
    }).populate("order");

    if (!transaction) {
      return res.json({
        RspCode: "01",
        Message: "Transaction not found",
      });
    }

    // Check if already processed
    if (transaction.status !== "pending") {
      return res.json({
        RspCode: "02",
        Message: "Transaction already processed",
      });
    }

    // Verify amount
    const expectedAmount = transaction.amount * 100;
    if (parseInt(vnp_Amount) !== expectedAmount) {
      return res.json({
        RspCode: "04",
        Message: "Invalid amount",
      });
    }

    // Process transaction
    if (vnpayService.isSuccessTransaction(vnp_ResponseCode)) {
      await transaction.markAsSuccess({
        vnp_TxnRef,
        vnp_TransactionNo,
        vnp_BankCode,
        vnp_ResponseCode,
      });

      // Update order
      const order = transaction.order;
      await order.updateStatus("processing", "Payment confirmed via IPN", null);

      return res.json({
        RspCode: "00",
        Message: "Success",
      });
    } else {
      await transaction.markAsFailed(vnp_ResponseCode, "Payment failed");

      return res.json({
        RspCode: "00",
        Message: "Transaction recorded as failed",
      });
    }
  } catch (error) {
    console.error("VNPay IPN error:", error);
    return res.json({
      RspCode: "99",
      Message: "System error",
    });
  }
};

// GET /api/payment/transaction/:id - Get transaction details
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate({
      path: "order",
      select: "orderNumber pricing user",
      populate: { path: "user", select: "firstName lastName email" },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Check authorization
    if (transaction.order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payment/order/:orderId/transactions - Get order transactions
exports.getOrderTransactions = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check authorization
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const transactions = await Transaction.find({ order: req.params.orderId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payment/retry/:orderId - Retry failed payment
exports.retryPayment = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check authorization
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if order can be paid
    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Order already paid",
      });
    }

    if (order.orderStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Can only retry payment for pending orders",
      });
    }

    // Mark previous transactions as cancelled
    await Transaction.updateMany({ order: order._id, status: "pending" }, { status: "cancelled" });

    // Create new payment request
    const { bankCode } = req.body;

    // Reuse createPayment logic or redirect to it
    req.body.orderId = order._id;
    return exports.createPayment(req, res, next);
  } catch (error) {
    next(error);
  }
};

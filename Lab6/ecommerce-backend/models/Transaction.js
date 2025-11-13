const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentGateway: {
      type: String,
      enum: ["vnpay", "momo", "zalopay", "bank_transfer", "cod"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "VND",
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String, // Bank code or payment method
    },

    // VNPay specific fields
    vnpayData: {
      vnp_TxnRef: String,
      vnp_TransactionNo: String,
      vnp_BankCode: String,
      vnp_CardType: String,
      vnp_OrderInfo: String,
      vnp_PayDate: String,
      vnp_ResponseCode: String,
      vnp_TransactionStatus: String,
      vnp_SecureHash: String,
    },

    // IP and device info
    ipAddress: String,
    userAgent: String,

    // Timestamps
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,

    // Error handling
    errorCode: String,
    errorMessage: String,

    // Refund info
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundReason: String,
    refundedAt: Date,

    attemptCount: {
      type: Number,
      default: 0,
    },
    attempts: [
      {
        timestamp: Date,
        ipAddress: String,
        userAgent: String,
        status: String,
        responseCode: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
transactionSchema.index({ order: 1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

// Static method: Create transaction for order
transactionSchema.statics.createForOrder = async function (
  orderId,
  amount,
  gateway = "vnpay"
) {
  const Order = mongoose.model("Order");
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.paymentStatus === "paid") {
    throw new Error("Order already paid");
  }

  // Generate unique transaction ID
  const transactionId = `TXN${Date.now()}${Math.random()
    .toString(36)
    .substr(2, 9)
    .toUpperCase()}`;

  const transaction = await this.create({
    order: orderId,
    transactionId,
    paymentGateway: gateway,
    amount,
    currency: "VND",
    status: "pending",
  });

  return transaction;
};

// Instance method: Mark as success
transactionSchema.methods.markAsSuccess = async function (vnpayData) {
  this.status = "success";
  this.completedAt = new Date();
  this.vnpayData = vnpayData;
  await this.save();

  // Update order
  const Order = mongoose.model("Order");
  await Order.findByIdAndUpdate(this.order, {
    paymentStatus: "paid",
    paymentDate: new Date(),
    transactionId: this.transactionId,
  });

  return this;
};

// Instance method: Mark as failed
transactionSchema.methods.markAsFailed = async function (
  errorCode,
  errorMessage
) {
  this.status = "failed";
  this.completedAt = new Date();
  this.errorCode = errorCode;
  this.errorMessage = errorMessage;
  await this.save();

  return this;
};

// Instance method: Process refund
transactionSchema.methods.processRefund = async function (amount, reason) {
  if (this.status !== "success") {
    throw new Error("Can only refund successful transactions");
  }

  if (amount > this.amount) {
    throw new Error("Refund amount exceeds transaction amount");
  }

  this.status = "refunded";
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  await this.save();

  // Update order
  const Order = mongoose.model("Order");
  await Order.findByIdAndUpdate(this.order, {
    paymentStatus: "refunded",
  });

  return this;
};

// Add method to log attempt
transactionSchema.methods.logAttempt = function(ipAddress, userAgent, status, responseCode) {
    this.attemptCount += 1;
    this.attempts.push({
        timestamp: new Date(),
        ipAddress,
        userAgent,
        status,
        responseCode
    });
    return this.save();
};

module.exports = mongoose.model("Transaction", transactionSchema);

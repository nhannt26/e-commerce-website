const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: String,
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],

    // Pricing
    pricing: {
      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },
      tax: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      shipping: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
        min: 0,
      },
      total: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    // Shipping Information
    shippingAddress: {
      fullName: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: String,
      postalCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
        default: "Vietnam",
      },
    },

    // Payment Information
    paymentMethod: {
      type: String,
      enum: ["cod", "credit_card", "debit_card", "bank_transfer", "e_wallet"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "failed"],
      default: "unpaid",
    },
    paymentDate: Date,
    transactionId: String,

    // Order Status
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "returned"],
      default: "pending",
    },

    // Shipping Tracking
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date,
    deliveredAt: Date,

    // Notes and History
    customerNote: String,
    adminNote: String,
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        note: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Cancellation
    cancelReason: String,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// ========== VIRTUAL FIELDS ==========

// Can be cancelled?
orderSchema.virtual("canBeCancelled").get(function () {
  return ["pending", "processing"].includes(this.orderStatus);
});

// Is delivered?
orderSchema.virtual("isDelivered").get(function () {
  return this.orderStatus === "delivered" && this.deliveredAt != null;
});

// Is paid?
orderSchema.virtual("isPaid").get(function () {
  return this.paymentStatus === "paid" && this.paymentDate != null;
});

// ========== INSTANCE METHODS ==========

// Generate unique order number
orderSchema.statics.generateOrderNumber = async function () {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  // Find today's order count
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const count = await this.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const sequence = (count + 1).toString().padStart(4, "0");

  return `ORD${year}${month}${day}${sequence}`;
};

// Create order from cart
orderSchema.statics.createFromCart = async function (cart, userId, shippingAddress, paymentMethod) {
  const User = mongoose.model("User");
  const Product = mongoose.model("Product");
  const EmailService = require("../utils/emailService");

  const user = await User.findById(userId);

  // Validate cart has items
  if (!cart.items || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  // Validate all items still available and in stock
  const validation = await cart.validateCart();
  if (!validation.isValid) {
    throw new Error(`Cart validation failed: ${validation.errors.join(", ")}`);
  }

  // Populate cart items
  await cart.populate("items.product");

  // Generate order number
  const orderNumber = await this.generateOrderNumber();

  // Prepare order items with snapshot of product data
  const orderItems = cart.items.map((item) => ({
    product: item.product._id,
    name: item.product.name,
    quantity: item.quantity,
    price: item.price,
    image: item.product.images?.[0] || null,
    subtotal: item.subtotal,
  }));

  // Create order
  const order = await this.create({
    orderNumber,
    user: userId,
    items: orderItems,
    pricing: {
      subtotal: cart.totals.subtotal,
      tax: cart.totals.tax,
      shipping: cart.totals.shipping,
      discount: cart.totals.discount,
      total: cart.totals.total,
    },
    shippingAddress,
    paymentMethod,
    paymentStatus: paymentMethod === "cod" ? "unpaid" : "pending",
    orderStatus: "pending",
    statusHistory: [
      {
        status: "pending",
        note: "Order created",
        timestamp: new Date(),
      },
    ],
  });

  await EmailService.sendOrderConfirmation(order, user);

  // Deduct inventory (reserve stock)
  for (const item of cart.items) {
    const product = await Product.findById(item.product._id);
    if (product) {
      product.stock -= item.quantity;
      product.reserved = Math.max(0, product.reserved - item.quantity);
      await product.save();
    }
  }

  // Clear cart after order creation
  await cart.clearCart();

  return order;
};

// Update order status
orderSchema.methods.updateStatus = async function (newStatus, note, updatedBy) {
  const EmailService = require("../utils/emailService");
  const User = mongoose.model("User");

  const validTransitions = {
    pending: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered", "returned"],
    delivered: ["returned"],
    cancelled: [],
    returned: [],
  };

  const oldStatus = this.orderStatus;

  if (!validTransitions[this.orderStatus].includes(newStatus)) {
    throw new Error(`Cannot change status from ${this.orderStatus} to ${newStatus}`);
  }

  // Update status
  this.orderStatus = newStatus;

  // Add to history
  this.statusHistory.push({
    status: newStatus,
    note: note || `Status changed to ${newStatus}`,
    updatedBy: updatedBy,
    timestamp: new Date(),
  });

  // Update specific fields based on status
  if (newStatus === "delivered") {
    this.deliveredAt = new Date();
  }

  if (newStatus === "cancelled") {
    this.cancelledAt = new Date();
    this.cancelledBy = updatedBy;

    // Return stock to inventory
    const Product = mongoose.model("Product");
    for (const item of this.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }
  }

  const user = await User.findById(this.user);
  await EmailService.sendOrderStatusUpdate(this, user, oldStatus, newStatus);

  if (newStatus === "shipped") {
    await EmailService.sendOrderShipped(this, user);
  } else if (newStatus === "delivered") {
    await EmailService.sendOrderDelivered(this, user);
  }

  await this.save();
  return this;
};

// Mark as paid
orderSchema.methods.markAsPaid = async function (transactionId) {
  if (this.paymentStatus === "paid") {
    throw new Error("Order is already paid");
  }

  this.paymentStatus = "paid";
  this.paymentDate = new Date();
  this.transactionId = transactionId;

  // Auto-update to processing if still pending
  if (this.orderStatus === "pending") {
    await this.updateStatus("processing", "Payment received");
  }

  await this.save();
  return this;
};

// Add tracking information
orderSchema.methods.addTracking = async function (trackingNumber, carrier, estimatedDelivery) {
  this.trackingNumber = trackingNumber;
  this.carrier = carrier;
  this.estimatedDelivery = estimatedDelivery;

  // Auto-update to shipped if still processing
  if (this.orderStatus === "processing") {
    await this.updateStatus("shipped", `Shipped via ${carrier}`);
  }

  await this.save();
  return this;
};

// Cancel order
orderSchema.methods.cancel = async function (reason, cancelledBy) {
  if (!this.canBeCancelled) {
    throw new Error(`Order cannot be cancelled in ${this.orderStatus} status`);
  }

  this.cancelReason = reason;
  await this.updateStatus("cancelled", reason, cancelledBy);

  // Refund if already paid
  if (this.paymentStatus === "paid") {
    this.paymentStatus = "refunded";
    await this.save();
  }

  const user = await User.findById(this.user);
  await EmailService.sendOrderCancelled(this, user);

  return this;
};

// ========== PRE-SAVE MIDDLEWARE ==========

orderSchema.pre("save", function (next) {
  // Ensure totals are set
  if (this.isNew && !this.pricing.total) {
    this.pricing.total = this.pricing.subtotal + this.pricing.tax + this.pricing.shipping - this.pricing.discount;
  }
  next();
});

// ========== VIRTUALS IN JSON ==========

orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Order", orderSchema);

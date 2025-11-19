const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
    },
    items: [cartItemSchema],
    totals: {
      subtotal: {
        type: Number,
        default: 0,
        min: 0,
      },
      tax: {
        type: Number,
        default: 0,
        min: 0,
      },
      shipping: {
        type: Number,
        default: 0,
        min: 0,
      },
      discount: {
        type: Number,
        default: 0,
        min: 0,
      },
      total: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    couponCode: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding carts
cartSchema.index({ user: 1 });
cartSchema.index({ sessionId: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

// ========== INSTANCE METHODS ==========

// Calculate cart totals
cartSchema.methods.calculateTotals = function () {
  // Calculate subtotal
  this.totals.subtotal = this.items.reduce((sum, item) => {
    return sum + item.subtotal;
  }, 0);

  // Calculate tax (10% for example)
  const TAX_RATE = 0.1;
  this.totals.tax = this.totals.subtotal * TAX_RATE;

  // Calculate shipping (free over $100, else $10)
  if (this.totals.subtotal >= 100) {
    this.totals.shipping = 0;
  } else if (this.totals.subtotal > 0) {
    this.totals.shipping = 10;
  } else {
    this.totals.shipping = 0;
  }

  // Apply discount if any
  // this.totals.discount is set by coupon code

  // Calculate final total
  this.totals.total = this.totals.subtotal + this.totals.tax + this.totals.shipping - this.totals.discount;

  // Ensure total is not negative
  if (this.totals.total < 0) {
    this.totals.total = 0;
  }
};

// Add item to cart
cartSchema.methods.addItem = async function (productId, quantity = 1) {
  const Product = mongoose.model("Product");

  // 🔍 Get product
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");
  if (!product.isActive) throw new Error("Product is not available");

  // 🧮 Find existing item in cart (move this up!)
  const existingItem = this.items.find((item) => item.product.toString() === productId.toString());

  // 🧾 Check stock availability
  const availableStock = product.getAvailableStock();
  const currentInCart = existingItem ? existingItem.quantity : 0;
  const totalNeeded = currentInCart + quantity;

  if (totalNeeded > availableStock) {
    throw new Error(`Only ${availableStock} items available. You already have ${currentInCart} in cart.`);
  }

  // 🛒 Add or update item
  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;

    if (newQuantity > product.stock) {
      throw new Error(`Cannot add ${quantity} more. Only ${product.stock - existingItem.quantity} available.`);
    }

    existingItem.quantity = newQuantity;
    existingItem.subtotal = existingItem.price * newQuantity;
  } else {
    this.items.push({
      product: productId,
      quantity,
      price: product.finalPrice || product.price,
      subtotal: (product.finalPrice || product.price) * quantity,
    });
  }

  // Track event
  const { trackCartEvent } = require("../utils/cartTracking");
  await trackCartEvent(this, "item_added", {
    product: productId,
    quantity: quantity,
    price: product.price,
  });

  // 🧮 Recalculate totals
  this.calculateTotals();

  return await this.save();
};

// Update item quantity
cartSchema.methods.updateItemQuantity = async function (itemId, quantity) {
  if (quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }

  const item = this.items.id(itemId);
  if (!item) {
    throw new Error("Item not found in cart");
  }

  // Get product to check stock
  const Product = mongoose.model("Product");
  const product = await Product.findById(item.product);

  if (!product) {
    throw new Error("Product not found");
  }

  if (quantity > product.stock) {
    throw new Error(`Only ${product.stock} items available in stock`);
  }

  // Update quantity and subtotal
  item.quantity = quantity;
  item.subtotal = item.price * quantity;

  // Recalculate totals
  this.calculateTotals();

  return await this.save();
};

// Remove item from cart
cartSchema.methods.removeItem = async function (itemId) {
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error("Item not found in cart");
  }

  // Remove item using pull
  this.items.pull(itemId);

  // Recalculate totals
  this.calculateTotals();

  return await this.save();
};

// Clear cart
cartSchema.methods.clearCart = async function () {
  this.items = [];
  this.couponCode = null;
  this.totals = {
    subtotal: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 0,
  };

  return await this.save();
};

// Get cart with populated products
cartSchema.methods.populateItems = function () {
  return this.populate({
    path: "items.product",
    select: "name price stock images category brand",
  });
};

// Get cart item count
cartSchema.methods.getItemCount = function () {
  return this.items.reduce((count, item) => count + item.quantity, 0);
};

// Check if product is in cart
cartSchema.methods.hasProduct = function (productId) {
  return this.items.some((item) => item.product.toString() === productId.toString());
};

// Get item by product ID
cartSchema.methods.getItemByProduct = function (productId) {
  return this.items.find((item) => item.product.toString() === productId.toString());
};

// Validate cart (check all products still available and in stock)
cartSchema.methods.validateCart = async function () {
  const Product = mongoose.model("Product");
  const errors = [];
  const itemsToRemove = [];

  for (const item of this.items) {
    const product = await Product.findById(item.product);

    if (!product || !product.isActive) {
      errors.push(`Product ${item.product} is no longer available`);
      itemsToRemove.push(item._id);
      continue;
    }

    if (product.stock < item.quantity) {
      errors.push(`Only ${product.stock} of ${product.name} available (you have ${item.quantity} in cart)`);

      if (product.stock === 0) {
        itemsToRemove.push(item._id);
      } else {
        // Update to available quantity
        item.quantity = product.stock;
        item.subtotal = item.price * product.stock;
      }
    }

    // Check if price changed significantly (>5%)
    const currentPrice = product.finalPrice || product.price;
    const priceChange = Math.abs(currentPrice - item.price) / item.price;

    if (priceChange > 0.05) {
      errors.push(`Price of ${product.name} has changed from $${item.price} to $${currentPrice}`);
    }
  }

  // Remove unavailable items
  for (const itemId of itemsToRemove) {
    this.items.pull(itemId);
  }

  if (itemsToRemove.length > 0 || this.isModified("items")) {
    this.calculateTotals();
    await this.save();
  }

  return {
    isValid: errors.length === 0,
    errors,
    removedItems: itemsToRemove.length,
  };
};

// Apply coupon code
cartSchema.methods.applyCoupon = function (couponCode, discountAmount) {
  this.couponCode = couponCode;
  this.totals.discount = discountAmount;
  this.calculateTotals();
};

// Remove coupon
cartSchema.methods.removeCoupon = function () {
  this.couponCode = null;
  this.totals.discount = 0;
  this.calculateTotals();
};

// ========== STATIC METHODS ==========

// Get or create cart for user
cartSchema.statics.getCartForUser = async function (userId) {
  let cart = await this.findOne({ user: userId });

  if (!cart) {
    cart = await this.create({ user: userId });
  }

  return cart;
};

// Get or create cart for guest
cartSchema.statics.getCartForSession = async function (sessionId) {
  let cart = await this.findOne({ sessionId: sessionId });

  if (!cart) {
    cart = await this.create({ sessionId: sessionId });
  }

  return cart;
};

// Merge guest cart with user cart on login
cartSchema.statics.mergeGuestCart = async function (sessionId, userId) {
  const guestCart = await this.findOne({ sessionId: sessionId });

  if (!guestCart || guestCart.items.length === 0) {
    return await this.getCartForUser(userId);
  }

  const userCart = await this.getCartForUser(userId);

  // Merge items from guest cart to user cart
  for (const guestItem of guestCart.items) {
    const existingItem = userCart.items.find((item) => item.product.toString() === guestItem.product.toString());

    if (existingItem) {
      // Combine quantities
      existingItem.quantity += guestItem.quantity;
      existingItem.subtotal = existingItem.price * existingItem.quantity;
    } else {
      // Add new item
      userCart.items.push(guestItem);
    }
  }

  // Recalculate totals
  userCart.calculateTotals();
  await userCart.save();

  // Delete guest cart
  await guestCart.remove();

  return userCart;
};

// ========== PRE-SAVE MIDDLEWARE ==========

cartSchema.pre("save", function (next) {
  // Recalculate totals before saving
  if (this.isModified("items") || this.isModified("couponCode")) {
    this.calculateTotals();
  }
  next();
});

module.exports = mongoose.model("Cart", cartSchema);

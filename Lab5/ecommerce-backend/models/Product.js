const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [3, "Product name must be at least 3 characters"],
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    sku: {
      type: String,
      unique: true,
      required: [true, "SKU is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      max: [1000000, "Price too high"],
    },
    compareAtPrice: {
      type: Number,
      min: [0, "Compare price cannot be negative"],
    },
    salePrice: {
      type: Number,
      min: [0, "Sale price cannot be negative"],
    },
    onSale: {
      type: Boolean,
      default: false,
    },
    saleStartDate: Date,
    saleEndDate: Date,

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    specifications: {
      type: Map,
      of: String,
    },
    weight: {
      type: Number, // in kg
      min: [0, "Weight cannot be negative"],
    },
    dimensions: {
      length: { type: Number, min: [0, "Length cannot be negative"] },
      width: { type: Number, min: [0, "Width cannot be negative"] },
      height: { type: Number, min: [0, "Height cannot be negative"] },
    },
    tags: [String],

    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
    },
    numReviews: {
      type: Number,
      default: 0,
      min: [0, "Number of reviews cannot be negative"],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      views: { type: Number, default: 0 },
      favorites: { type: Number, default: 0 },
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    reserved: {
        type: Number,
        default: 0,
        min: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 10
    },
    stockStatus: {
        type: String,
        enum: ['in-stock', 'low-stock', 'out-of-stock', 'discontinued'],
        default: 'in-stock'
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
productSchema.index({ name: "text", description: "text", brand: "text" });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ featured: 1, rating: -1 });

// Virtual - Calculate discount percentage
productSchema.virtual("discountPercentage").get(function () {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(
      ((this.compareAtPrice - this.price) / this.compareAtPrice) * 100
    );
  }
  return 0;
});

// Final price (if on sale and within date range)
productSchema.virtual("finalPrice").get(function () {
  const now = new Date();
  const isWithinSalePeriod =
    this.onSale &&
    (!this.saleStartDate || this.saleStartDate <= now) &&
    (!this.saleEndDate || this.saleEndDate >= now);

  return isWithinSalePeriod && this.salePrice ? this.salePrice : this.price;
});

// Discount amount (in dollars)
productSchema.virtual("discountAmount").get(function () {
  if (this.finalPrice && this.price > this.finalPrice) {
    return this.price - this.finalPrice;
  }
  return 0;
});

// Check if currently on sale (based on date range)
productSchema.virtual("isOnSale").get(function () {
  const now = new Date();
  return (
    this.onSale &&
    (!this.saleStartDate || this.saleStartDate <= now) &&
    (!this.saleEndDate || this.saleEndDate >= now)
  );
});

// Virtual - Check if in stock
productSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

// Generate slug from name before saving
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug =
      this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now();
  }
  next();
});

// Ensure at least one image
productSchema.pre("save", function (next) {
  if (this.images.length === 0) {
    this.images.push("https://via.placeholder.com/600x400?text=Product");
  }
  next();
});

productSchema.pre('save', function(next) {
    this.updateStockStatus();
    next();
});

// Static method - Find by slug
productSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug, isActive: true }).populate("category");
};

// Static method - Search products
productSchema.statics.searchProducts = function (query) {
  return this.find(
    { $text: { $search: query }, isActive: true },
    { score: { $meta: "textScore" } }
  ).sort({ score: { $meta: "textScore" } });
};

// 🛍️ Get all currently on-sale products
productSchema.statics.getOnSaleProducts = function () {
  const now = new Date();
  return this.find({
    onSale: true,
    salePrice: { $exists: true, $lt: "$price" },
    $or: [
      { saleStartDate: { $exists: false } },
      { saleStartDate: { $lte: now } },
    ],
    $or: [{ saleEndDate: { $exists: false } }, { saleEndDate: { $gte: now } }],
  });
};

// ⚠️ Get low-stock products
productSchema.statics.getLowStockProducts = function (threshold = 5) {
  return this.find({ stock: { $lt: threshold }, isActive: true });
};

// 👀 Get most-viewed products
productSchema.statics.getMostViewed = function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ "metadata.views": -1 })
    .limit(limit);
};

// Instance method - Update stock
productSchema.methods.updateStock = async function (quantity) {
  this.stock += quantity;
  if (this.stock < 0) this.stock = 0;
  return await this.save();
};

// ➕ Increment product view count
productSchema.methods.incrementViews = async function () {
  this.metadata.views += 1;
  return await this.save();
};

// ❤️ Add to favorites count
productSchema.methods.addToFavorites = async function () {
  this.metadata.favorites += 1;
  return await this.save();
};

// ✅ Check availability for quantity
productSchema.methods.checkAvailability = function (quantity = 1) {
  return this.isActive && this.stock >= quantity;
};

// 💸 Apply discount
productSchema.methods.applyDiscount = async function (
  percentage,
  startDate,
  endDate
) {
  if (percentage <= 0 || percentage >= 100) {
    throw new Error("Discount percentage must be between 0 and 100");
  }
  const discountAmount = this.price * (percentage / 100);
  this.salePrice = Math.round((this.price - discountAmount) * 100) / 100;
  this.onSale = true;
  this.saleStartDate = startDate || new Date();
  this.saleEndDate = endDate || null;
  return await this.save();
};

// Instance method - Check if available
productSchema.methods.isAvailable = function (quantity = 1) {
  return this.isActive && this.stock >= quantity;
};

// Get available stock (total - reserved)
productSchema.methods.getAvailableStock = function() {
    return Math.max(0, this.stock - this.reserved);
};

// Check if can fulfill quantity
productSchema.methods.canFulfill = function(quantity) {
    return this.getAvailableStock() >= quantity;
};

// Reserve stock for cart
productSchema.methods.reserveStock = async function(quantity) {
    if (!this.canFulfill(quantity)) {
        throw new Error('Insufficient stock available');
    }
    
    this.reserved += quantity;
    await this.save();
};

// Release reserved stock
productSchema.methods.releaseStock = async function(quantity) {
    this.reserved = Math.max(0, this.reserved - quantity);
    await this.save();
};

// Update stock status
productSchema.methods.updateStockStatus = function() {
    const available = this.getAvailableStock();
    
    if (available === 0) {
        this.stockStatus = 'out-of-stock';
    } else if (available <= this.lowStockThreshold) {
        this.stockStatus = 'low-stock';
    } else {
        this.stockStatus = 'in-stock';
    }
};

module.exports = mongoose.model("Product", productSchema);

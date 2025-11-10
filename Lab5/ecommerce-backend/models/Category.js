const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
      type: String,
      default: "https://via.placeholder.com/400x200?text=Category",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    level: {
      type: Number,
      default: 0, // 0 = root, 1 = subcategory, etc.
    },
    imageUrl: {
      type: String,
    },
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field - count products in this category
categorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true,
});

categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory",
});

// Generate slug from name before saving
categorySchema.pre("validate", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

// Instance method - Get all products in this category
categorySchema.methods.getSubcategories = async function() {
    return mongoose.model('Category').find({ parentCategory: this._id });
};

categorySchema.methods.getAllProducts = async function () {
  const Product = mongoose.model("Product");
  return await Product.find({ category: this._id });
};

categorySchema.methods.getProductCount = async function() {
    const Product = mongoose.model('Product');
    return Product.countDocuments({ category: this._id });
};

// Static method - Find by slug
categorySchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug: slug.toLowerCase() });
};

// Get all root categories (level 0)
categorySchema.statics.getRootCategories = function() {
    return this.find({ level: 0, isActive: true }).sort({ displayOrder: 1, name: 1 });
};

// Recursively build category tree
categorySchema.statics.getCategoryTree = async function() {
    const categories = await this.find({ isActive: true }).lean();

    const map = {};
    categories.forEach(cat => (map[cat._id] = { ...cat, children: [] }));

    const tree = [];
    categories.forEach(cat => {
        if (cat.parentCategory) {
            map[cat.parentCategory]?.children.push(map[cat._id]);
        } else {
            tree.push(map[cat._id]);
        }
    });

    return tree;
};

module.exports = mongoose.model("Category", categorySchema);

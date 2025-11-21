const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },
    user: {
      name: {
        type: String,
        required: [true, "Reviewer name is required"],
        trim: true,
        minlength: [2, "Name must be at least 2 characters"],
        maxlength: [50, "Name cannot exceed 50 characters"],
      },
      email: {
        type: String,
        required: [true, "Reviewer email is required"],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      },
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      required: [true, "Review title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      minlength: [10, "Comment must be at least 10 characters"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    verified: {
      type: Boolean,
      default: false, // true if user actually purchased
    },
    helpful: {
      type: Number,
      default: 0,
    },
    images: {
      type: [String],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: "You can upload up to 5 images only",
      },
    },
  },
  {
    timestamps: true,
  }
);

// ============ Indexes ============
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ "user.email": 1, product: 1 }, { unique: true }); // One review per user per product

// ============ Helper Function ============
async function updateProductRating(productId) {
  const Review = mongoose.model("Review");
  const Product = mongoose.model("Product");

  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: stats[0].avgRating.toFixed(1),
      numReviews: stats[0].numReviews,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      rating: 0,
      numReviews: 0,
    });
  }
}

// ============ Middleware ============
reviewSchema.post("save", async function () {
  await updateProductRating(this.product);
});

reviewSchema.post("remove", async function () {
  await updateProductRating(this.product);
});

module.exports = mongoose.model("Review", reviewSchema);

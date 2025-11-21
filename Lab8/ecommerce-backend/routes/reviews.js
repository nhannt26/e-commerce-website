const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Review = require("../models/Review");
const Product = require("../models/Product");

// Helper: check if ObjectId is valid
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* =========================================================
   POST /api/products/:productId/reviews
   Create a review for a specific product
========================================================= */
router.post("/:productId/reviews", async (req, res) => {
  try {
    const { productId } = req.params;
    const { user, rating, title, comment, images } = req.body;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const review = new Review({
      product: productId,
      user,
      rating,
      title,
      comment,
      images,
    });

    await review.save();
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error("❌ Error creating review:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* =========================================================
   GET /api/products/:productId/reviews
   Get all reviews for a specific product (with pagination & sorting)
========================================================= */
router.get("/:productId/reviews", async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sort || "recent";
    const skip = (page - 1) * limit;

    let sortOption = {};
    switch (sortBy) {
      case "helpful":
        sortOption = { helpfulCount: -1 };
        break;
      case "rating":
        sortOption = { rating: -1 };
        break;
      case "recent":
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    const reviews = await Review.find({ product: productId })
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate("product");

    const total = await Review.countDocuments({ product: productId });

    res.json({
      success: true,
      page,
      total,
      reviews,
    });
  } catch (error) {
    console.error("❌ Error fetching reviews:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* =========================================================
   GET /api/reviews/:id
   Get single review (populate product)
========================================================= */
router.get("/review/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid review ID" });
    }

    const review = await Review.findById(id).populate("product");
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    console.error("❌ Error fetching review:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* =========================================================
   PUT /api/reviews/:id
   Update review (rating, title, comment, images)
========================================================= */
router.put("/review/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment, images } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid review ID" });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;
    if (images !== undefined) review.images = images;

    await review.save(); // post 'save' middleware recalculates product rating
    const updated = await Review.findById(id).populate("product");

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("❌ Error updating review:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* =========================================================
   DELETE /api/reviews/:id
   Delete review (product rating auto-updates via middleware)
========================================================= */
router.delete("/review/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid review ID" });
    }

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting review:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* =========================================================
   PATCH /api/reviews/:id/helpful
   Increment helpful count
========================================================= */
router.patch("/review/:id/helpful", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid review ID" });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    review.helpfulCount = (review.helpfulCount || 0) + 1;
    await review.save();

    res.json({ success: true, data: review });
  } catch (error) {
    console.error("❌ Error marking review helpful:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;

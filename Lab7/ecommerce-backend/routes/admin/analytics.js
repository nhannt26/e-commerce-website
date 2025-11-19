// routes/admin/analytics.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../../middleware/auth");
const Cart = require("../../models/Cart");
const CartEvent = require("../../models/CartEvent");

// GET /api/admin/analytics/carts - Cart statistics
router.get("/carts", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Total carts created
    const totalCarts = await Cart.countDocuments({
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    });

    // Active carts (with items)
    const activeCarts = await Cart.countDocuments({
      "items.0": { $exists: true },
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    });

    // Abandoned carts (not updated in 24 hours, has items)
    const abandonedCarts = await Cart.countDocuments({
      "items.0": { $exists: true },
      updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    // Average cart value
    const cartValues = await Cart.aggregate([
      {
        $match: {
          "items.0": { $exists: true },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      },
      {
        $group: {
          _id: null,
          avgTotal: { $avg: "$totals.total" },
          maxTotal: { $max: "$totals.total" },
          minTotal: { $min: "$totals.total" },
        },
      },
    ]);

    // Most added products
    const popularProducts = await CartEvent.aggregate([
      {
        $match: {
          eventType: "item_added",
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      },
      {
        $group: {
          _id: "$product",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$metadata.quantity" },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $project: {
          productId: "$_id",
          productName: "$product.name",
          timesAdded: "$count",
          totalQuantity: 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalCarts,
        activeCarts,
        abandonedCarts,
        abandonmentRate: totalCarts > 0 ? ((abandonedCarts / totalCarts) * 100).toFixed(2) + "%" : "0%",
        averageCartValue: cartValues[0]?.avgTotal?.toFixed(2) || 0,
        maxCartValue: cartValues[0]?.maxTotal?.toFixed(2) || 0,
        minCartValue: cartValues[0]?.minTotal?.toFixed(2) || 0,
        popularProducts,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/analytics/abandoned-carts - Detailed abandoned carts
router.get("/abandoned-carts", protect, authorize("admin"), async (req, res, next) => {
  try {
    const abandonedCarts = await Cart.find({
      "items.0": { $exists: true },
      updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .populate("user", "firstName lastName email")
      .populate("items.product", "name price images")
      .select("user items totals updatedAt")
      .sort({ "totals.total": -1 })
      .limit(50);

    res.json({
      success: true,
      count: abandonedCarts.length,
      data: abandonedCarts,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

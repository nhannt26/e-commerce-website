const express = require("express");
const router = express.Router();
const { protect, authorize, adminOnly } = require("../../middleware/auth");
const User = require("../../models/User");
const Product = require("../../models/Product");

// All routes require admin role
router.use(protect, authorize("admin"));

// GET /api/admin/users
router.get("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;

    // Build query object
    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }];
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [users, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      results: {
        users,
        count: users.length,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users/stats
router.get("/stats", protect, adminOnly, async (req, res, next) => {
  try {
    // 🧮 Define date ranges
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ⚡ Run all queries in parallel
    const [totalUsers, activeUsers, customersCount, adminsCount, newUsersThisMonth, newUsersToday] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
    ]);

    // ✅ Send response
    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        customersCount,
        adminsCount,
        newUsersThisMonth,
        newUsersToday,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users/:id
router.get("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1️⃣ Find user and populate wishlist (but exclude passwords)
    const user = await User.findById(id).select("-password").populate({
      path: "wishlist",
      select: "name price images slug",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2️⃣ Count addresses
    const addressCount = await User.countDocuments({ user: id });

    // 3️⃣ Count orders (if Order model implemented)
    let orderCount = 0;
    try {
      orderCount = await Product.countDocuments({ user: id });
    } catch {
      orderCount = 0; // safe fallback if no Order model yet
    }

    // 4️⃣ Prepare detailed response
    res.json({
      success: true,
      user: {
        ...user.toObject(),
        wishlistCount: user.wishlist?.length || 0,
        addressCount,
        orderCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/users/:id/activate
router.patch("/:id/activate", protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: "User is already active",
      });
    }

    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: "User activated successfully",
      user: user.toObject({ getters: true, versionKey: false }),
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/users/:id/deactivate
router.patch("/:id/deactivate", protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1️⃣ Find user by ID
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2️⃣ Prevent redundant deactivation
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: "User is already deactivated",
      });
    }

    // 3️⃣ Deactivate account
    user.isActive = false;
    await user.save();

    // 4️⃣ Respond with updated user info
    res.json({
      success: true,
      message: "User deactivated successfully",
      user: user.toObject({ getters: true, versionKey: false }),
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/users/:id/role
router.patch("/:id/role", protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // 1️⃣ Validate input
    if (!["customer", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Allowed values: customer, admin",
      });
    }

    // 2️⃣ Prevent changing own role
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot change your own role",
      });
    }

    // 3️⃣ Find target user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 4️⃣ Update role if changed
    if (user.role === role) {
      return res.status(400).json({
        success: false,
        message: `User is already assigned the '${role}' role`,
      });
    }

    user.role = role;
    await user.save();

    // 5️⃣ Return response
    res.json({
      success: true,
      message: `User role updated to '${role}' successfully`,
      user: user.toObject({ getters: true, versionKey: false }),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:id
router.delete("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1️⃣ Prevent deleting own account
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // 2️⃣ Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3️⃣ Check for existing orders
    let orderCount = 0;
    try {
      orderCount = await Product.countDocuments({ user: id });
    } catch {
      orderCount = 0; // skip if no order model exists
    }

    // 4️⃣ Warn if user has existing orders
    if (orderCount > 0) {
      // Soft delete: deactivate user
      user.isActive = false;
      await user.save();

      return res.json({
        success: true,
        message: `User has ${orderCount} orders — account deactivated instead of deleted`,
        user: user.toObject({ getters: true, versionKey: false }),
      });
    }

    // 5️⃣ Hard delete if no orders
    await user.deleteOne();

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

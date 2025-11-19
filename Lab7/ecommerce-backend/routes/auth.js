const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// ========== REGISTER ==========
router.post("/register", async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // 🔹 Input validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, and password are required",
      });
    }

    if (firstName.length < 2 || firstName.length > 50) {
      return res.status(400).json({ success: false, message: "First name must be 2–50 characters" });
    }
    if (lastName.length < 2 || lastName.length > 50) {
      return res.status(400).json({ success: false, message: "Last name must be 2–50 characters" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    // 🔹 Check for existing user
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // 🔹 Create new user (password hashed by pre-save hook)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
    });

    // 🔹 Generate JWT token
    const token = user.generateAuthToken();

    // 🔹 Response
    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: user.getPublicProfile(),
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle duplicate email (unique index)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }
    // Pass unexpected errors to global error handler
    next(error);
  }
});

// ========== LOGIN ==========
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // 2️⃣ Find user (must include password field)
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    // 3️⃣ Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 4️⃣ Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account has been deactivated",
      });
    }

    // 5️⃣ Verify password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 6️⃣ Update last login timestamp
    await user.updateLastLogin();

    // 7️⃣ Generate JWT token
    const token = user.generateAuthToken();

    // 8️⃣ Respond with user profile (safe data)
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
});

// ========== GET CURRENT USER ==========
router.get("/me", protect, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user.getPublicProfile(),
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user",
    });
  }
});

router.put("/update-profile", protect, async (req, res) => {
  try {
    const allowedFields = ["firstName", "lastName", "phone", "dateOfBirth", "preferences"];
    const updates = {};

    // Only include allowed fields
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Prevent email, password, and role updates
    const restrictedFields = ["email", "password", "role", "accountBalance", "loyaltyPoints"];
    for (const key of restrictedFields) {
      if (req.body[key] !== undefined) {
        return res.status(400).json({
          success: false,
          message: `Cannot update restricted field: ${key}`,
        });
      }
    }

    // Update user in DB
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: user.getPublicProfile(),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating profile",
    });
  }
});

router.post("/change-password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Get user with password field
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update to new password (will be hashed by pre-save)
    user.password = newPassword;
    await user.save();

    // Generate new JWT token
    const token = user.generateAuthToken();

    res.json({
      success: true,
      message: "Password changed successfully",
      token,
    });
  } catch (error) {
    console.error("Change password error:", error);
    next(error);
  }
});

// ========== LOGOUT (Optional - for cookie-based auth) ==========
router.post("/logout", (req, res) => {
  // For JWT, just delete token on client side
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

module.exports = router;

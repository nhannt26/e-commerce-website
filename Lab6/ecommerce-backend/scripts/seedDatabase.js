// seedAdmin.js
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/User");
const connectDB = require("../config/db");

(async () => {
  try {
    // 1️⃣ Connect to MongoDB
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // 2️⃣ Check if an admin already exists
    const existingAdmin = await User.findOne({ email: "admin@shop.com" });
    if (existingAdmin) {
      console.log("⚠️ Admin user already exists:");
      console.log(`   Email: ${existingAdmin.email}`);
      process.exit(0);
    }

    // 3️⃣ Create admin user
    const admin = await User.create({
      firstName: "Admin",
      lastName: "User",
      email: "admin@shop.com",
      password: "admin123", // Should be hashed in your model
      role: "admin"
    });

    console.log("✅ Admin user created successfully!");
    console.log("   Email: admin@shop.com");
    console.log("   Password: admin123");
    console.log("   Role:", admin.role);

    // 4️⃣ Disconnect from DB
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error seeding admin user:", error.message);
    process.exit(1);
  }
})();

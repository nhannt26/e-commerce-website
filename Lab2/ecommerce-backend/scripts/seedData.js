const mongoose = require("mongoose");
require("dotenv").config();
const connectDB = require("../config/db");
const Product = require("../models/Product");
const Category = require("../models/Category");

// Sample categories
const categories = [
  {
    name: "Electronics",
    description: "Electronic devices and gadgets",
    image: "https://via.placeholder.com/400x200?text=Electronics",
  },
  {
    name: "Clothing",
    description: "Fashion and apparel",
    image: "https://via.placeholder.com/400x200?text=Clothing",
  },
  {
    name: "Home & Garden",
    description: "Home improvement and garden supplies",
    image: "https://via.placeholder.com/400x200?text=Home+Garden",
  },
  {
    name: "Sports",
    description: "Sports equipment and activewear",
    image: "https://via.placeholder.com/400x200?text=Sports",
  },
];

// Sample products (will be populated with category IDs)
const products = [
  {
    name: "Wireless Mouse",
    description:
      "Ergonomic wireless mouse with 6 programmable buttons and precision tracking for gaming and productivity",
    price: 29.99,
    compareAtPrice: 39.99,
    brand: "TechGear",
    stock: 150,
    images: ["https://via.placeholder.com/600x400?text=Wireless+Mouse"],
    features: [
      "2.4GHz wireless",
      "6 programmable buttons",
      "Ergonomic design",
      "18-month battery life",
    ],
    specifications: {
      DPI: "1600",
      Buttons: "6",
      "Battery Life": "18 months",
      Connectivity: "Wireless 2.4GHz",
    },
    rating: 4.5,
    numReviews: 128,
    featured: true,
    category: "Electronics", // Will be replaced with ObjectId
  },
  // Add more products...
];

const seedData = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log("🗑️  Clearing existing data...");
    await Product.deleteMany({});
    await Category.deleteMany({});

    console.log("📦 Creating categories...");
    const createdCategories = await Category.insertMany(categories);

    console.log(`✅ ${createdCategories.length} categories created`);

    // Map category names to IDs
    const categoryMap = {};
    createdCategories.forEach((cat) => {
      categoryMap[cat.name] = cat._id;
    });

    console.log("📦 Creating products...");
    // Replace category names with IDs
    const productsWithCategoryIds = products.map((product, index) => ({
      ...product,
      category: categoryMap[product.category],
      sku: product.sku || `SKU-${index + 1}-${Date.now()}`, // 👈 Tự sinh SKU nếu chưa có
    }));
    const createdProducts = await Product.insertMany(productsWithCategoryIds);

    console.log(`✅ ${createdProducts.length} products created`);
    console.log("✅ Database seeded successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedData();

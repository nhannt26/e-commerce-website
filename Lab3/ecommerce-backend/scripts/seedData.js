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

  {
    name: "Bluetooth Headphones",
    description:
      "Over-ear Bluetooth headphones with noise cancellation and 30-hour battery life for immersive audio",
    price: 79.99,
    compareAtPrice: 99.99,
    brand: "SoundMax",
    stock: 85,
    images: ["https://via.placeholder.com/600x400?text=Bluetooth+Headphones"],
    features: [
      "Active noise cancellation",
      "Bluetooth 5.0",
      "Built-in microphone",
      "Foldable design",
    ],
    specifications: {
      "Battery Life": "30 hours",
      Connectivity: "Bluetooth 5.0",
      Microphone: "Yes",
      Weight: "250g",
    },
    rating: 4.6,
    numReviews: 203,
    featured: false,
    category: "Electronics",
  },

  {
    name: "Smartwatch Pro",
    description:
      "Advanced smartwatch with heart rate monitor, GPS, and customizable watch faces for health and fitness tracking",
    price: 149.99,
    compareAtPrice: 199.99,
    brand: "FitTech",
    stock: 120,
    images: ["https://via.placeholder.com/600x400?text=Smartwatch+Pro"],
    features: [
      "Heart rate monitor",
      "Built-in GPS",
      "Water resistant (50m)",
      "Customizable faces",
    ],
    specifications: {
      Display: "1.4-inch AMOLED",
      Battery: "10 days",
      GPS: "Built-in",
      Compatibility: "iOS & Android",
    },
    rating: 4.4,
    numReviews: 178,
    featured: true,
    category: "Wearables",
  },

  {
    name: "Mechanical Keyboard",
    description:
      "RGB mechanical keyboard with blue switches, durable metal frame, and customizable lighting effects",
    price: 59.99,
    compareAtPrice: 79.99,
    brand: "KeyMaster",
    stock: 200,
    images: ["https://via.placeholder.com/600x400?text=Mechanical+Keyboard"],
    features: [
      "RGB backlighting",
      "Blue mechanical switches",
      "Anti-ghosting keys",
      "Metal top plate",
    ],
    specifications: {
      Switches: "Blue",
      Connectivity: "USB",
      "Key Rollover": "N-Key",
      Backlighting: "16.8M colors RGB",
    },
    rating: 4.7,
    numReviews: 320,
    featured: false,
    category: "Computers",
  },

  {
    name: "4K Monitor 27-inch",
    description:
      "27-inch UHD 4K monitor with HDR support, ultra-thin bezels, and adjustable stand for professional work and gaming",
    price: 299.99,
    compareAtPrice: 399.99,
    brand: "ViewPrime",
    stock: 60,
    images: ["https://via.placeholder.com/600x400?text=4K+Monitor+27-inch"],
    features: [
      "UHD 4K resolution",
      "HDR10 support",
      "Adjustable stand",
      "Ultra-thin bezels",
    ],
    specifications: {
      Size: "27-inch",
      Resolution: "3840x2160 (4K)",
      RefreshRate: "75Hz",
      Ports: "HDMI, DisplayPort, USB-C",
    },
    rating: 4.8,
    numReviews: 95,
    featured: true,
    category: "Computers",
  },

  {
    name: "Portable Power Bank 20000mAh",
    description:
      "High-capacity portable power bank with fast charging and dual USB outputs for phones and tablets",
    price: 39.99,
    compareAtPrice: 49.99,
    brand: "ChargeX",
    stock: 300,
    images: [
      "https://via.placeholder.com/600x400?text=Portable+Power+Bank+20000mAh",
    ],
    features: [
      "20000mAh capacity",
      "Dual USB output",
      "Fast charging support",
      "LED battery indicator",
    ],
    specifications: {
      Capacity: "20000mAh",
      Output: "5V/3A (max)",
      Ports: "2x USB-A, 1x USB-C",
      Weight: "350g",
    },
    rating: 4.3,
    numReviews: 410,
    featured: false,
    category: "Accessories",
  },
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

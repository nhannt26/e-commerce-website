const mongoose = require("mongoose");
require("dotenv").config();
const connectDB = require("../config/db");
const Product = require("../models/Product");
const Category = require("../models/Category");

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

// Utility: random helpers
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomFloat = (min, max) =>
  +(Math.random() * (max - min) + min).toFixed(2);
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Generate sample products per category
const generateProducts = (categoryName) => {
  const productTemplates = {
    Electronics: [
      {
        name: "Wireless Mouse",
        brand: "TechGear",
        features: ["2.4GHz wireless", "6 buttons", "Ergonomic design"],
      },
      {
        name: "Bluetooth Headphones",
        brand: "SoundMax",
        features: ["Noise-cancelling", "20-hour battery life", "Wireless"],
      },
      {
        name: "Smartwatch Pro",
        brand: "TimeTech",
        features: ["Heart rate monitor", "GPS tracking", "Water-resistant"],
      },
    ],
    Clothing: [
      {
        name: "Men’s Cotton T-Shirt",
        brand: "UrbanWear",
        features: ["100% cotton", "Regular fit", "Machine washable"],
      },
      {
        name: "Women’s Denim Jacket",
        brand: "StyleZone",
        features: ["Blue denim", "Button closure", "Classic fit"],
      },
      {
        name: "Unisex Hoodie",
        brand: "ComfyLife",
        features: ["Fleece lining", "Front pocket", "Drawstring hood"],
      },
    ],
    "Home & Garden": [
      {
        name: "Ceramic Vase Set",
        brand: "HomeStyle",
        features: ["Handmade", "Matte finish", "Set of 3"],
      },
      {
        name: "LED Desk Lamp",
        brand: "BrightHome",
        features: ["Touch control", "3 brightness levels", "Energy efficient"],
      },
      {
        name: "Garden Watering Can",
        brand: "GreenThumb",
        features: ["2-liter capacity", "Durable plastic", "Easy-pour spout"],
      },
    ],
    Sports: [
      {
        name: "Yoga Mat Pro",
        brand: "FitLine",
        features: ["Non-slip surface", "6mm thickness", "Eco-friendly"],
      },
      {
        name: "Football",
        brand: "ProSport",
        features: ["PU leather", "Official size 5", "Durable stitching"],
      },
      {
        name: "Running Shoes",
        brand: "SprintX",
        features: ["Breathable mesh", "Rubber sole", "Lightweight design"],
      },
    ],
  };

  return productTemplates[categoryName].map((item, i) => ({
    name: item.name,
    description: `${item.name} by ${item.brand} — premium quality for everyday use.`,
    price: randomFloat(10, 199),
    compareAtPrice: randomFloat(200, 299),
    brand: item.brand,
    stock: randomInt(50, 200),
    images: [
      `https://via.placeholder.com/600x400?text=${encodeURIComponent(
        item.name
      )}`,
    ],
    features: item.features,
    specifications: {
      Material: "Varies",
      Warranty: "1 year",
      Origin: "Imported",
    },
    rating: randomFloat(3.5, 5),
    numReviews: randomInt(10, 500),
    featured: Math.random() < 0.3, // ~30% featured
    category: categoryName,
  }));
};

const seedData = async () => {
  try {
    await connectDB();

    console.log("🗑️ Clearing existing data...");
    await Product.deleteMany({});
    await Category.deleteMany({});

    console.log("📦 Creating categories...");
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ ${createdCategories.length} categories created`);

    // Map category names → ObjectIds
    const categoryMap = {};
    createdCategories.forEach((cat) => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
    });

    console.log("📦 Generating products...");
    const allProducts = categories.flatMap((cat) => generateProducts(cat.name));

    const slugify = (str) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

    // Assign category ObjectIds + SKU
    const productsWithCategoryIds = allProducts.map((p, index) => {
      const categoryId = categoryMap[p.category.toLowerCase()];
      if (!categoryId) throw new Error(`Category not found: ${p.category}`);
      return {
        ...p,
        category: categoryId,
        sku: `SKU-${index + 1}-${Date.now()}`,
        slug: `${slugify(p.name)}-${index + 1}`,
      };
    });

    const createdProducts = await Product.insertMany(productsWithCategoryIds);

    console.log(`✅ ${createdProducts.length} products created`);
    console.log("🎉 Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedData();

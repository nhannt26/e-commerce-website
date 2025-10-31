const express = require("express");
const router = express.Router();
const products = require("../data/products");

// Utility function to create slugs
const slugify = (str) => str.toLowerCase().replace(/\s+/g, "-");

// GET /api/categories - Get all categories with product count
router.get("/", (req, res) => {
  try {
    const categoryMap = {};

    products.forEach((product) => {
      const category = product.category;
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category]++;
    });

    const categories = Object.keys(categoryMap).map((name) => ({
      name,
      slug: slugify(name),
      productCount: categoryMap[name],
    }));

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/categories/:slug - Get category details with products
router.get("/:slug", (req, res) => {
  try {
    const { slug } = req.params;
    const categoryName = slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    // Find products for this category
    const categoryProducts = products.filter(
      (p) => slugify(p.category) === slug
    );

    if (categoryProducts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const categoryData = {
      name: categoryProducts[0].category,
      slug,
      productCount: categoryProducts.length,
      products: categoryProducts,
    };

    res.status(200).json({
      success: true,
      data: categoryData,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

module.exports = router;

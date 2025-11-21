const express = require("express");
const router = express.Router();
const slugify = require("slugify");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");

// =======================================================
// GET /api/categories - Get all categories
// =======================================================
router.get("/", async (req, res, next) => {
  try {
    const { includeInactive = "false", includeSubcategories = "false" } = req.query;

    const query = {};
    if (includeInactive !== "true") query.isActive = true;

    let categoriesQuery = Category.find(query).sort({ displayOrder: 1, name: 1 }).lean();

    if (includeSubcategories === "true") {
      categoriesQuery = categoriesQuery.populate("subcategories");
    }

    const categories = await categoriesQuery;

    // Add product count
    const result = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({ category: cat._id });
        return { ...cat, productCount };
      })
    );

    res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// =======================================================
// GET /api/categories/:slug - Get category by slug
// =======================================================
router.get("/:slug", async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).populate("subcategories").lean();

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const productCount = await Product.countDocuments({ category: category._id });

    res.json({
      success: true,
      data: { ...category, productCount },
    });
  } catch (error) {
    next(error);
  }
});

// =======================================================
// POST /api/categories - Create category
// =======================================================
router.post("/", async (req, res, next) => {
  try {
    const { name, description, parentCategory, image, displayOrder, isActive = true } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    let level = 0;
    let parent = null;

    if (parentCategory) {
      parent = await Category.findById(parentCategory);
      if (!parent) {
        return res.status(400).json({ success: false, message: "Parent category not found" });
      }
      level = parent.level + 1;
    }

    const slug = slugify(name, { lower: true, strict: true });

    const category = await Category.create({
      name,
      slug,
      description,
      parentCategory: parent?._id || null,
      image,
      displayOrder,
      isActive,
      level,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// =======================================================
// PUT /api/categories/:id - Update category
// =======================================================
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    const { name, description, image, displayOrder, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Prevent changing slug or _id manually
    if (name && name !== category.name) {
      category.name = name;
      category.slug = slugify(name, { lower: true, strict: true });
    }
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// =======================================================
// DELETE /api/categories/:id - Delete category
// =======================================================
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with existing products",
      });
    }

    // Delete subcategories recursively
    await Category.deleteMany({ parentCategory: category._id });
    await category.deleteOne();

    res.json({
      success: true,
      message: "Category and its subcategories deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// =======================================================
// GET /api/categories/:id/products - Get products in category
// =======================================================
router.get("/:id/products", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, brand, minPrice, maxPrice } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    const query = { category: id };

    if (brand) query.brand = brand;
    if (minPrice) query.price = { ...query.price, $gte: Number(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: Number(maxPrice) };

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(query).populate("category", "name slug").skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
});

// =======================================================
// GET /api/categories/tree - Get hierarchical category structure
// =======================================================
router.get("/tree", async (req, res, next) => {
  try {
    const categories = await Category.getCategoryTree();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
let products = require('../data/products');
const { validateProduct, validateProductUpdate } = require('../middleware/validateProduct');
const { validateQueryParams } = require('../utils/validation');

// Helper: case-insensitive includes
const includesIgnoreCase = (str, keyword) =>
  str.toLowerCase().includes(keyword.toLowerCase());

// ========== GET /api/products - Get all products ==========
router.get('/', (req, res) => {
  // Validate query parameters
  const validation = validateQueryParams(req.query);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: validation.errors,
    });
  }

  let filteredProducts = [...products];

  // Destructure query parameters
  const {
    category,
    brand,
    minPrice,
    maxPrice,
    minRating,
    inStock,
    search,
    sort,
    limit = 10,
    page = 1,
  } = req.query;

  // ===== Filtering =====

  // Category filter
  if (category) {
    filteredProducts = filteredProducts.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Brand filter
  if (brand) {
    filteredProducts = filteredProducts.filter(
      (p) => p.brand?.toLowerCase() === brand.toLowerCase()
    );
  }

  // Price range
  if (minPrice) {
    filteredProducts = filteredProducts.filter(
      (p) => p.price >= parseFloat(minPrice)
    );
  }
  if (maxPrice) {
    filteredProducts = filteredProducts.filter(
      (p) => p.price <= parseFloat(maxPrice)
    );
  }

  // Minimum rating
  if (minRating) {
    filteredProducts = filteredProducts.filter(
      (p) => p.rating >= parseFloat(minRating)
    );
  }

  // In-stock filter
  if (inStock === 'true') {
    filteredProducts = filteredProducts.filter((p) => p.stock > 0);
  }
  if (inStock === 'false') {
    filteredProducts = filteredProducts.filter((p) => p.stock === 0);
  }

  // Search in name, description, or brand
  if (search) {
    filteredProducts = filteredProducts.filter(
      (p) =>
        includesIgnoreCase(p.name, search) ||
        includesIgnoreCase(p.description, search) ||
        includesIgnoreCase(p.brand || '', search)
    );
  }

  // ===== Sorting =====
  // sort=price → ascending
  // sort=-price → descending
  if (sort) {
    const sortField = sort.replace('-', '');
    const isDesc = sort.startsWith('-');

    filteredProducts.sort((a, b) => {
      if (sortField === 'price' || sortField === 'rating') {
        return isDesc
          ? b[sortField] - a[sortField]
          : a[sortField] - b[sortField];
      }
      if (sortField === 'name') {
        return isDesc
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name);
      }
      return 0;
    });
  } else {
    // Default: sort by descending price
    filteredProducts.sort((a, b) => b.price - a.price);
  }

  // ===== Pagination =====
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const start = (pageNum - 1) * limitNum;
  const end = start + limitNum;
  const paginated = filteredProducts.slice(start, end);

  // ===== Response =====
  res.json({
    success: true,
    total: filteredProducts.length,
    page: pageNum,
    limit: limitNum,
    data: paginated,
  });
});

// ========== GET /api/products/stats - Get product statistics ==========
router.get('/stats', (req, res) => {
    if (!products || products.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'No products available for statistics'
        });
    }

    const totalProducts = products.length;
    const prices = products.map(p => p.price);
    const totalValue = prices.reduce((acc, price) => acc + price, 0);
    const averagePrice = parseFloat((totalValue / totalProducts).toFixed(2));
    const priceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
    };

    // Calculate category breakdown
    const categoryMap = {};
    products.forEach(p => {
        if (!categoryMap[p.category]) {
            categoryMap[p.category] = { total: 0, count: 0 };
        }
        categoryMap[p.category].total += p.price;
        categoryMap[p.category].count += 1;
    });

    const categoryBreakdown = Object.entries(categoryMap).map(([category, info]) => ({
        category,
        count: info.count,
        averagePrice: parseFloat((info.total / info.count).toFixed(2))
    }));

    res.json({
        success: true,
        data: {
            totalProducts,
            averagePrice,
            totalValue: parseFloat(totalValue.toFixed(2)),
            categoryBreakdown,
            priceRange
        }
    });
});

// GET /api/products/featured
router.get("/featured", (req, res) => {
  try {
    // Filter products where featured === true
    const featuredProducts = products.filter((p) => p.featured === true).slice(0, 5);

    res.status(200).json({
      success: true,
      count: featuredProducts.length,
      data: featuredProducts,
    });
  } catch (error) {
    console.error("Error fetching featured products:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// GET /api/products/top-rated
router.get("/top-rated", (req, res) => {
  try {
    // Get limit from query string or default to 5
    const limit = parseInt(req.query.limit) || 5;

    // Sort by rating descending and take top N
    const topRatedProducts = [...products]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);

    res.status(200).json({
      success: true,
      data: topRatedProducts,
    });
  } catch (error) {
    console.error("Error fetching top-rated products:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ✅ GET /api/products/best-sellers
router.get("/best-sellers", (req, res) => {
  try {
    // Get limit from query params or default to 5
    const limit = parseInt(req.query.limit) || 5;

    // Sort by number of reviews (descending)
    const bestSellers = [...products]
      .sort((a, b) => b.numReviews - a.numReviews)
      .slice(0, limit);

    res.status(200).json({
      success: true,
      data: bestSellers,
    });
  } catch (error) {
    console.error("Error fetching best sellers:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ✅ GET /api/products/:id/related
router.get("/:id/related", (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    // Find the current product
    const currentProduct = products.find((p) => p.id === productId);
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Filter products with the same category, excluding the current product
    const relatedProducts = products
      .filter(
        (p) => p.category === currentProduct.category && p.id !== currentProduct.id
      )
      .slice(0, 4); // Limit to 4 products

    res.status(200).json({
      success: true,
      count: relatedProducts.length,
      data: relatedProducts,
    });
  } catch (error) {
    console.error("Error fetching related products:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ✅ GET /api/products/trending
router.get("/trending", (req, res) => {
  try {
    // Filter products that meet "trending" criteria
    const trendingProducts = products
      .filter(
        (p) =>
          p.rating >= 4.5 &&
          p.numReviews >= 100 &&
          p.quantity > 0
      )
      .slice(0, 8); // Limit to 8 products

    res.status(200).json({
      success: true,
      data: trendingProducts,
    });
  } catch (error) {
    console.error("Error fetching trending products:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ========== GET /api/products/:id - Get single product ==========
router.get('/:id', (req, res) => {
  const product = products.find((p) => p.id === parseInt(req.params.id));

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }

  res.json({
    success: true,
    data: product,
  });
});

// ========== POST /api/products - Create new product ==========
router.post('/', validateProduct, (req, res) => {
  
  // Create product
  const newProduct = {
    id: products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1,
    name: req.body.name.trim(),
    description: req.body.description?.trim() || '',
    price: parseFloat(req.body.price),
    category: req.body.category.trim(),
    stock: req.body.stock || 0,
    image: req.body.image || 'https://via.placeholder.com/300',
    rating: 0,
    numReviews: 0,
    brand: req.body.brand?.trim() || 'Unknown',
    features: req.body.features || [],
  };

  products.push(newProduct);

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: newProduct,
  });
});

// ========== PUT /api/products/:id - Update product ==========
router.put('/:id', validateProductUpdate, (req, res) => {
  const productIndex = products.findIndex(
    (p) => p.id === parseInt(req.params.id)
  );

  if (productIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }

  products[productIndex] = {
    ...products[productIndex],
    ...req.body,
    id: products[productIndex].id, // Don't allow ID change
  };

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: products[productIndex],
  });
});

// ========== DELETE /api/products/:id - Delete product ==========
router.delete('/:id', (req, res) => {
  const productIndex = products.findIndex(
    (p) => p.id === parseInt(req.params.id)
  );

  if (productIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }

  const deletedProduct = products.splice(productIndex, 1)[0];

  res.json({
    success: true,
    message: 'Product deleted successfully',
    data: deletedProduct,
  });
});

module.exports = router;

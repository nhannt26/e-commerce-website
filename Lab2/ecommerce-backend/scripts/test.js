const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Review = require('../models/Review');

const MONGO_URI = 'mongodb+srv://nhannt268:nhanmongo1020@cluster0.ymjvs1i.mongodb.net/ecommerce?retryWrites=true&w=majority'; // change if needed

(async () => {
  try {
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // ======================
    // Test Category Methods
    // ======================
    const rootCategories = await Category.getRootCategories();
    console.log('Root categories:', rootCategories);

    const electronics = await Category.findOne({ slug: 'electronics' });
    if (electronics) {
      const subcategories = await electronics.getSubcategories();
      console.log('Subcategories of Electronics:', subcategories);

      const products = await electronics.getAllProducts();
      console.log('Products in Electronics:', products);
    }

    // ======================
    // Test Product Methods
    // ======================
    const productId = '6901d6214e247e64de73205d'; // replace with real _id

    const product = await Product.findById(productId);
    if (product) {
      const available = product.checkAvailability(5);
      console.log('Available for 5 units:', available);

      await product.applyDiscount(20, new Date(), new Date('2025-12-31'));
      console.log('Applied discount successfully');

      const onSale = await Product.getOnSaleProducts();
      console.log('Products currently on sale:', onSale);
    }

    // ======================
    // Test Review Creation
    // ======================
    const review = await Review.create({
      product: productId,
      user: { name: 'John Doe', email: 'john@example.com' },
      rating: 5,
      title: 'Great product!',
      comment: 'This product exceeded my expectations...'
    });

    console.log('Review created:', review);

    const updatedProduct = await Product.findById(productId);
    console.log('New rating:', updatedProduct.rating);
    console.log('Number of reviews:', updatedProduct.numReviews);

    await mongoose.disconnect();
    console.log('✅ Tests completed and DB disconnected');
  } catch (error) {
    console.error('❌ Test failed:', error);
    await mongoose.disconnect();
  }
})();

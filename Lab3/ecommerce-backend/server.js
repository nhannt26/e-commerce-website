const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(express.json());

// Connect to Database
connectDB();

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const reviewRoutes = require('./routes/reviews');
const addressRoutes = require('./routes/addresses');
const wishlistRoutes = require('./routes/wishlist');
// const adminUserRoutes = require('./routes/admin/users');
const adminUserRoutes = require('./routes/admin/users');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/wishlist', wishlistRoutes);
// app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/users', adminUserRoutes);

// Home route
app.get('/', (req, res) => {
    res.json({
        message: 'E-commerce API with MongoDB',
        version: '2.0.0',
        database: 'Connected'
    });
});

// Error handlers
const { errorHandler, notFound } = require('./middleware/errorHandler');
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
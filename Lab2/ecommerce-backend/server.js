const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(express.json());

// Connect to Database
connectDB();

// Routes
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const reviewRoutes = require('./routes/reviews');

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);

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
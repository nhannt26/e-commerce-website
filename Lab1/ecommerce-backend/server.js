const express = require('express');
require('dotenv').config();
const { errorHandler, notFound } = require('./middleware/errorHandler');
const productRoutes = require('./routes/products');
const categoryRoutes = require("./routes/categories");

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);

// Home route
app.get('/', (req, res) => {
    res.json({
        message: 'E-commerce API',
        version: '1.0.0'
    });
});

// Error Handlers (must be LAST!)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
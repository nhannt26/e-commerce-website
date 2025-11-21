const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

// Middleware
app.use(express.json());

const cors = require('cors');

// Cấu hình CORS
app.use(cors({
    origin: 'http://localhost:5173',  // cho phép frontend
    credentials: true,                // cho phép gửi cookie/session nếu cần
}));

// Session middleware (BEFORE routes!)
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 7 * 24 * 60 * 60, // 7 days
        autoRemove: 'native'
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

// Connect to Database
connectDB();

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const reviewRoutes = require('./routes/reviews');
const addressRoutes = require('./routes/addresses');
const wishlistRoutes = require('./routes/wishlist');
const adminUserRoutes = require('./routes/admin/users');
const adminProductRoutes = require('./routes/admin/products');
const analyticsRoutes = require('./routes/admin/analytics');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminOrderRoutes = require('./routes/admin/orders');
const reportRoutes = require('./routes/admin/reports');
const paymentRoutes = require('./routes/payment');
const adminPaymentRoutes = require('./routes/admin/payment');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin/payment', adminPaymentRoutes);

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
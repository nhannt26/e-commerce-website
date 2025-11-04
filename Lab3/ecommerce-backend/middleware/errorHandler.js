// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error(err);
    
    // Validation Error
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: err.message,
            errors: err.errors
        });
    }
    
    // Not Found Error
    if (err.name === 'NotFoundError') {
        return res.status(404).json({
            success: false,
            message: err.message
        });
    }
    
    // Default Server Error
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// 404 Not Found handler
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

module.exports = { errorHandler, notFound };
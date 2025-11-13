const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Generate JWT token
const generateToken = (userId, role) => {
    const payload = {
        userId,
        role,
        iat: Date.now() // Issued at
    };
    
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRE
    });
};

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired. Please login again.');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token. Please login again.');
        }
        throw error;
    }
};

// Demo function
function demo() {
    console.log('\n🎫 JWT Token Demo\n');
    
    // Generate token for customer
    const customerToken = generateToken('507f1f77bcf86cd799439011', 'customer');
    console.log('Customer Token:');
    console.log(customerToken);
    console.log('\nToken Length:', customerToken.length);
    
    // Decode token (no verification)
    const decoded = jwt.decode(customerToken);
    console.log('\n📦 Token Payload:');
    console.log(decoded);
    
    // Verify token
    console.log('\n✅ Verifying token...');
    const verified = verifyToken(customerToken);
    console.log('Verified! User ID:', verified.userId);
    console.log('Role:', verified.role);
    console.log('Expires:', new Date(verified.exp * 1000).toLocaleString());
    
    // Test wrong secret
    console.log('\n❌ Testing with wrong secret...');
    try {
        jwt.verify(customerToken, 'wrong-secret');
    } catch (error) {
        console.log('Error:', error.message);
    }
}

module.exports = { generateToken, verifyToken };

// Run demo
if (require.main === module) {
    demo();
}
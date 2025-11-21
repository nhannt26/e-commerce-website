// VNPay IPN IP addresses
const VNPAY_IPS = [
    '113.52.45.78',
    '203.171.19.146',
    '203.171.19.147',
    '127.0.0.1', // For local testing
    '::1' // IPv6 localhost
];

exports.vnpayIPNWhitelist = (req, res, next) => {
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     '127.0.0.1';
    
    const ip = clientIP.split(',')[0].trim();
    
    // In development, allow all IPs
    if (process.env.NODE_ENV === 'development') {
        return next();
    }
    
    if (VNPAY_IPS.includes(ip)) {
        return next();
    }
    
    console.error(`Blocked IPN from unauthorized IP: ${ip}`);
    
    return res.status(403).json({
        RspCode: '99',
        Message: 'Unauthorized IP address'
    });
};
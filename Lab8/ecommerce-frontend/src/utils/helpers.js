// Format price in Vietnamese Dong
export const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);
};

// Calculate final price with discount
export const calculateFinalPrice = (price, discount) => {
  if (!discount) return price;
  return price * (1 - discount / 100);
};

// Format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('vi-VN');
};

// Get stock status
export const getStockStatus = (stock) => {
  if (stock === 0) return { text: 'Out of Stock', color: 'error' };
  if (stock < 10) return { text: `Only ${stock} left`, color: 'warning' };
  return { text: 'In Stock', color: 'success' };
};
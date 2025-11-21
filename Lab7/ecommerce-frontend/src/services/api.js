import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem("token");
          window.location.href = "/login";
          break;
        case 403:
          console.error("Access forbidden");
          break;
        case 404:
          console.error("Resource not found");
          break;
        case 500:
          console.error("Server error");
          break;
        default:
          console.error("An error occurred:", error.response.data.message);
      }
    } else if (error.request) {
      // Request made but no response
      console.error("Network error - no response received");
    } else {
      // Error in request setup
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// Product API endpoints
export const productAPI = {
  // GET /api/products
  getAll: (params) => api.get("/products", { params }),

  // GET /api/products/:id
  getById: (id) => api.get(`/products/${id}`),

  // GET /api/products/search?q=query
  search: (query) => api.get("/products/search", { params: { q: query } }),

  // GET /api/products/category/:categoryId
  // getByCategory: (categoryId, params) => api.get(`/products/category/${categoryId}`, { params }),
  getByCategory: (categoryId, params) => api.get("/products", { params: { category: categoryId, ...params } }),
};

// Category API endpoints
export const categoryAPI = {
  getAll: () => api.get("/categories"),
  getById: (id) => api.get(`/categories/${id}`),
};

// Cart API endpoints (will use later)
export const cartAPI = {
  getCart: () => api.get("/cart"),
  addItem: (productId, quantity) => api.post("/cart/add", { productId, quantity }),
  updateItem: (productId, quantity) => api.put(`/cart/update/${productId}`, { quantity }),
  removeItem: (productId) => api.delete(`/cart/remove/${productId}`),
  clearCart: () => api.delete("/cart/clear"),
};

// Auth API endpoints (will use later)
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  logout: () => api.post("/auth/logout"),
  getProfile: () => api.get("/auth/me"),
};

export const orderAPI = {
  create: (orderData) => api.post('/orders', orderData),
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  cancel: (id) => api.post(`/orders/${id}/cancel`)
};

export const paymentAPI = {
  create: (orderId) => api.post('/payment/create', { orderId }),
  getTransaction: (id) => api.get(`/payment/transaction/${id}`)
};

export default api;

import { createContext, useContext, useEffect, useReducer, useState } from "react";
import { cartAPI } from "../services/api";
import { toast } from "react-hot-toast";

// =======================
// Initial State
// =======================
const initialState = {
  items: [],
  pricing: {
    subtotal: 0,
    shipping: 0,
    discount: 0,
    total: 0,
  },
};

// =======================
// Reducer
// =======================
function cartReducer(state, action) {
  switch (action.type) {

    case "SET_CART":
      return action.payload;

    case "ADD_ITEM":
      return calculatePricing({
        ...state,
        items: [...state.items, action.payload],
      });

    case "UPDATE_ITEM":
      return calculatePricing({
        ...state,
        items: state.items.map((item) =>
          item.product._id === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      });

    case "REMOVE_ITEM":
      return calculatePricing({
        ...state,
        items: state.items.filter(
          (item) => item.product._id !== action.payload
        ),
      });

    case "CLEAR_CART":
      return calculatePricing({
        ...state,
        items: [],
      });

    default:
      return state;
  }
}

// =======================
// Pricing Calculation
// =======================
function calculatePricing(cart) {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const shipping = subtotal > 0 ? 30000 : 0; // Example: 30.000đ shipping
  const discount = 0; // Add discount logic later
  const total = subtotal + shipping - discount;

  return {
    ...cart,
    pricing: { subtotal, shipping, discount, total },
  };
}

// =======================
// Context
// =======================
const CartContext = createContext();
export const useCart = () => useContext(CartContext);

// =======================
// Provider
// =======================
export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState);
  const [loading, setLoading] = useState(false);

  // Total items count
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  // =======================
  // Load Cart from API
  // =======================
  const refreshCart = async () => {
    try {
      setLoading(true);
      const res = await cartAPI.getCart();
      dispatch({ type: "SET_CART", payload: calculatePricing(res.data.data) });
    } catch (err) {
      if (err.response?.status === 401) return; // Not logged in
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  // =======================
  // Methods
  // =======================

  const addToCart = async (productId, quantity = 1) => {
    try {
      setLoading(true);
      const res = await cartAPI.addToCart({ productId, quantity });

      dispatch({ type: "SET_CART", payload: calculatePricing(res.data.data) });
      toast.success("Added to cart!");
    } catch (err) {
      if (err.response?.status === 401) {
        return toast.error("Please log in first");
      }
      toast.error("Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      setLoading(true);
      const res = await cartAPI.updateItem({ productId, quantity });

      dispatch({ type: "SET_CART", payload: calculatePricing(res.data.data) });
    } catch (err) {
      if (err.response?.status === 401) {
        return toast.error("Please log in first");
      }
      toast.error("Failed to update quantity");
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId) => {
    try {
      setLoading(true);
      const res = await cartAPI.removeItem(productId);

      dispatch({ type: "SET_CART", payload: calculatePricing(res.data.data) });
      toast.info("Item removed");
    } catch (err) {
      if (err.response?.status === 401) {
        return toast.error("Please log in first");
      }
      toast.error("Failed to remove item");
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setLoading(true);
      await cartAPI.clearCart();

      dispatch({ type: "CLEAR_CART" });
      toast.info("Cart cleared");
    } catch (err) {
      if (err.response?.status === 401) {
        return toast.error("Please log in first");
      }
      toast.error("Failed to clear cart");
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // Provide Context
  // =======================
  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        itemCount,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

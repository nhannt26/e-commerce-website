import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---------------- CHECK AUTH ON LOAD ----------------
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await authAPI.getProfile();
      console.log(data);
      
      setUser(data.user);
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
    }

    setLoading(false);
  };

  // ---------------- LOGIN ----------------
  const login = async (credentials) => {
    try {
      const { data } = await authAPI.login(credentials);
      console.log(data);
      

      localStorage.setItem("token", data.token);
      setUser(data.user);

      toast.success("Login successful!");
      return data;
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
      throw error;
    }
  };

  // ---------------- REGISTER ----------------
  const register = async (userData) => {
    try {
      const { data } = await authAPI.register(userData);

      toast.success("Registration successful! Please login.");
      return data;
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed";
      toast.error(message);
      throw error;
    }
  };

  // ---------------- LOGOUT ----------------
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn("Logout request failed:", error);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      toast.success("Logged out successfully");
    }
  };

  // ---------------- CONTEXT VALUE ----------------
  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------- HOOK ----------------
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

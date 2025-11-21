import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  InputBase,
  Badge,
  Menu,
  MenuItem,
  Box,
  Container,
  Button,
} from "@mui/material";
import { Search as SearchIcon, ShoppingCart as CartIcon, AccountCircle } from "@mui/icons-material";
import { styled, alpha } from "@mui/material/styles";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext"; 

// ------------------- Styled Components -------------------
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(1),
    width: "auto",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    [theme.breakpoints.up("sm")]: {
      width: "20ch",
      "&:focus": {
        width: "30ch",
      },
    },
  },
}));

// ------------------- Component -------------------
export default function Navbar() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { itemCount } = useCart();
  const { user, isAuthenticated, logout, loading } = useAuth();
  if (loading) return null;

  const isMenuOpen = Boolean(anchorEl);

  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    setAnchorEl(null);
    navigate("/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/products?search=${searchQuery}`);
  };

  return (
    <AppBar position="sticky">
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          {/* Logo */}
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              mr: 2,
              display: "flex",
              fontWeight: 700,
              color: "inherit",
              textDecoration: "none",
            }}
          >
            🛍️ E-Commerce
          </Typography>

          {/* Navigation */}
          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
            <Button component={Link} to="/products" sx={{ color: "white" }}>
              Products
            </Button>
            <Button component={Link} to="/categories" sx={{ color: "white" }}>
              Categories
            </Button>
          </Box>

          {/* Search */}
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>

            <form onSubmit={handleSearch}>
              <StyledInputBase
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </Search>

          {/* Cart */}
          <IconButton size="large" color="inherit" component={Link} to="/cart" sx={{ ml: 2 }}>
            <Badge badgeContent={itemCount} color="error">
              <CartIcon />
            </Badge>
          </IconButton>

          {/* ------------------- AUTH SECTION ------------------- */}
          {isAuthenticated ? (
            <>
              {/* Show user's first name */}
              <Button color="inherit" onClick={handleProfileMenuOpen} sx={{ ml: 1, fontWeight: "bold" }}>
                {user?.fullName ? `Hi, ${user.fullName}` : <AccountCircle />}
              </Button>

              {/* Dropdown Menu */}
              <Menu
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem component={Link} to="/profile" onClick={handleMenuClose}>
                  Profile
                </MenuItem>

                <MenuItem component={Link} to="/orders" onClick={handleMenuClose}>
                  My Orders
                </MenuItem>

                {user?.role === "admin" && (
                  <MenuItem component={Link} to="/admin" onClick={handleMenuClose}>
                    Admin Dashboard
                  </MenuItem>
                )}

                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button component={Link} to="/login" sx={{ ml: 2 }} color="inherit">
                Login
              </Button>
              <Button component={Link} to="/register" sx={{ ml: 1 }} variant="outlined" color="inherit">
                Register
              </Button>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}

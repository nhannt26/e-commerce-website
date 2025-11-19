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
import { Search as SearchIcon, ShoppingCart as CartIcon, AccountCircle, Menu as MenuIcon } from "@mui/icons-material";
import { styled, alpha } from "@mui/material/styles";

// Styled search component
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

export default function Navbar() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get cart count from localStorage or context (will implement in next lab)
  const cartItemCount = 0;

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${searchQuery}`);
    }
  };

  const isMenuOpen = Boolean(anchorEl);

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

          {/* Navigation Links */}
          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
            <Button component={Link} to="/products" sx={{ my: 2, color: "white", display: "block" }}>
              Products
            </Button>
            <Button component={Link} to="/categories" sx={{ my: 2, color: "white", display: "block" }}>
              Categories
            </Button>
          </Box>

          {/* Search Bar */}
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

          {/* Cart Icon */}
          <IconButton size="large" color="inherit" component={Link} to="/cart" sx={{ ml: 2 }}>
            <Badge badgeContent={cartItemCount} color="error">
              <CartIcon />
            </Badge>
          </IconButton>

          {/* User Menu */}
          <IconButton size="large" edge="end" onClick={handleProfileMenuOpen} color="inherit">
            <AccountCircle />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={isMenuOpen}
            onClose={handleMenuClose}
          >
            <MenuItem component={Link} to="/profile" onClick={handleMenuClose}>
              Profile
            </MenuItem>
            <MenuItem component={Link} to="/orders" onClick={handleMenuClose}>
              My Orders
            </MenuItem>
            <MenuItem component={Link} to="/login" onClick={handleMenuClose}>
              Login
            </MenuItem>
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

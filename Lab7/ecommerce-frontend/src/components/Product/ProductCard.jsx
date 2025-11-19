import { useNavigate } from "react-router-dom";
import { Card, CardMedia, CardContent, CardActions, Typography, Button, Box, Chip, Rating } from "@mui/material";
import { ShoppingCart as CartIcon } from "@mui/icons-material";

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/products/${product._id}`);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    // Will implement in next lab
    console.log("Add to cart:", product._id);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const finalPrice = product.discount ? product.price * (1 - product.discount / 100) : product.price;

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 4,
        },
      }}
      onClick={handleCardClick}
    >
      {/* Product Image */}
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component="img"
          height="200"
          image={product.images?.[0] || "/placeholder.jpg"}
          alt={product.name}
          sx={{ objectFit: "cover" }}
        />

        {/* Discount Badge */}
        {product.discount > 0 && (
          <Chip
            label={`-${product.discount}%`}
            color="error"
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              fontWeight: "bold",
            }}
          />
        )}

        {/* Stock Badge */}
        {product.stock === 0 && (
          <Chip
            label="Out of Stock"
            color="default"
            size="small"
            sx={{
              position: "absolute",
              bottom: 8,
              left: 8,
            }}
          />
        )}
      </Box>

      {/* Product Info */}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          gutterBottom
          variant="h6"
          component="h2"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            minHeight: "3.6em",
          }}
        >
          {product.name}
        </Typography>

        {/* Rating */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Rating value={product.rating || 0} readOnly size="small" />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({product.numReviews || 0})
          </Typography>
        </Box>

        {/* Price */}
        <Box>
          {product.discount > 0 ? (
            <>
              <Typography variant="h6" color="error" component="span" sx={{ fontWeight: "bold" }}>
                {formatPrice(finalPrice)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                component="span"
                sx={{ ml: 1, textDecoration: "line-through" }}
              >
                {formatPrice(product.price)}
              </Typography>
            </>
          ) : (
            <Typography variant="h6" color="primary" sx={{ fontWeight: "bold" }}>
              {formatPrice(product.price)}
            </Typography>
          )}
        </Box>

        {/* Low Stock Warning */}
        {product.stock > 0 && product.stock < 10 && (
          <Typography variant="caption" color="error">
            Only {product.stock} left in stock!
          </Typography>
        )}
      </CardContent>

      {/* Actions */}
      <CardActions>
        <Button
          fullWidth
          variant="contained"
          startIcon={<CartIcon />}
          onClick={handleAddToCart}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
        </Button>
      </CardActions>
    </Card>
  );
}

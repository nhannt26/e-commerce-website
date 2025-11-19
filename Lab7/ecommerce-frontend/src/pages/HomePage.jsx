import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Box, Container, Typography, Button, Grid, Card, CardActionArea, CardMedia, CardContent } from "@mui/material";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products?limit=8");
        const data = await res.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error(error);
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error(error);
      }
    };

    fetchProducts();
    fetchCategories();
  }, []);

  return (
    <Box>
      {/* HERO SECTION */}
      <Box
        sx={{
          bgcolor: "primary.main",
          color: "white",
          textAlign: "center",
          py: 10,
          px: 2,
        }}
      >
        <Typography variant="h3" fontWeight="bold" mb={2}>
          Welcome to Our Store
        </Typography>

        <Typography variant="h6" mb={4}>
          Discover amazing products at the best prices.
        </Typography>

        <Button component={Link} to="/products" variant="contained" sx={{ bgcolor: "white", color: "primary.main" }}>
          Shop Now
        </Button>
      </Box>

      {/* FEATURED PRODUCTS */}
      <Container sx={{ py: 8 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight="bold">
            Featured Products
          </Typography>

          <Button component={Link} to="/products" variant="outlined">
            View All
          </Button>
        </Box>

        <Grid container spacing={3}>
          {products.map((product) => (
            <Grid size={{sx: 6, sm: 4, md: 3}} key={product._id}>
              <Card>
                <CardActionArea component={Link} to={`/products/${product._id}`}>
                  <CardMedia
                    component="img"
                    sx={{ height: 160, objectFit: "contain", p: 2 }}
                    image={product.image}
                    alt={product.name}
                  />

                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {product.name}
                    </Typography>
                    <Typography color="primary">${product.price?.toFixed(2)}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CATEGORIES GRID */}
      <Container sx={{ pb: 8 }}>
        <Typography variant="h5" fontWeight="bold" textAlign="center" mb={4}>
          Shop by Category
        </Typography>

        <Grid container spacing={3}>
          {categories.map((cat) => (
            <Grid size={{sx: 6, sm: 4, md: 3}} key={cat._id}>
              <Card
                sx={{
                  textAlign: "center",
                  p: 3,
                  cursor: "pointer",
                }}
                component={Link}
                to={`/category/${cat.slug}`}
              >
                <CardMedia
                  component="img"
                  image={cat.image}
                  alt={cat.name}
                  sx={{
                    width: 90,
                    height: 90,
                    objectFit: "cover",
                    borderRadius: "50%",
                    mx: "auto",
                    mb: 2,
                  }}
                />

                <Typography variant="subtitle1" fontWeight="bold">
                  {cat.name}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* VIEW ALL PRODUCTS CTA */}
      <Box textAlign="center" pb={10}>
        <Button component={Link} to="/products" variant="contained" size="large">
          View All Products
        </Button>
      </Box>
    </Box>
  );
}

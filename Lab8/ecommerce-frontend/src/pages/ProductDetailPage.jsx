import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { productAPI } from "../services/api";

import {
  Box,
  Grid,
  Typography,
  Button,
  Rating,
  TextField,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Chip,
  Stack,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";

export default function ProductDetailPage() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productAPI.getById(id);
      console.log(response.data);

      const product = response?.data?.data || response?.data;

      setProduct(product);

      if (product?.category?._id) {
        const relatedResponse = await productAPI.getByCategory(product.category._id, { limit: 4 });
        setRelatedProducts(relatedResponse?.data?.data || relatedResponse.data);
      } else {
        setRelatedProducts([]);
      }
    } catch (err) {
      console.error(err);
      setRelatedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <Box p={5}>
        <Typography>Loading...</Typography>
      </Box>
    );

  if (!product)
    return (
      <Box p={5}>
        <Typography>Product not found</Typography>
      </Box>
    );

  const {
    name,
    price,
    discountedPrice,
    discountPercent,
    stock,
    description,
    specifications = {},
    reviewsCount,
    rating,
    images = [],
  } = product;

  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock < 5;

  const increaseQty = () => setQuantity((q) => Math.min(q + 1, stock));
  const decreaseQty = () => setQuantity((q) => Math.max(q - 1, 1));

  const stockChipColor = isOutOfStock ? "error" : isLowStock ? "warning" : "success";

  return (
    <Box maxWidth="1200px" mx="auto" p={4}>
      <Grid container spacing={6}>
        {/* ---------------- LEFT COLUMN ---------------- */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardMedia component="img" image={selectedImage} alt={name} sx={{ height: 400, objectFit: "contain" }} />
          </Card>

          {/* Thumbnails */}
          <Stack direction="row" spacing={2} mt={2}>
            {images.map((img, i) => (
              <Card
                key={i}
                onClick={() => setSelectedImage(img)}
                sx={{
                  width: 80,
                  height: 80,
                  border: selectedImage === img ? "2px solid #1976d2" : "1px solid #ccc",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
              >
                <CardMedia component="img" image={img} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Card>
            ))}
          </Stack>
        </Grid>

        {/* ---------------- RIGHT COLUMN ---------------- */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h4" fontWeight="bold">
            {name}
          </Typography>

          {/* Rating */}
          <Stack direction="row" alignItems="center" spacing={1} mt={1}>
            <Rating value={rating} precision={0.1} readOnly />
            <Typography color="text.secondary">
              {rating.toFixed(1)} ({reviewsCount} reviews)
            </Typography>
          </Stack>

          {/* Price */}
          <Box mt={3}>
            {discountedPrice ? (
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h4" color="error" fontWeight="bold">
                  ${discountedPrice}
                </Typography>

                <Typography variant="h6" sx={{ textDecoration: "line-through", color: "gray" }}>
                  ${price}
                </Typography>

                {discountPercent > 0 && <Chip label={`-${discountPercent}%`} color="error" size="small" />}
              </Stack>
            ) : (
              <Typography variant="h4" fontWeight="bold">
                ${price}
              </Typography>
            )}
          </Box>

          {/* Stock status */}
          <Box mt={2}>
            <Chip
              label={isOutOfStock ? "Out of Stock" : isLowStock ? `Low Stock (${stock})` : `In Stock (${stock})`}
              color={stockChipColor}
              variant="filled"
            />
          </Box>

          {/* Quantity Selector */}
          <Stack direction="row" alignItems="center" spacing={2} mt={3}>
            <IconButton onClick={decreaseQty} disabled={quantity <= 1 || isOutOfStock}>
              <Remove />
            </IconButton>

            <TextField
              value={quantity}
              type="number"
              onChange={(e) => {
                const val = Math.max(1, Math.min(stock, Number(e.target.value)));
                setQuantity(val);
              }}
              disabled={isOutOfStock}
              inputProps={{ min: 1, max: stock, style: { textAlign: "center" } }}
              sx={{ width: 80 }}
            />

            <IconButton onClick={increaseQty} disabled={quantity >= stock || isOutOfStock}>
              <Add />
            </IconButton>
          </Stack>

          {/* Add to Cart */}
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={isOutOfStock}
            sx={{ mt: 3, py: 1.5, fontSize: "1rem" }}
          >
            Add to Cart
          </Button>

          {/* Description */}
          <Box mt={5}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Description
            </Typography>
            <Typography color="text.secondary" whiteSpace="pre-line">
              {description}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* ---------------- SPECIFICATIONS TABLE ---------------- */}
      {Object.keys(specifications).length > 0 && (
        <Box mt={8}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Specifications
          </Typography>

          <Table>
            <TableBody>
              {Object.entries(specifications).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell sx={{ fontWeight: "bold", textTransform: "capitalize" }}>
                    {key.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* ---------------- RELATED PRODUCTS ---------------- */}
      <Box mt={10}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Related Products
        </Typography>

        <Grid container spacing={3} mt={1}>
          {Array.isArray(relatedProducts) &&
            relatedProducts.map((rp) => (
              <Grid item xs={6} md={3} key={rp._id}>
                <Card sx={{ borderRadius: 3, cursor: "pointer" }}>
                  <CardMedia component="img" image={rp.thumbnail} height="160" sx={{ objectFit: "contain", p: 1 }} />
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {rp.name}
                    </Typography>
                    <Typography color="error" fontWeight="bold">
                      ${rp.discountedPrice || rp.price}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      </Box>
    </Box>
  );
}

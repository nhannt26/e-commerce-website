import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Grid,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination
} from '@mui/material';
import ProductList from '../components/Product/ProductList';
import { productAPI, categoryAPI } from '../services/api';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);

  // Get query params
  const page = parseInt(searchParams.get('page')) || 1;
  const category = searchParams.get('category') || '';
  const sortBy = searchParams.get('sort') || 'createdAt';
  const order = searchParams.get('order') || 'desc';
  const search = searchParams.get('search') || '';

  useEffect(() => {
    fetchProducts();
  }, [page, category, sortBy, order, search]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 12,
        sort: sortBy,
        order
      };

      if (category) params.category = category;
      if (search) params.search = search;

      const response = await productAPI.getAll(params);
      
      setProducts(response.data.data);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.data.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleCategoryChange = (event) => {
    setSearchParams({
      ...Object.fromEntries(searchParams),
      category: event.target.value,
      page: 1
    });
  };

  const handleSortChange = (event) => {
    const [newSort, newOrder] = event.target.value.split('-');
    setSearchParams({
      ...Object.fromEntries(searchParams),
      sort: newSort,
      order: newOrder,
      page: 1
    });
  };

  const handlePageChange = (event, value) => {
    setSearchParams({
      ...Object.fromEntries(searchParams),
      page: value
    });
    window.scrollTo(0, 0);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Products
        {search && ` - Search: "${search}"`}
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* Category Filter */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            label="Category"
            onChange={handleCategoryChange}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat._id} value={cat._id}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Sort Filter */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={`${sortBy}-${order}`}
            label="Sort By"
            onChange={handleSortChange}
          >
            <MenuItem value="createdAt-desc">Newest First</MenuItem>
            <MenuItem value="createdAt-asc">Oldest First</MenuItem>
            <MenuItem value="price-asc">Price: Low to High</MenuItem>
            <MenuItem value="price-desc">Price: High to Low</MenuItem>
            <MenuItem value="name-asc">Name: A to Z</MenuItem>
            <MenuItem value="name-desc">Name: Z to A</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Product Grid */}
      <ProductList products={products} loading={loading} error={error} />

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}
    </Container>
  );
}
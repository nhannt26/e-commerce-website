import { Box, Container, Grid, Typography, Link, IconButton } from "@mui/material";
import { Facebook, Instagram, Twitter, YouTube } from "@mui/icons-material";

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "primary.dark",
        color: "white",
        py: 6,
        mt: "auto",
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* About Section */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="h6" gutterBottom>
              About Us
            </Typography>
            <Typography variant="body2">Leading e-commerce platform in Vietnam. Shop with confidence!</Typography>
          </Grid>

          {/* Links Section */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Box>
              <Link href="/about" color="inherit" display="block" sx={{ mb: 1 }}>
                About
              </Link>
              <Link href="/contact" color="inherit" display="block" sx={{ mb: 1 }}>
                Contact
              </Link>
              <Link href="/terms" color="inherit" display="block" sx={{ mb: 1 }}>
                Terms of Service
              </Link>
              <Link href="/privacy" color="inherit" display="block">
                Privacy Policy
              </Link>
            </Box>
          </Grid>

          {/* Social Media Section */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="h6" gutterBottom>
              Follow Us
            </Typography>
            <Box>
              <IconButton color="inherit" aria-label="Facebook">
                <Facebook />
              </IconButton>
              <IconButton color="inherit" aria-label="Instagram">
                <Instagram />
              </IconButton>
              <IconButton color="inherit" aria-label="Twitter">
                <Twitter />
              </IconButton>
              <IconButton color="inherit" aria-label="YouTube">
                <YouTube />
              </IconButton>
            </Box>
          </Grid>
        </Grid>

        {/* Copyright */}
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="body2">© {new Date().getFullYear()} E-Commerce. All rights reserved.</Typography>
        </Box>
      </Container>
    </Box>
  );
}

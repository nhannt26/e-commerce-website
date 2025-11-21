import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";

// Replace these with your actual context hooks / API
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { orderAPI } from "../services/api"; // orderAPI.createOrder(orderData)

const steps = ["Shipping Information", "Payment Method", "Review Order"];

// Validation schema for shipping form
const shippingSchema = Yup.object().shape({
  firstName: Yup.string().required("First name is required"),
  lastName: Yup.string().required("Last name is required"),
  phone: Yup.string()
    .matches(/^[0-9]{10}$/, "Phone must be exactly 10 digits")
    .required("Phone is required"),
  address: Yup.string().required("Address is required"),
  city: Yup.string().required("City is required"),
  district: Yup.string().required("District is required"),
});

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal: cartSubtotal, shippingFee: cartShippingFee, clearCart } = useCart();
  const { user } = useAuth();

  // Stepper
  const [activeStep, setActiveStep] = useState(0);

  // Payment method state (default VNPay)
  const [paymentMethod, setPaymentMethod] = useState("vnpay");

  // Loading state when placing order
  const [placing, setPlacing] = useState(false);

  // React Hook Form for shipping step only (Option A)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    getValues,
    trigger,
  } = useForm({
    resolver: yupResolver(shippingSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: "",
      address: "",
      city: "",
      district: "",
    },
  });

  // If user object updates later, prefill form
  useEffect(() => {
    if (user) {
      reset((prev) => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Helpers for totals (fallback if CartContext doesn't provide)
  const subtotal =
    typeof cartSubtotal === "number"
      ? cartSubtotal
      : items.reduce((s, it) => s + (it.product.price || 0) * it.quantity, 0);
  const shippingFee = typeof cartShippingFee === "number" ? cartShippingFee : 30000; // fallback
  const total = subtotal + shippingFee;

  const currency = (n) => (typeof n === "number" ? n.toLocaleString("en-US") + "₫" : "0₫");

  // Navigation handlers
  const handleBack = () => setActiveStep((s) => Math.max(0, s - 1));

  // On Step1 submit: validate and go next
  const onSubmitShipping = async (data) => {
    // data is validated
    setActiveStep(1);
  };

  // When user clicks Next on step 2, ensure paymentMethod exists and go to review
  const handlePaymentNext = () => {
    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }
    setActiveStep(2);
  };

  // Place order handler
  const handlePlaceOrder = async () => {
    // Validate shipping again before place
    const valid = await trigger(); // triggers validation for shipping fields
    if (!valid) {
      // If shipping validation fails, go back to step 1
      setActiveStep(0);
      return;
    }

    setPlacing(true);
    const shippingValues = getValues(); // firstName, lastName, phone, address, city, district

    // Build order payload — adjust fields to match your backend schema
    const orderData = {
      shipping: {
        firstName: shippingValues.firstName,
        lastName: shippingValues.lastName,
        phone: shippingValues.phone,
        address: shippingValues.address,
        city: shippingValues.city,
        district: shippingValues.district,
      },
      paymentMethod, // "vnpay" | "cod" | "bank"
      items: items.map((it) => ({
        product: it.product._id,
        quantity: it.quantity,
        price: it.product.price,
      })),
      amounts: {
        subtotal,
        shipping: shippingFee,
        total,
      },
    };

    try {
      const res = await orderAPI.createOrder(orderData);
      // Expecting backend to return something like:
      // { success: true, orderId: "...", paymentUrl: "https://..." } for vnpay
      // or { success: true, orderId: "..." } for cod/bank

      if (paymentMethod === "vnpay" && res.paymentUrl) {
        // For VNPay redirect to paymentUrl
        window.location.href = res.paymentUrl;
        return;
      }

      // For COD or Bank Transfer: clear cart and redirect to a confirmation page
      clearCart();
      navigate(`/order-success/${res.orderId || ""}`);
    } catch (err) {
      console.error("Place order error:", err);
      alert(err?.message || "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // Renderers for each step
  const renderShippingStep = () => (
    <Box component="form" onSubmit={handleSubmit(onSubmitShipping)}>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          fullWidth
          label="First Name"
          {...register("firstName")}
          error={!!errors.firstName}
          helperText={errors.firstName?.message}
        />
        <TextField
          fullWidth
          label="Last Name"
          {...register("lastName")}
          error={!!errors.lastName}
          helperText={errors.lastName?.message}
        />
      </Box>

      <TextField
        fullWidth
        label="Phone"
        margin="normal"
        {...register("phone")}
        error={!!errors.phone}
        helperText={errors.phone?.message}
      />

      <TextField
        fullWidth
        label="Address"
        margin="normal"
        multiline
        rows={2}
        {...register("address")}
        error={!!errors.address}
        helperText={errors.address?.message}
      />

      <Box display="flex" gap={2} mt={2}>
        <TextField
          fullWidth
          label="City"
          {...register("city")}
          error={!!errors.city}
          helperText={errors.city?.message}
        />
        <TextField
          fullWidth
          label="District"
          {...register("district")}
          error={!!errors.district}
          helperText={errors.district?.message}
        />
      </Box>

      <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }} disabled={isSubmitting}>
        Next
      </Button>
    </Box>
  );

  const renderPaymentStep = () => (
    <Box>
      <Typography variant="h6" mb={2}>
        Select Payment Method
      </Typography>

      <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
        <FormControlLabel value="vnpay" control={<Radio />} label="VNPay (Bank transfer, credit / card)" />
        <FormControlLabel value="cod" control={<Radio />} label="Cash on Delivery (COD)" />
        <FormControlLabel value="bank" control={<Radio />} label="Bank Transfer" />
      </RadioGroup>

      <Box display="flex" gap={2} mt={3}>
        <Button variant="outlined" fullWidth onClick={handleBack}>
          Back
        </Button>
        <Button variant="contained" fullWidth onClick={handlePaymentNext}>
          Next
        </Button>
      </Box>
    </Box>
  );

  const renderReviewStep = () => {
    const shippingValues = getValues();

    return (
      <Box>
        <Typography variant="h6" mb={2}>
          Review Order
        </Typography>

        <Paper variant="outlined" sx={{ p: 2 }}>
          {items.length === 0 ? (
            <Typography>No items in cart.</Typography>
          ) : (
            items.map((item) => (
              <Box key={item.product._id} display="flex" justifyContent="space-between" mb={1}>
                <Typography>
                  {item.product.name} x {item.quantity}
                </Typography>
                <Typography>{((item.product.price || 0) * item.quantity).toLocaleString()}₫</Typography>
              </Box>
            ))
          )}

          <Divider sx={{ my: 2 }} />

          <Box display="flex" justifyContent="space-between">
            <Typography>Subtotal</Typography>
            <Typography>{currency(subtotal)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography>Shipping</Typography>
            <Typography>{currency(shippingFee)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography fontWeight="bold">Total</Typography>
            <Typography fontWeight="bold">{currency(total)}</Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1">Payment Method</Typography>
          <Typography mb={2}>
            {paymentMethod === "vnpay" ? "VNPay" : paymentMethod === "cod" ? "Cash on Delivery" : "Bank Transfer"}
          </Typography>

          <Typography variant="subtitle1">Shipping Address</Typography>
          <Typography>
            {shippingValues.firstName} {shippingValues.lastName}
          </Typography>
          <Typography>{shippingValues.phone}</Typography>
          <Typography>
            {shippingValues.address}, {shippingValues.district}, {shippingValues.city}
          </Typography>
        </Paper>

        <Box display="flex" gap={2} mt={3}>
          <Button variant="outlined" fullWidth onClick={handleBack}>
            Back
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={handlePlaceOrder}
            disabled={placing}
            startIcon={placing ? <CircularProgress size={18} /> : null}
          >
            {placing ? "Placing..." : "Place Order"}
          </Button>
        </Box>
      </Box>
    );
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderShippingStep();
      case 1:
        return renderPaymentStep();
      case 2:
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <Box maxWidth="800px" mx="auto" mt={6} mb={10} px={2}>
      <Typography variant="h4" fontWeight="bold" mb={4}>
        Checkout
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent()}
    </Box>
  );
}

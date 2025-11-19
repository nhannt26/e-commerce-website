// ✅ Valid categories list
const VALID_CATEGORIES = ["Electronics", "Clothing", "Home & Garden", "Sports"];

// ✅ Helper: check if category is valid
const isValidCategory = (category) => {
  return VALID_CATEGORIES.includes(category);
};

// ✅ Helper: check if URL is valid
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ✅ Main validation function
const validateProductData = (data, isUpdate = false) => {
  if (data == null || typeof data !== "object") {
    data = {};
  }
  const errors = [];

  // 🔹 Name validation
  if (!isUpdate || data.name !== undefined) {
    if (!data.name || data.name.trim() === "") {
      errors.push({ field: "name", message: "Name is required" });
    } else if (data.name.length < 3 || data.name.length > 100) {
      errors.push({ field: "name", message: "Name must be 3–100 characters" });
    } else if (!/^[a-zA-Z0-9\s\-]+$/.test(data.name)) {
      errors.push({ field: "name", message: "Name contains invalid characters" });
    }
  }

  // 🔹 Description validation
  if (!isUpdate || data.description !== undefined) {
    if (!data.description || data.description.trim() === "") {
      errors.push({ field: "description", message: "Description is required" });
    } else if (data.description.length < 20 || data.description.length > 500) {
      errors.push({ field: "description", message: "Description must be 20–500 characters" });
    }
  }

  // 🔹 Price validation
  if (!isUpdate || data.price !== undefined) {
    if (data.price === undefined || data.price === null || data.price === "") {
      errors.push({ field: "price", message: "Price is required" });
    } else if (typeof data.price !== "number" || isNaN(data.price)) {
      errors.push({ field: "price", message: "Price must be a number" });
    } else if (data.price < 0.01 || data.price > 10000) {
      errors.push({ field: "price", message: "Price must be between 0.01 and 10000" });
    }
  }

  // 🔹 Category validation
  if (!isUpdate || data.category !== undefined) {
    if (!data.category || data.category.trim() === "") {
      errors.push({ field: "category", message: "Category is required" });
    } else if (!isValidCategory(data.category)) {
      errors.push({ field: "category", message: "Invalid category" });
    }
  }

  // 🔹 Brand validation
  if (!isUpdate || data.brand !== undefined) {
    if (!data.brand || data.brand.trim() === "") {
      errors.push({ field: "brand", message: "Brand is required" });
    } else if (data.brand.length < 2 || data.brand.length > 50) {
      errors.push({ field: "brand", message: "Brand must be 2–50 characters" });
    }
  }

  // 🔹 Stock validation (optional)
  if (data.stock !== undefined) {
    if (!Number.isInteger(data.stock)) {
      errors.push({ field: "stock", message: "Stock must be an integer" });
    } else if (data.stock < 0 || data.stock > 1000) {
      errors.push({ field: "stock", message: "Stock must be between 0 and 1000" });
    }
  }

  // 🔹 Features validation (optional)
  if (data.features !== undefined) {
    if (!Array.isArray(data.features)) {
      errors.push({ field: "features", message: "Features must be an array" });
    } else {
      if (data.features.length < 1 || data.features.length > 10) {
        errors.push({ field: "features", message: "Features must contain 1–10 items" });
      } else {
        data.features.forEach((feature, index) => {
          if (typeof feature !== "string" || feature.length < 5 || feature.length > 100) {
            errors.push({
              field: `features[${index}]`,
              message: "Each feature must be 5–100 characters",
            });
          }
        });
      }
    }
  }

  // 🔹 Image validation (optional)
  if (data.image !== undefined && data.image !== null && data.image !== "") {
    if (!isValidUrl(data.image)) {
      errors.push({ field: "image", message: "Image must be a valid URL" });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateProductData,
  isValidCategory,
  isValidUrl,
  VALID_CATEGORIES,
};

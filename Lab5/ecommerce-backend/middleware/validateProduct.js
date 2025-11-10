const { validateProductData } = require('../utils/validation');

// For CREATE — all required fields must be present
const validateProduct = (req, res, next) => {
  const validation = validateProductData(req.body, false);

  if (!validation.isValid) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  next();
};

// For UPDATE — all fields optional, only validate provided ones
const validateProductUpdate = (req, res, next) => {
  const validation = validateProductData(req.body, true);

  if (!validation.isValid) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  next();
};

module.exports = { validateProduct, validateProductUpdate };

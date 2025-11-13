const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");

// ========== GET CART ==========
exports.getCart = async (req, res, next) => {
  try {
    let cart;

    // Get cart based on authentication
    if (req.user) {
      // Logged in user
      cart = await Cart.getCartForUser(req.user._id);
    } else {
      // Guest user
      if (!req.session.cartId) {
        req.session.cartId = req.sessionID;
      }
      cart = await Cart.getCartForSession(req.session.cartId);
    }

    // Populate product details
    await cart.populate();

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// ========== ADD ITEM TO CART ==========
exports.addItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const qty = parseInt(quantity) || 1;
    if (qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    // Get cart
    let cart;
    if (req.user) {
      cart = await Cart.getCartForUser(req.user._id);
    } else {
      if (!req.session.cartId) {
        req.session.cartId = req.sessionID;
      }
      cart = await Cart.getCartForSession(req.session.cartId);
    }

    // Add item
    await cart.addItem(productId, qty);

    // Populate and return
    await cart.populate();

    res.status(201).json({
      success: true,
      message: "Item added to cart",
      data: cart,
    });
  } catch (error) {
    // Handle specific errors
    if (
      error.message.includes("not found") ||
      error.message.includes("not available") ||
      error.message.includes("stock")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ========== UPDATE ITEM QUANTITY ==========
exports.updateItemQuantity = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid quantity is required",
      });
    }

    // Get cart
    let cart;
    if (req.user) {
      cart = await Cart.getCartForUser(req.user._id);
    } else {
      if (!req.session.cartId) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }
      cart = await Cart.getCartForSession(req.session.cartId);
    }

    // Update quantity
    await cart.updateItemQuantity(itemId, parseInt(quantity));

    // Populate and return
    await cart.populate();

    res.json({
      success: true,
      message: "Item quantity updated",
      data: cart,
    });
  } catch (error) {
    if (
      error.message.includes("not found") ||
      error.message.includes("stock")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ========== REMOVE ITEM FROM CART ==========
exports.removeItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    // Get cart
    let cart;
    if (req.user) {
      cart = await Cart.getCartForUser(req.user._id);
    } else {
      if (!req.session.cartId) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }
      cart = await Cart.getCartForSession(req.session.cartId);
    }

    // Remove item
    await cart.removeItem(itemId);

    // Populate and return
    await cart.populate();

    res.json({
      success: true,
      message: "Item removed from cart",
      data: cart,
    });
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ========== CLEAR CART ==========
exports.clearCart = async (req, res, next) => {
  try {
    // Get cart
    let cart;
    if (req.user) {
      cart = await Cart.getCartForUser(req.user._id);
    } else {
      if (!req.session.cartId) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }
      cart = await Cart.getCartForSession(req.session.cartId);
    }

    // Clear cart
    await cart.clearCart();

    res.json({
      success: true,
      message: "Cart cleared",
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// ========== MERGE CART ON LOGIN ==========
exports.mergeCart = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!req.session.cartId) {
      // No guest cart to merge
      const cart = await Cart.getCartForUser(req.user._id);
      await cart.populate();

      return res.json({
        success: true,
        message: "Using user cart",
        data: cart,
      });
    }

    // Merge guest cart with user cart
    const cart = await Cart.mergeGuestCart(req.session.cartId, req.user._id);
    await cart.populate();

    // Clear session cart ID
    delete req.session.cartId;

    res.json({
      success: true,
      message: "Carts merged successfully",
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/cart/summary
exports.getCartSummary = async (req, res, next) => {
  try {
    let cart;

    if (req.user) {
      cart = await Cart.getCartForUser(req.user._id);
    } else {
      if (!req.session.cartId) {
        return res.json({
          success: true,
          data: {
            itemCount: 0,
            subtotal: 0,
            total: 0,
          },
        });
      }
      cart = await Cart.getCartForSession(req.session.cartId);
    }

    res.json({
      success: true,
      data: {
        itemCount: cart.getItemCount(),
        subtotal: cart.totals.subtotal,
        total: cart.totals.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/cart/validate
exports.validateCart = async (req, res, next) => {
  try {
    // 🛒 Get the user's cart with product details
    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: "items.product",
      select: "name price stock isActive images",
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const errors = [];

    // 🧮 Validate each cart item
    for (const item of cart.items) {
      const product = item.product;

      if (!product) {
        errors.push(`Product not found (possibly deleted).`);
        continue;
      }

      // Inactive or removed
      if (product.isActive === false) {
        errors.push(`Product "${product.name}" is no longer available.`);
      }

      // Out of stock
      if (product.stock <= 0) {
        errors.push(`Product "${product.name}" is out of stock.`);
      }

      // Not enough quantity
      if (item.quantity > product.stock) {
        errors.push(
          `Not enough stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`
        );
      }
    }

    const isValid = errors.length === 0;

    // ✅ Response
    res.json({
      success: true,
      isValid,
      errors,
      cart,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/cart/check/:productId
exports.checkProduct = async (req, res, next) => {
    try {
        const { productId } = req.params;

        // 🛒 Get user's cart
        const cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            return res.json({
                success: true,
                inCart: false,
                quantity: 0
            });
        }

        // 🔍 Find product in cart items
        const item = cart.items.find(
            (i) => i.product.toString() === productId
        );

        // ✅ Response
        res.json({
            success: true,
            inCart: !!item,
            quantity: item ? item.quantity : 0
        });

    } catch (error) {
        next(error);
    }
};

// POST /api/cart/recover - Recover abandoned cart
exports.recoverCart = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Login required to recover cart'
            });
        }
        
        // Find user's most recent cart
        const cart = await Cart.findOne({ user: req.user._id })
            .sort({ updatedAt: -1 })
            .populate('items.product');
        
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'No cart found'
            });
        }
        
        // Validate cart items still available
        const validation = await cart.validateCart();
        
        res.json({
            success: true,
            message: 'Cart recovered',
            data: cart,
            validation: validation
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/cart/save-for-later/:itemId
exports.saveForLater = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Login required'
            });
        }
        
        // Get cart
        const cart = await Cart.getCartForUser(req.user._id);
        const item = cart.items.id(itemId);
        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }
        
        // Add to user's wishlist
        const user = await User.findById(req.user._id);
        
        if (!user.wishlist.includes(item.product)) {
            user.wishlist.push(item.product);
            await user.save();
        }
        
        // Remove from cart
        await cart.removeItem(itemId);
        
        res.json({
            success: true,
            message: 'Item saved for later',
            data: {
                cart: cart,
                wishlistCount: user.wishlist.length
            }
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/cart/move-to-cart/:productId - Move from wishlist to cart
exports.moveToCart = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Login required'
            });
        }
        
        // Remove from wishlist
        const user = await User.findById(req.user._id);
        user.wishlist.pull(productId);
        await user.save();
        
        // Add to cart
        const cart = await Cart.getCartForUser(req.user._id);
        await cart.addItem(productId, quantity || 1);
        await cart.populate();
        
        res.json({
            success: true,
            message: 'Item moved to cart',
            data: cart
        });
    } catch (error) {
        next(error);
    }
};

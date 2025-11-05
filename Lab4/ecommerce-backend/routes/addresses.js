const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// All routes require authentication
router.use(protect);

// GET /api/addresses
router.get('/', protect, async (req, res) => {
    try {
        // Fetch the full user document (in case protect only adds user ID)
        const user = await User.findById(req.user.id).select('addresses');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            count: user.addresses.length,
            data: user.addresses
        });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while retrieving addresses'
        });
    }
});

// POST /api/addresses
router.post('/', protect, async (req, res, next) => {
    try {
        const { fullName, phone, street, city, state, zipCode, country, isDefault } = req.body;

        // 1️⃣ Validate required fields
        if (!fullName || !phone || !street || !city || !country) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: fullName, phone, street, city, and country are required.'
            });
        }

        // 2️⃣ Find user in DB
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 3️⃣ If isDefault = true, unset others
        if (isDefault) {
            user.addresses.forEach(addr => (addr.isDefault = false));
        }

        // 4️⃣ Add new address
        const newAddress = {
            fullName,
            phone,
            street,
            city,
            state,
            zipCode,
            country,
            isDefault: !!isDefault
        };

        user.addresses.push(newAddress);
        await user.save();

        // 5️⃣ Get the last added address
        const savedAddress = user.addresses[user.addresses.length - 1];

        // 6️⃣ Respond with success
        res.status(201).json({
            success: true,
            message: 'Address added successfully',
            data: savedAddress
        });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding address'
        });
    }
});

// PUT /api/addresses/:addressId
router.put('/:addressId', protect, async (req, res, next) => {
    try {
        const { addressId } = req.params;
        const updates = req.body;

        // 1️⃣ Find user in DB
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 2️⃣ Find the address inside user.addresses
        const address = user.addresses.id(addressId);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        // 3️⃣ Handle isDefault logic — if setting to true, unset others
        if (updates.isDefault === true) {
            user.addresses.forEach(addr => (addr.isDefault = false));
        }

        // 4️⃣ Update the address fields
        Object.keys(updates).forEach(key => {
            address[key] = updates[key];
        });

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Address updated successfully',
            data: address
        });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating address'
        });
    }
});

// DELETE /api/addresses/:addressId
router.delete('/:addressId', protect, async (req, res, next) => {
    try {
        const { addressId } = req.params;

        // 1️⃣ Find user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 2️⃣ Check if user has at least one address
        if (user.addresses.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No addresses to delete'
            });
        }

        // 3️⃣ Prevent deleting if it's the only address
        if (user.addresses.length === 1) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete the only address'
            });
        }

        // 4️⃣ Find address to delete
        const address = user.addresses.id(addressId);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        const wasDefault = address.isDefault;

        // 5️⃣ Remove the address
        address.remove();

        // 6️⃣ If deleted address was default → make the first remaining address default
        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        // 7️⃣ Save user
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Address deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting address'
        });
    }
});

// PATCH /api/addresses/:addressId/set-default
router.patch('/:addressId/set-default', protect, async (req, res, next) => {
    try {
        const { addressId } = req.params;

        // 1️⃣ Find user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 2️⃣ Find target address
        const address = user.addresses.id(addressId);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        // 3️⃣ Unset all isDefault flags
        user.addresses.forEach(addr => (addr.isDefault = false));

        // 4️⃣ Set selected address as default
        address.isDefault = true;

        // 5️⃣ Save user
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Default address updated successfully',
            data: address
        });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while setting default address'
        });
    }
});

module.exports = router;
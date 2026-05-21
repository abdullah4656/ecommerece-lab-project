const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

function wantsJson(req) {
  const accept = req.headers.accept || '';
  return req.xhr || accept.includes('application/json');
}

router.get('/', async (req, res) => {
  try {
    const cart = req.session.cart || [];
    const cartItems = [];
    let total = 0;

    for (let i = 0; i < cart.length; i += 1) {
      const item = cart[i];
      const product = await Product.findById(item.productId);
      if (product) {
        const itemTotal = product.price * item.quantity;
        total += itemTotal;
        cartItems.push({ product, quantity: item.quantity, itemTotal, itemIndex: i, selectedFlavours: item.selectedFlavours || [], scoopCount: Number(item.scoopCount) || 0 });
      }
    }

    res.render('cart', {
      title: 'Your Cart | Coat and Craft',
      cartItems,
      subtotal: total,
      tax: total * 0.08,
      shipping: total > 0 ? 5.99 : 0,
      total: total + (total * 0.08) + (total > 0 ? 5.99 : 0)
    });
  } catch (error) {
    console.error('Error loading cart:', error);
    res.status(500).render('404', {
      title: 'Error | Coat and Craft'
    });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { productId, quantity = 1, scoopCount = 0 } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const cart = req.session.cart || [];
    const selectedFlavoursRaw = req.body.selectedFlavours;
    const selectedFlavours = Array.isArray(selectedFlavoursRaw)
      ? selectedFlavoursRaw.map((item) => String(item).trim()).filter(Boolean)
      : String(selectedFlavoursRaw || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

    const normalizedScoopCount = Number(scoopCount) || selectedFlavours.length || 0;
    const cartItemKey = JSON.stringify({
      productId,
      selectedFlavours: [...selectedFlavours].sort(),
      scoopCount: normalizedScoopCount
    });

    const existingItemIndex = cart.findIndex((item) => {
      const itemKey = JSON.stringify({
        productId: item.productId.toString(),
        selectedFlavours: [...(item.selectedFlavours || [])].sort(),
        scoopCount: Number(item.scoopCount) || 0
      });
      return itemKey === cartItemKey;
    });

    if (existingItemIndex > -1) {
      cart[existingItemIndex].quantity += parseInt(quantity, 10);
    } else {
      cart.push({
        productId,
        quantity: parseInt(quantity, 10),
        selectedFlavours,
        scoopCount: normalizedScoopCount
      });
    }

    req.session.cart = cart;
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    // After adding item to cart
res.redirect('/cart');
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

router.post('/update', (req, res) => {
  try {
    const { productId, quantity, itemIndex } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    const cart = req.session.cart || [];
    const resolvedIndex = Number.isInteger(Number(itemIndex))
      ? Number(itemIndex)
      : cart.findIndex(item => item.productId.toString() === String(productId));

    if (resolvedIndex > -1 && resolvedIndex < cart.length) {
      if (parseInt(quantity, 10) <= 0) {
        cart.splice(resolvedIndex, 1);
      } else {
        cart[resolvedIndex].quantity = parseInt(quantity, 10);
      }
    }

    req.session.cart = cart;
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (wantsJson(req)) {
      return res.json({ success: true, cartCount });
    }
    res.redirect('/cart');
  } catch (error) {
    console.error('Error updating cart:', error);
    if (wantsJson(req)) {
      return res.status(500).json({ error: 'Failed to update cart' });
    }
    res.status(500).redirect('/cart');
  }
});

router.post('/remove', (req, res) => {
  try {
    const { productId, itemIndex } = req.body;

    const cart = req.session.cart || [];
    const resolvedIndex = Number.isInteger(Number(itemIndex))
      ? Number(itemIndex)
      : cart.findIndex(item => item.productId.toString() === String(productId));

    if (resolvedIndex > -1 && resolvedIndex < cart.length) {
      cart.splice(resolvedIndex, 1);
    }

    req.session.cart = cart;
    const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (wantsJson(req)) {
      return res.json({ success: true, cartCount });
    }
    res.redirect('/cart');
  } catch (error) {
    console.error('Error removing from cart:', error);
    if (wantsJson(req)) {
      return res.status(500).json({ error: 'Failed to remove item from cart' });
    }
    res.status(500).redirect('/cart');
  }
});

router.post('/clear', (req, res) => {
  req.session.cart = [];
  if (wantsJson(req)) {
    return res.json({ success: true, cartCount: 0 });
  }
  res.redirect('/cart');
});

module.exports = router;
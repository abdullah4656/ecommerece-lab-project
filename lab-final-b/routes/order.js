const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const applyDiscount = require('../middleware/applyDiscount');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function buildOrderContext(req, res, next) {
  try {
    const cart = req.session.cart || [];
    const cartItems = [];
    let subtotal = 0;

    for (const item of cart) {
      const product = await Product.findById(item.productId);
      if (product) {
        const lineTotal = product.price * item.quantity;
        subtotal += lineTotal;
        cartItems.push({
          product,
          quantity: item.quantity,
          lineTotal,
          selectedFlavours: Array.isArray(item.selectedFlavours) ? item.selectedFlavours : [],
          scoopCount: Number(item.scoopCount) || 0
        });
      }
    }

    if (cartItems.length === 0) {
      return res.redirect('/cart');
    }

    const tax = subtotal * 0.08;
    const shipping = subtotal > 0 ? 5.99 : 0;

    req.order = {
      cartItems,
      customer: {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address
      },
      plan: req.body.plan === 'subscription' ? 'subscription' : 'one-time'
    };

    req.orderTotals = {
      subtotal,
      tax,
      shipping,
      baseTotal: subtotal + tax + shipping
    };

    next();
  } catch (error) {
    console.error('Error building order context:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
}

router.post('/preview', requireAuth, buildOrderContext, applyDiscount, (req, res) => {
  req.session.pendingOrder = {
    customer: req.order.customer,
    plan: req.order.plan,
    cartItems: req.order.cartItems.map(item => ({
      productId: item.product._id.toString(),
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      image: item.product.image,
      selectedFlavours: item.selectedFlavours,
      scoopCount: item.scoopCount
    })),
    totals: req.orderTotals,
    coupon: req.appliedCoupon || null
  };

  res.render('order-preview', {
    title: 'Order Preview | ScoopCraft',
    cartItems: req.order.cartItems,
    customer: req.order.customer,
    plan: req.order.plan,
    subtotal: req.orderTotals.subtotal,
    tax: req.orderTotals.tax,
    shipping: req.orderTotals.shipping,
    discount: req.orderTotals.discount,
    total: req.orderTotals.finalTotal,
    coupon: req.appliedCoupon || null
  });
});

router.post('/confirm', requireAuth, async (req, res) => {
  try {
    const pending = req.session.pendingOrder;
    const user = await User.findById(req.session.userId);

    if (!pending || !pending.cartItems || pending.cartItems.length === 0) {
      return res.redirect('/cart');
    }

    const items = pending.cartItems.map(item => ({
      product: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal
    }));

    const order = new Order({
      user: req.session.userId,
      customer: pending.customer,
      items,
      subtotal: pending.totals.subtotal,
      tax: pending.totals.tax,
      shipping: pending.totals.shipping,
      discount: pending.totals.discount || 0,
      total: pending.totals.finalTotal,
      plan: pending.plan || 'one-time',
      couponCode: pending.coupon || null,
      status: 'Placed',
      trackingHistory: [
        {
          status: 'Placed',
          note: `Order placed by ${user?.name || pending.customer.name}`,
          updatedAt: new Date()
        }
      ]
    });

    order.items = pending.cartItems.map(item => ({
      product: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      selectedFlavours: item.selectedFlavours || [],
      scoopCount: item.scoopCount || 0
    }));

    if (user) {
      user.phone = (pending.customer.phone || '').trim();
      user.address = (pending.customer.address || '').trim();
      await user.save();
    }

    await order.save();
    req.session.cart = [];
    req.session.pendingOrder = null;

    res.redirect(`/order/success/${order._id}`);
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/success/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).render('404', {
        title: 'Order Not Found | ScoopCraft'
      });
    }

    res.render('order-success', {
      title: 'Order Placed | ScoopCraft',
      order
    });
  } catch (error) {
    console.error('Error loading order success page:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

module.exports = router;



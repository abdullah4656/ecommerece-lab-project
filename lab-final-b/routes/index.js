const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const CustomOrder = require('../models/CustomOrder'); // Add this model
const { requireAuth } = require('../middleware/auth');

function extractFlavourHighlights(products) {
  const seen = new Set();
  const highlights = [];

  for (const product of products) {
    for (const flavour of product.flavourOptions || []) {
      const key = String(flavour.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      highlights.push({
        name: flavour.name,
        note: flavour.note || 'Signature scoop profile',
        color: flavour.color || '#ffe5c2'
      });

      if (highlights.length >= 10) {
        return highlights;
      }
    }
  }

  return highlights;
}

async function buildCartSummary(sessionCart) {
  const cart = Array.isArray(sessionCart) ? sessionCart : [];
  const cartItems = [];
  let subtotal = 0;

  for (const item of cart) {
    const product = await Product.findById(item.productId).lean();
    if (!product || !product.isActive) {
      continue;
    }

    const quantity = Number(item.quantity) || 1;
    const itemTotal = product.price * quantity;
    subtotal += itemTotal;
    cartItems.push({
      product,
      quantity,
      itemTotal,
      selectedFlavours: Array.isArray(item.selectedFlavours) ? item.selectedFlavours : [],
      scoopCount: Number(item.scoopCount) || 0
    });
  }

  const tax = subtotal * 0.08;
  const shipping = subtotal > 0 ? 5.99 : 0;
  return {
    cartItems,
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping
  };
}

router.get('/', async (req, res) => {
  try {
    const featuredProducts = await Product.find({ isActive: true }).sort({ createdAt: -1 }).limit(8).lean();
    const highlights = extractFlavourHighlights(featuredProducts);
    const signatureStack = highlights.slice(0, 3).map((item) => item.name).join(' + ');

    res.render('home', {
      title: 'Coat and Craft',
      flavours: highlights,
      featuredProducts,
      totalFlavours: highlights.length,
      totalProducts: featuredProducts.length,
      signatureStack
    });
  } catch (error) {
    console.error('Error loading home:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/products', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const query = { isActive: true };

    if (q) {
      query.$or = [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { 'flavourOptions.name': new RegExp(q, 'i') }
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 }).lean();

    res.render('products', {
      title: 'Browse Custom Pints | ScoopCraft',
      products,
      q
    });
  } catch (error) {
    console.error('Error loading products:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product || !product.isActive) {
      return res.status(404).render('404', {
        title: 'Product Not Found | ScoopCraft'
      });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      isActive: true,
      category: product.category
    })
      .limit(4)
      .lean();

    let isWishlisted = false;
    if (req.session.userId) {
      const user = await User.findById(req.session.userId).select('wishlist').lean();
      isWishlisted = (user?.wishlist || []).some(
        item => item.product && item.product.toString() === String(product._id)
      );
    }

    if (product.seoTitle || product.seoDescription || product.seoKeywords || product.metaRobots || product.canonicalUrl) {
      res.locals.seo = {
        ...res.locals.seo,
        metaDescription: product.seoDescription || res.locals.seo.metaDescription,
        metaKeywords: product.seoKeywords || res.locals.seo.metaKeywords,
        robots: product.metaRobots || res.locals.seo.robots,
        currentUrl: product.canonicalUrl || res.locals.seo.currentUrl
      };
    }

    res.render('product-detail', {
      title: product.seoTitle || `${product.name} | ScoopCraft`,
      product,
      relatedProducts,
      isWishlisted
    });
  } catch (error) {
    console.error('Error loading product detail:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/checkout', requireAuth, async (req, res) => {
  try {
    const summary = await buildCartSummary(req.session.cart);
    if (!summary.cartItems.length) {
      return res.redirect('/cart');
    }

    const user = await User.findById(req.session.userId).lean();
    res.render('checkout', {
      title: 'Checkout | ScoopCraft',
      cartItems: summary.cartItems,
      subtotal: summary.subtotal,
      tax: summary.tax,
      shipping: summary.shipping,
      total: summary.total,
      profile: {
        name: user?.name || req.session.currentUser?.name || '',
        email: user?.email || req.session.currentUser?.email || '',
        phone: user?.phone || '',
        address: user?.address || ''
      }
    });
  } catch (error) {
    console.error('Error loading checkout:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/my-orders', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.session.userId }).sort({ createdAt: -1 }).lean();
    res.render('my-orders', {
      title: 'My Orders | ScoopCraft',
      orders,
      email: req.session.currentUser?.email || ''
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

// =============================================
// CUSTOM COAT BUILDER ROUTES (STANDALONE)
// =============================================

// Main custom coat builder page
router.get('/custom-coat', (req, res) => {
  res.render('custom-coat-builder', {
    title: 'Custom Coat Builder | ScoopCraft',
    currentUser: req.session.currentUser || null
  });
});

// Handle custom coat form submission
router.post('/custom-coat/submit', async (req, res) => {
  try {
    const {
      interiorConstruction,
      pockets,
      shoulderPads,
      chopped,
      innerLining,
      stitchingStyle,
      initials,
      fontStyle
    } = req.body;

    // Create new custom order
    const customOrder = new CustomOrder({
      userId: req.session.userId || null,
      customerEmail: req.session.currentUser?.email || null,
      customerName: req.session.currentUser?.name || null,
      customization: {
        interiorConstruction,
        pockets,
        shoulderPads,
        chopped,
        innerLining,
        stitchingStyle,
        initials: initials || null,
        fontStyle: fontStyle || 'Classic'
      },
      status: 'pending',
      createdAt: new Date()
    });

    await customOrder.save();

    // Set success message (if using flash messages)
    if (req.flash) {
      req.flash('success', 'Your custom coat request has been submitted! We will contact you within 24 hours.');
    }

    res.redirect('/custom-coat/success');
  } catch (error) {
    console.error('Error submitting custom coat:', error);
    if (req.flash) {
      req.flash('error', 'Something went wrong. Please try again.');
    }
    res.redirect('/custom-coat');
  }
});

// Success page after custom coat submission
router.get('/custom-coat/success', (req, res) => {
  res.render('custom-coat-success', {
    title: 'Order Submitted | ScoopCraft',
    currentUser: req.session.currentUser || null
  });
});

// Keep your existing route
router.get('/customizedproduct', (req, res) => {
  res.render('customizedproduct', {
    title: 'Customized Product'
  });
});

router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Us '
  });
});

router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us | ScoopCraft'
  });
});

module.exports = router;
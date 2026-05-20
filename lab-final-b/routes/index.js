const express = require('express');
const https = require('https');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const CustomOrder = require('../models/CustomOrder');
const Blog = require('../models/Blog');
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

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function callOpenAI(messages) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return reject(new Error('OpenAI API key is not configured.'));
    }

    const payload = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.8,
      max_tokens: 500
    });

    const req = https.request('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const body = JSON.parse(data);
            resolve(body.choices?.[0]?.message?.content || '');
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`OpenAI request failed: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function localChatAnswer(question) {
  const normalized = String(question || '').toLowerCase();

  if (!normalized) {
    return 'Hi there! Ask me about products, personalization, orders, shipping, returns, SEO, or blogs.';
  }

  if (/(hello|hi|hey|good morning|good evening|greetings)/i.test(normalized)) {
    return 'Hello! I can help with product details, customization, shipping, orders, returns, blogs, SEO, and store support. Ask me anything.';
  }

  if (/(thanks|thank you|thx|thanku)/i.test(normalized)) {
    return 'You are welcome! Ask me another question if you need more help.';
  }

  if (/(size|fit|measurement|measurements|small|medium|large|slim fit|regular fit|oversized)/i.test(normalized)) {
    return 'We offer standard and custom sizing, including tailored fits for coats and jackets. Check the product page for size charts, or ask me about the exact style you want.';
  }

  if (/(customi[zs]e|personalize|personalisation|monogram|embroider|design|style|unique|custom|tailored)/i.test(normalized)) {
    return 'You can personalize your coat with initials, embroidery, premium fabrics, lining colors, and special details. Tell me what look you want and I can suggest a custom style.';
  }

  if (/(shipping|delivery|arrive|estimate|time|ship|shipping cost)/i.test(normalized)) {
    return 'Shipping costs are shown at checkout and may vary by location. We aim to process orders quickly so your coat arrives as soon as possible.';
  }

  if (/(return|exchange|refund|policy|warranty|cancel|return policy)/i.test(normalized)) {
    return 'Our return and exchange terms vary by product. Most ready-to-wear items can be returned, while fully customized orders may be final sale. Ask me about your order or item type.';
  }

  if (/(order|track|tracking|status|my orders|order history|purchase)/i.test(normalized)) {
    return 'You can check your order status in My Orders after signing in. If you need help locating an order, describe the product or order number.';
  }

  if (/(cart|checkout|payment|coupon|discount|promo|voucher|apply code)/i.test(normalized)) {
    return 'Use the cart to gather items, then proceed to checkout. If you have a coupon code, enter it on the checkout page to apply savings.';
  }

  if (/(stock|available|inventory|sold out|back in stock)/i.test(normalized)) {
    return 'Stock is shown on each product page. If it is available, you can add it directly to the cart. For sold-out items, check back later or contact support.';
  }

  if (/(blog|article|post|write a blog|blog idea|blog topic|content)/i.test(normalized)) {
    return 'Visit the Blog page to read our latest posts. If you want a blog idea or title, ask me for a topic and I can suggest one.';
  }

  if (/(seo|search engine|google|meta title|meta description|keywords|seo title|seo description)/i.test(normalized)) {
    return 'For SEO, use a clear product title, a concise description under 160 characters, and keyword phrases about the item. Ask me for product-specific SEO if you want.';
  }

  if (/(about|contact|help|support|customer service|questions)/i.test(normalized)) {
    return 'You can contact us via the Contact page. I can also answer questions about the store, products, or how to complete your order.';
  }

  if (/(price|cost|how much|expensive|cheap|sale|offer|pricing|range)/i.test(normalized)) {
    return 'Base coat prices usually start around $150–$250, with premium customizations adding more. If you tell me the style or fabric you want, I can suggest a good price range.';
  }

  if (/(suggest|recommend|best|good|ideal).*(coat|jacket|overcoat|suit|product)|what.*best.*(coat|jacket|suit|overcoat)|which.*(coat|jacket|suit)/i.test(normalized)) {
    return 'Popular choices include classic wool overcoats for cold weather, modern single-breasted coats for daily wear, and tailored suit jackets for formal events. I can recommend the best product based on your occasion.';
  }

  if (/(gift|gift wrap|present|special packaging)/i.test(normalized)) {
    return 'We can help with gift ideas and packaging. Ask me about gift options or how to send a product as a gift.';
  }

  if (/(materials|fabric|quality|premium|wool|leather|cotton)/i.test(normalized)) {
    return 'Our products use quality materials. Ask me which fabric or finish is best for your style, weather, or comfort needs.';
  }

  if (/(faq|questions|frequently asked)/i.test(normalized)) {
    return 'Ask me any question about ordering, shipping, returns, customization, or product details and I will answer it.';
  }

  return 'I am a local assistant that can help with product details, personalization, orders, shipping, returns, blogs, SEO, and store support. Please ask about a specific item or topic.';
}

async function getAiChatAnswer(question) {
  const trimmed = String(question || '').trim();
  if (!trimmed) {
    return localChatAnswer('');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return localChatAnswer(trimmed);
  }

  try {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI assistant for a boutique custom coat and specialty product storefront. Reply concisely and helpfully in a friendly tone.'
      },
      {
        role: 'user',
        content: trimmed
      }
    ];
    return await callOpenAI(messages);
  } catch (error) {
    console.error('AI chat error:', error.message || error);
    return localChatAnswer(trimmed);
  }
}

router.post('/api/chat', async (req, res) => {
  try {
    const question = String(req.body.question || '').trim();
    const answer = await getAiChatAnswer(question);
    res.json({ answer });
  } catch (error) {
    console.error('Chat API error:', error);
    res.json({ answer: 'I could not connect to the chat service. Please try again later.' });
  }
});

router.get('/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find({ isPublished: true }).sort({ createdAt: -1 }).lean();
    res.render('blogs', {
      title: 'Blog | ScoopCraft',
      blogs
    });
  } catch (error) {
    console.error('Error loading blog list:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/blogs/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true }).lean();
    if (!blog) {
      return res.status(404).render('404', {
        title: 'Blog Not Found | ScoopCraft'
      });
    }

    res.locals.seo = {
      ...res.locals.seo,
      metaDescription: blog.excerpt || res.locals.seo.metaDescription,
      currentUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
    };

    res.render('blog-detail', {
      title: `${blog.title} | ScoopCraft`,
      blog
    });
  } catch (error) {
    console.error('Error loading blog detail:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

module.exports = router;
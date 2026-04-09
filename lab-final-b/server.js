const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const session = require('express-session');
const SeoSetting = require('./models/SeoSetting');
const { loadCurrentUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3004;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/customized-coats';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'scoopcraft-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

// Helmet security + SEO-friendly response headers.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"]
      }
    },
    crossOriginResourcePolicy: { policy: 'same-site' }
  })
);

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(loadCurrentUser);

// Inject SEO defaults for all page renders.
app.use(async (req, res, next) => {
  try {
    const setting = await SeoSetting.findOne().lean();
    res.locals.seo = {
      siteTitle: setting?.siteTitle || 'ScoopCraft Pints',
      titleSeparator: setting?.titleSeparator || '|',
      metaDescription:
        setting?.metaDescription ||
        'Build custom 3-flavour and 4-flavour artisan ice cream pints with one-time or subscription delivery.',
      metaKeywords:
        setting?.metaKeywords || 'custom ice cream pints, flavour builder, artisan dessert, pint subscription',
      canonicalBaseUrl: setting?.canonicalBaseUrl || '',
      robots: setting?.robots || 'index, follow',
      ogImage: setting?.ogImage || '/assets/blackseamer-honey-pint.jpg',
      twitterCard: setting?.twitterCard || 'summary_large_image'
    };

    const baseUrl = (res.locals.seo.canonicalBaseUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    res.locals.seo.currentUrl = `${baseUrl}${req.originalUrl || ''}`;
    res.locals.seo.ogImageUrl =
      res.locals.seo.ogImage && /^https?:\/\//i.test(res.locals.seo.ogImage)
        ? res.locals.seo.ogImage
        : `${baseUrl}${res.locals.seo.ogImage || '/assets/blackseamer-honey-pint.jpg'}`;
  } catch (error) {
    res.locals.seo = {
      siteTitle: 'ScoopCraft Pints',
      titleSeparator: '|',
      metaDescription: 'Build custom 3-flavour and 4-flavour artisan ice cream pints with one-time or subscription delivery.',
      metaKeywords: 'custom ice cream pints, flavour builder, artisan dessert, pint subscription',
      canonicalBaseUrl: '',
      robots: 'index, follow',
      ogImage: '/assets/blackseamer-honey-pint.jpg',
      twitterCard: 'summary_large_image'
    };

    const fallbackBaseUrl = `${req.protocol}://${req.get('host')}`;
    res.locals.seo.currentUrl = `${fallbackBaseUrl}${req.originalUrl || ''}`;
    res.locals.seo.ogImageUrl = `${fallbackBaseUrl}/assets/blackseamer-honey-pint.jpg`;
  }
  next();
});

// Routes
const mainRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/order');
const wishlistRoutes = require('./routes/wishlist');

app.use('/', mainRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/cart', cartRoutes);
app.use('/order', orderRoutes);
app.use('/wishlist', wishlistRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found | ScoopCraft',
  });
});

app.listen(PORT, () => {
  console.log(`ScoopCraft Pints running at http://localhost:${PORT}`);
});



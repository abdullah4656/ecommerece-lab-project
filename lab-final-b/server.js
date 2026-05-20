require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const session = require('express-session');
const SeoSetting = require('./models/SeoSetting');
const { loadCurrentUser } = require('./middleware/auth');

const app = express();

const PORT = process.env.PORT || 8000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'scoopcraft-dev-secret';

app.set('trust proxy', 1);

// =========================
// MongoDB Connection
// =========================
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/customized-coats';

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// =========================
// Express Config
// =========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =========================
// Session
// =========================
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  })
);

// =========================
// Security
// =========================
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

// =========================
// Static + Middleware
// =========================
app.use(express.static(path.join(__dirname, 'public')));
app.use(loadCurrentUser);

// =========================
// SEO Middleware
// =========================
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
        setting?.metaKeywords ||
        'custom ice cream pints, flavour builder, artisan dessert, pint subscription',
      canonicalBaseUrl: setting?.canonicalBaseUrl || '',
      robots: setting?.robots || 'index, follow',
      ogImage: setting?.ogImage || '/assets/blackseamer-honey-pint.jpg',
      twitterCard: setting?.twitterCard || 'summary_large_image'
    };

    const baseUrl = (
      res.locals.seo.canonicalBaseUrl ||
      `${req.protocol}://${req.get('host')}`
    ).replace(/\/$/, '');

    res.locals.seo.currentUrl = `${baseUrl}${req.originalUrl || ''}`;

    res.locals.seo.ogImageUrl =
      /^https?:\/\//i.test(res.locals.seo.ogImage)
        ? res.locals.seo.ogImage
        : `${baseUrl}${res.locals.seo.ogImage}`;
  } catch (error) {
    res.locals.seo = {
      siteTitle: 'ScoopCraft Pints',
      titleSeparator: '|',
      metaDescription:
        'Build custom 3-flavour and 4-flavour artisan ice cream pints with one-time or subscription delivery.',
      metaKeywords:
        'custom ice cream pints, flavour builder, artisan dessert, pint subscription',
      canonicalBaseUrl: '',
      robots: 'index, follow',
      ogImage: '/assets/blackseamer-honey-pint.jpg',
      twitterCard: 'summary_large_image'
    };
  }

  next();
});

// =========================
// Routes
// =========================
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

// =========================
// 404 Handler
// =========================
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found | ScoopCraft'
  });
});

// =========================
// START SERVER ONLY AFTER DB CONNECTS
// =========================
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('🚀 Server starting...');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });
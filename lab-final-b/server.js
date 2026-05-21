require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const session = require('express-session');
const SeoSetting = require('./models/SeoSetting');
const brand = require('./config/brand');
const { loadCurrentUser } = require('./middleware/auth');

const app = express();

const PORT = process.env.PORT || 8000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'coatandcraft-dev-secret';

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
app.use((req, res, next) => {
  res.locals.minimalHeader = false;
  next();
});

// =========================
// SEO Middleware
// =========================
app.use(async (req, res, next) => {
  try {
    const setting = await SeoSetting.findOne().lean();

    res.locals.seo = {
      siteTitle: setting?.siteTitle || brand.siteTitle,
      titleSeparator: setting?.titleSeparator || '|',
      metaDescription: setting?.metaDescription || brand.metaDescription,
      metaKeywords: setting?.metaKeywords || brand.metaKeywords,
      canonicalBaseUrl: setting?.canonicalBaseUrl || '',
      robots: setting?.robots || 'index, follow',
      ogImage: setting?.ogImage || brand.defaultOgImage,
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
      siteTitle: brand.siteTitle,
      titleSeparator: '|',
      metaDescription: brand.metaDescription,
      metaKeywords: brand.metaKeywords,
      canonicalBaseUrl: '',
      robots: 'index, follow',
      ogImage: brand.defaultOgImage,
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
    title: 'Page Not Found | coat and craft'
  });
});

// =========================
// START SERVER ONLY AFTER DB CONNECTS
// =========================
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('🚀 Server starting...');

    try {
      const { seedBlogs } = require('./scripts/seed-blogs');
      const created = await seedBlogs();
      if (created > 0) {
        console.log(`✅ Seeded ${created} Coat and Craft blog post(s)`);
      }
    } catch (err) {
      console.error('⚠️ Blog seed skipped:', err.message);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });
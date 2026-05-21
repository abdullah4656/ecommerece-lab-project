const express = require('express');
const https = require('https');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const SeoSetting = require('../models/SeoSetting');
const Blog = require('../models/Blog');
const { requireAdmin } = require('../middleware/auth');
const brand = require('../config/brand');

function parseFlavourOptions(rawInput) {
  const lines = String(rawInput || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const [name, note, color] = line.split('|').map((part) => String(part || '').trim());
      if (!name) {
        return null;
      }
      return {
        name,
        note: note || '',
        color: color || '#ffe5c2'
      };
    })
    .filter(Boolean);
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function generateUniqueSlug(baseSlug, excludeId = null) {
  let slug = baseSlug;
  let count = 1;

  const exists = async (candidateSlug) => {
    const query = { slug: candidateSlug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    return await Blog.exists(query);
  };

  while (await exists(slug)) {
    slug = `${baseSlug}-${count++}`;
  }

  return slug;
}

function escapeControlCharsInJsonStrings(json) {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (!inString) {
      result += ch;
      if (ch === '"') {
        inString = true;
      }
      continue;
    }

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      result += ch;
      inString = false;
      continue;
    }

    if (ch === '\n') {
      result += '\\n';
    } else if (ch === '\r') {
      result += '\\r';
    } else if (ch === '\t') {
      result += '\\t';
    } else if (ch.charCodeAt(0) < 32) {
      result += `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
    } else {
      result += ch;
    }
  }

  return result;
}

function parseAiJsonResponse(raw) {
  let text = String(raw || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('AI response did not contain a JSON object.');
  }

  text = text.slice(start, end + 1);

  try {
    return JSON.parse(text);
  } catch (firstError) {
    try {
      return JSON.parse(escapeControlCharsInJsonStrings(text));
    } catch (secondError) {
      const err = new Error(`Could not parse AI JSON: ${firstError.message}`);
      err.cause = secondError;
      throw err;
    }
  }
}

function callOpenAI(messages) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY;
    if (!apiKey) {
      return reject(new Error('API key is not configured. Set OPENAI_API_KEY or GROK_API_KEY.'));
    }

    const useGrok = Boolean(process.env.GROK_API_KEY);
    // Allow users to set either a full request URL or a base URL. Normalize to the
    // expected chat completions path so providers with different URL formats work.
    const rawUrl = useGrok ? process.env.GROK_API_URL : process.env.OPENAI_API_URL;
    const defaultBase = useGrok ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com';
    const base = (rawUrl || defaultBase).trim().replace(/\/+$/g, '');
    // If the URL already contains 'chat/completions', use it as-is.
    // Groq and other OpenAI-compatible bases often end with /v1 — append /chat/completions only.
    let endpoint;
    if (/chat\/completions/.test(base)) {
      endpoint = base;
    } else if (/\/v1$/i.test(base)) {
      endpoint = `${base}/chat/completions`;
    } else {
      endpoint = `${base}/v1/chat/completions`;
    }
    const defaultGrokModel = /groq\.com/i.test(endpoint)
      ? 'llama-3.3-70b-versatile'
      : 'grok-2-latest';
    const model = useGrok
      ? process.env.GROK_MODEL || defaultGrokModel
      : process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

    const payloadObj = {
      model,
      temperature: 0.8,
      max_tokens: 650,
      messages: Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: String(messages || '') }]
    };

    const payload = JSON.stringify(payloadObj);

    const req = https.request(endpoint, {
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

            // Try multiple common shapes for AI responses to support Grok/OpenAI and compatibles
            const tryExtract = (obj) => {
              if (!obj) return null;
              // OpenAI chat format
              if (obj.choices && Array.isArray(obj.choices) && obj.choices[0]) {
                const c = obj.choices[0];
                if (c.message && c.message.content) return c.message.content;
                if (typeof c.text === 'string' && c.text) return c.text;
              }
              // Some providers put output in `output_text` or `output` fields
              if (typeof obj.output_text === 'string' && obj.output_text) return obj.output_text;
              if (obj.output && Array.isArray(obj.output) && obj.output[0]) {
                const out = obj.output[0];
                if (typeof out === 'string' && out) return out;
                if (out.content && Array.isArray(out.content)) {
                  const textPart = out.content.find((p) => p.type === 'output_text' || p.type === 'text');
                  if (textPart && textPart.text) return textPart.text;
                }
              }
              // Some APIs return data array
              if (obj.data && Array.isArray(obj.data) && obj.data[0]) {
                const d = obj.data[0];
                if (d.text) return d.text;
                if (d.content && typeof d.content === 'string') return d.content;
              }
              return null;
            };

            const extracted = tryExtract(body);
            if (extracted != null) {
              return resolve(extracted);
            }

            // As a last resort, if body contains any string-like content, return it
            if (typeof body === 'string' && body) return resolve(body);

            // If nothing found, include the full response for debugging
            console.error('Unexpected AI response shape:', JSON.stringify(body));
            return resolve('');
          } catch (err) {
            console.error('Error parsing AI response:', err.message || err);
            return reject(err);
          }
        } else {
          // Non-2xx — include body to help debugging
          return reject(new Error(`AI request failed: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      if (useGrok && err.code === 'ENOTFOUND') {
        return reject(
          new Error(
            `${err.message}. Could not resolve the Grok host. If you are using a custom endpoint, set GROK_API_URL in your environment, for example https://api.grok.com/v1/chat/completions.`
          )
        );
      }
      reject(err);
    });
    req.write(payload);
    req.end();
  });
}

async function generateSeoFields(name, description, shortDescription) {
  if (!name && !description && !shortDescription) {
    return {
      ok: false,
      error: 'Product name or description is required.',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: ''
    };
  }

  const aiApiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY;
  if (!aiApiKey) {
    const seoTitle = `${name || 'Custom Product'} | ${brand.name}`;
    const seoDescription = shortDescription || (description || '').slice(0, 150);
    const seoKeywords = `${name || 'custom product'}, custom coats, personalised coats, premium outerwear`;
    return { ok: true, seoTitle, seoDescription, seoKeywords };
  }

  const prompt = `Create SEO fields for an ecommerce product page. Return only valid JSON with keys: seoTitle, seoDescription, seoKeywords. Keep seoTitle under 60 characters, seoDescription under 160 characters, and seoKeywords as comma-separated keyword phrases. Product name: ${name}. Description: ${description}. Short description: ${shortDescription}.`;

  try {
    const raw = await callOpenAI([
      { role: 'system', content: 'You are an SEO copywriting assistant for an ecommerce storefront.' },
      { role: 'user', content: prompt }
    ]);
    const data = parseAiJsonResponse(raw);
    return {
      ok: true,
      seoTitle: data.seoTitle || `${name || 'Custom Product'} | ${brand.name}`,
      seoDescription: data.seoDescription || shortDescription || (description || '').slice(0, 150),
      seoKeywords: data.seoKeywords || `${name || 'custom product'}, custom coats, personalised coats, premium outerwear`
    };
  } catch (error) {
    console.error('SEO generation error:', error.message || error);
    return {
      ok: true,
      seoTitle: `${name || 'Custom Product'} | ${brand.name}`,
      seoDescription: shortDescription || (description || '').slice(0, 150),
      seoKeywords: `${name || 'custom product'}, custom coats, personalised coats, premium outerwear`,
      warning: 'AI unavailable — using template SEO instead.'
    };
  }
}

async function generateSiteSeoFields(siteTitle, metaDescription, metaKeywords) {
  const title = (siteTitle || brand.siteTitle).trim();
  const description = (metaDescription || brand.metaDescription).trim();
  const keywords = (metaKeywords || brand.metaKeywords).trim();

  const aiApiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY;
  if (!aiApiKey) {
    return {
      ok: true,
      siteTitle: title,
      metaDescription: description,
      metaKeywords: keywords
    };
  }

  const prompt = `Create global SEO settings for ${brand.name}, a custom coat and bespoke outerwear ecommerce store. Return only valid JSON with keys: siteTitle, metaDescription, metaKeywords. Keep siteTitle under 60 characters, metaDescription under 160 characters, metaKeywords as comma-separated phrases. Current site title: ${title}. Current description: ${description}. Current keywords: ${keywords}.`;

  try {
    const raw = await callOpenAI([
      { role: 'system', content: 'You are an SEO copywriting assistant for an ecommerce storefront.' },
      { role: 'user', content: prompt }
    ]);
    const data = parseAiJsonResponse(raw);
    return {
      ok: true,
      siteTitle: data.siteTitle || title,
      metaDescription: data.metaDescription || description,
      metaKeywords: data.metaKeywords || keywords
    };
  } catch (error) {
    console.error('Site SEO generation error:', error.message || error);
    return {
      ok: false,
      error: error.message || 'Could not generate site SEO.'
    };
  }
}

async function generateBlogDraft(topic) {
  const image = pickBlogImage(Math.floor(Math.random() * 4));
  const aiApiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY;
  if (!aiApiKey) {
    const title = topic ? `${topic} | ${brand.name}` : 'How to design your perfect custom coat';
    const excerpt = `Expert tips from ${brand.name} on fabrics, fit, and personalization for bespoke outerwear.`;
    const content = `Create a standout look with a tailored coat customized to your tastes. ${excerpt} Build your own unique coat with premium fabrics, embroidery, and thoughtful details.

A custom coat should fit your body and your style. Choose the right lining, collar, and buttons to keep your design elevated. Add monogramming or special finishes to make it personal.

Don’t forget to consider durability, comfort, and how your coat will travel from daytime to evening. A well-made custom coat will feel beautiful while making a memorable impression.`;
    return {
      title,
      excerpt,
      content,
      image,
      tags: ['custom coats', 'tailoring', 'coat and craft'],
      author: 'Coat and Craft Team'
    };
  }

  const prompt = `Write a blog post draft for ${brand.name}, a custom coat and bespoke outerwear ecommerce store. Return a single JSON object with keys: title, excerpt, content, tags (array of strings), and author. Write about custom coats, tailoring, fabrics, fit, styling, or care. Use 3-4 short paragraphs in content. Escape line breaks in strings as \\n (no raw newlines inside JSON). Topic: ${topic}`;

  try {
    const raw = await callOpenAI([
      {
        role: 'system',
        content: `You are a blog writer for ${brand.name}, a custom coat store. Reply with one compact JSON object only. Use \\n for paragraph breaks.`
      },
      { role: 'user', content: prompt }
    ]);
    const data = parseAiJsonResponse(raw);
    const content = String(data.content || '').replace(/\\n/g, '\n');
    const imageUrl = String(data.image || data.imageUrl || '').trim();
    return {
      title: data.title || `${brand.name}: ${topic}`,
      excerpt: String(data.excerpt || '').replace(/\\n/g, '\n'),
      content,
      image: imageUrl || image,
      tags: Array.isArray(data.tags) ? data.tags : String(data.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      author: data.author || 'Coat and Craft Team'
    };
  } catch (error) {
    console.error('Blog generation error:', error.message || error);
    throw error;
  }
}

async function ensureDefaultAdmin() {
  const defaultEmail = 'admin@customizedcoats.com';
  const defaultPassword = 'admin123';

  let admin = await User.findOne({ role: 'Admin', email: defaultEmail });

  if (admin) {
    // Reset password if it doesn't match the default
    const passwordMatches = User.verifyPassword(defaultPassword, admin.passwordHash);
    if (!passwordMatches) {
      admin.passwordHash = User.hashPassword(defaultPassword);
      await admin.save();
      console.log(' Default admin password has been reset to "admin123"');
    }
    return;
  }

  // Create default admin if it doesn't exist
  await User.create({
    name: 'Store Admin',
    email: defaultEmail,
    passwordHash: User.hashPassword(defaultPassword),
    role: 'Admin',
    status: 'Active'
  });

  console.log('✅ Default admin created with email admin@customizedcoats.com and password "admin123"');
}

function getNextStatus(currentStatus) {
  const statusMap = {
    Placed: 'Processing',
    Processing: 'Delivered',
    Delivered: null
  };
  return statusMap[currentStatus] || null;
}

function getStoreImages() {
  try {
    const assetsDir = path.join(__dirname, '..', 'public', 'assets');
    const files = fs.readdirSync(assetsDir, { withFileTypes: true });
    return files
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name))
      .map((name) => `/assets/${name}`)
      .sort();
  } catch (error) {
    return [];
  }
}

function resolveProductImage(body) {
  const manualUrl = (body.image || '').trim();
  const storeUrl = (body.imageFromStore || '').trim();
  return manualUrl || storeUrl;
}

const BLOG_DEFAULT_IMAGES = [
  '/assets/homebannner.webp',
  '/assets/image2 (1).webp',
  '/assets/image2 (2).webp',
  '/assets/homebannner.webp'
];

function pickBlogImage(index = 0) {
  const storeImages = getStoreImages();
  if (storeImages.length) {
    return storeImages[index % storeImages.length];
  }
  return BLOG_DEFAULT_IMAGES[index % BLOG_DEFAULT_IMAGES.length];
}

function resolveBlogImage(body) {
  return resolveProductImage(body);
}

router.get('/signin', async (req, res) => {
  try {
    if (req.session.userId && (req.session.userRole === 'Admin' || req.session.userRole === 'Manager')) {
      return res.redirect('/admin');
    }

    await ensureDefaultAdmin();

    res.render('admin/signin', {
      title: 'Admin Sign In | Coat and Craft',
      error: '',
      minimalHeader: true
    });
  } catch (error) {
    console.error('Error loading admin sign in page:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load sign in page'
    });
  }
});

router.post('/signin', async (req, res) => {
  try {
    await ensureDefaultAdmin();

    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').trim().toLowerCase() });

    const validRole = user && (user.role === 'Admin' || user.role === 'Manager');
    const validPassword = user && User.verifyPassword(password || '', user.passwordHash);

    if (!validRole || !validPassword) {
      return res.status(401).render('admin/signin', {
        title: 'Admin Sign In | Coat and Craft',
        error: 'Invalid admin credentials.',
        minimalHeader: true
      });
    }

    if (user.status !== 'Active') {
      return res.status(403).render('admin/signin', {
        title: 'Admin Sign In | Coat and Craft',
        error: 'Your admin account is inactive.',
        minimalHeader: true
      });
    }

    req.session.userId = user._id.toString();
    req.session.userRole = user.role;
    req.session.currentUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.redirect('/admin');
  } catch (error) {
    console.error('Error signing in admin:', error);
    res.status(500).render('admin/signin', {
      title: 'Admin Sign In | Coat and Craft',
      error: 'Failed to sign in. Please try again.',
      minimalHeader: true
    });
  }
});

router.post('/signout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/signin');
  });
});

router.use(requireAdmin);

router.get('/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.render('admin/blogs', {
      title: 'Manage Blogs | Admin',
      blogs
    });
  } catch (error) {
    console.error('Error loading blogs:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load blogs'
    });
  }
});

router.get('/blogs/add', async (req, res) => {
  try {
    res.render('admin/blog-form', {
      title: 'Add New Blog Post | Admin',
      blog: null,
      formAction: '/admin/blogs',
      submitText: 'Create Post',
      editMode: false,
      storeImages: getStoreImages()
    });
  } catch (error) {
    console.error('Error loading blog form:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load blog form'
    });
  }
});

router.post('/blogs', async (req, res) => {
  try {
    const { title, excerpt, content, tags, author, isPublished, generatedByAI } = req.body;
    const baseSlug = slugify(title || `${Date.now()}`);
    const slug = await generateUniqueSlug(baseSlug);
    const tagList = String(tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);

    await Blog.create({
      title,
      slug,
      excerpt,
      content,
      image: resolveBlogImage(req.body),
      tags: tagList,
      author: author || 'Admin',
      isPublished: isPublished === 'on',
      generatedByAI: generatedByAI === 'true'
    });

    res.redirect('/admin/blogs');
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to create blog post'
    });
  }
});

router.post('/blogs/generate-ai', async (req, res) => {
  try {
    const { topic } = req.body;
    const blog = await generateBlogDraft(topic);
    res.json({ success: true, blog });
  } catch (error) {
    console.error('Error generating AI blog draft:', error);
    const message = error.message || 'Could not generate AI blog content.';
    res.json({ success: false, error: message });
  }
});

router.get('/blogs/:id/edit', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'Blog post not found'
      });
    }

    res.render('admin/blog-form', {
      title: 'Edit Blog Post | Admin',
      blog,
      formAction: `/admin/blogs/${blog._id}`,
      submitText: 'Update Post',
      editMode: true,
      storeImages: getStoreImages()
    });
  } catch (error) {
    console.error('Error loading blog post for edit:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load blog post'
    });
  }
});

router.post('/blogs/:id', async (req, res) => {
  try {
    const { title, excerpt, content, tags, author, isPublished, generatedByAI } = req.body;
    const tagList = String(tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
    const baseSlug = slugify(title || `${Date.now()}`);
    const slug = await generateUniqueSlug(baseSlug, req.params.id);

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      {
        title,
        excerpt,
        content,
        image: resolveBlogImage(req.body),
        tags: tagList,
        author: author || 'Admin',
        isPublished: isPublished === 'on',
        generatedByAI: generatedByAI === 'true',
        slug
      },
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'Blog post not found'
      });
    }

    res.redirect('/admin/blogs');
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to update blog post'
    });
  }
});

router.post('/blogs/:id/delete', async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'Blog post not found'
      });
    }

    res.redirect('/admin/blogs');
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to delete blog post'
    });
  }
});

router.post('/products/ai-seo', async (req, res) => {
  try {
    const { name, description, shortDescription } = req.body;
    const seo = await generateSeoFields(name, description, shortDescription);
    if (!seo.ok) {
      return res.status(400).json({ success: false, error: seo.error || 'Missing product details.' });
    }
    res.json({
      success: true,
      seoTitle: seo.seoTitle,
      seoDescription: seo.seoDescription,
      seoKeywords: seo.seoKeywords,
      warning: seo.warning || ''
    });
  } catch (error) {
    console.error('Error generating SEO fields:', error);
    res.status(500).json({ success: false, error: error.message || 'Could not generate SEO fields.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const [totalProducts, totalOrders, totalUsers, products] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments(),
      Product.find().limit(5).sort({ createdAt: -1 })
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard | Coat and Craft',
      totalProducts,
      totalOrders,
      totalUsers,
      recentProducts: products
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load dashboard'
    });
  }
});

router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render('admin/products', {
      title: 'Manage Products | Admin',
      products
    });
  } catch (error) {
    console.error('Error loading products:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load products'
    });
  }
});

router.get('/products/add', async (req, res) => {
  try {
    res.render('admin/product-form', {
      title: 'Add New Product | Admin',
      product: null,
      storeImages: getStoreImages(),
      formAction: '/admin/products',
      formMethod: 'POST',
      submitText: 'Add Product',
      editMode: false
    });
  } catch (error) {
    console.error('Error loading product form:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load product form'
    });
  }
});

router.post('/products', async (req, res) => {
  try {
    const {
      name, price, image, description,
      shortDescription, stock, isActive, flavourOptions,
      seoTitle, seoDescription, seoKeywords, metaRobots, canonicalUrl
    } = req.body;

    const product = new Product({
      name,
      price: parseFloat(price),
      rarity: 'Signature',
      category: '',
      image: resolveProductImage(req.body),
      description,
      shortDescription: (shortDescription || '').trim(),
      stock: Number(stock) || 0,
      isActive: isActive === 'on',
      flavourOptions: parseFlavourOptions(flavourOptions),
      seoTitle: (seoTitle || '').trim(),
      seoDescription: (seoDescription || '').trim(),
      seoKeywords: (seoKeywords || '').trim(),
      metaRobots: (metaRobots || '').trim() || 'index, follow',
      canonicalUrl: (canonicalUrl || '').trim()
    });

    await product.save();
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to create product'
    });
  }
});

router.get('/products/:id/edit', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'Product not found'
      });
    }

    res.render('admin/product-form', {
      title: 'Edit Product | Admin',
      product,
      storeImages: getStoreImages(),
      formAction: `/admin/products/${product._id}`,
      formMethod: 'POST',
      submitText: 'Update Product',
      editMode: true
    });
  } catch (error) {
    console.error('Error loading product for edit:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load product'
    });
  }
});

router.post('/products/:id', async (req, res) => {
  try {
    const {
      name, price, image, description,
      shortDescription, stock, isActive, flavourOptions,
      seoTitle, seoDescription, seoKeywords, metaRobots, canonicalUrl
    } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        price: parseFloat(price),
        rarity: 'Signature',
        category: '',
        image: resolveProductImage(req.body),
        description,
        shortDescription: (shortDescription || '').trim(),
        stock: Number(stock) || 0,
        isActive: isActive === 'on',
        flavourOptions: parseFlavourOptions(flavourOptions),
        seoTitle: (seoTitle || '').trim(),
        seoDescription: (seoDescription || '').trim(),
        seoKeywords: (seoKeywords || '').trim(),
        metaRobots: (metaRobots || '').trim() || 'index, follow',
        canonicalUrl: (canonicalUrl || '').trim()
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'Product not found'
      });
    }

    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to update product'
    });
  }
});

router.post('/products/:id/delete', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'Product not found'
      });
    }
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to delete product'
    });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.render('admin/orders', {
      title: 'Manage Orders | Admin',
      orders
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load orders'
    });
  }
});

router.post('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'Order not found'
      });
    }

    const validStatuses = ['Placed', 'Processing', 'Delivered'];
    const statusOrder = { Placed: 0, Processing: 1, Delivered: 2 };

    if (!validStatuses.includes(status)) {
      return res.status(400).render('admin/error', {
        title: 'Invalid Status | Admin',
        message: 'Invalid order status'
      });
    }

    const currentStatusIndex = statusOrder[order.status];
    const newStatusIndex = statusOrder[status];

    if (newStatusIndex - currentStatusIndex > 1) {
      return res.status(400).render('admin/error', {
        title: 'Invalid Status Transition | Admin',
        message: `Cannot skip status. Current status is "${order.status}". You can only move to "${getNextStatus(order.status)}".`
      });
    }

    if (newStatusIndex < currentStatusIndex) {
      return res.status(400).render('admin/error', {
        title: 'Invalid Status Transition | Admin',
        message: `Cannot move order status backwards. Current status is "${order.status}".`
      });
    }

    order.status = status;
    if (!Array.isArray(order.trackingHistory)) {
      order.trackingHistory = [];
    }
    order.trackingHistory.push({
      status,
      note: `Status updated by admin to ${status}`,
      updatedAt: new Date()
    });

    await order.save();
    res.redirect('/admin/orders');
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to update order status'
    });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.render('admin/users', {
      title: 'Manage Users | Admin',
      users
    });
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load users'
    });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, role, status, password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).render('admin/error', {
        title: 'Error | Admin',
        message: 'Password is required and must be at least 6 characters.'
      });
    }

    await User.create({
      name: (name || '').trim(),
      email: (email || '').trim(),
      passwordHash: User.hashPassword(password),
      role,
      status
    });

    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to create user. Make sure email is unique and valid.'
    });
  }
});

router.post('/users/:id', async (req, res) => {
  try {
    const { name, email, role, status, password } = req.body;

    const updates = {
      name: (name || '').trim(),
      email: (email || '').trim(),
      role,
      status
    };

    if ((password || '').trim()) {
      if (password.length < 6) {
        return res.status(400).render('admin/error', {
          title: 'Error | Admin',
          message: 'New password must be at least 6 characters.'
        });
      }
      updates.passwordHash = User.hashPassword(password);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'User not found'
      });
    }

    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to update user. Make sure email is unique and valid.'
    });
  }
});

router.post('/users/:id/delete', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'User not found'
      });
    }

    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to delete user'
    });
  }
});

router.post('/seo/generate-ai', async (req, res) => {
  try {
    const { siteTitle, metaDescription, metaKeywords } = req.body;
    const seo = await generateSiteSeoFields(siteTitle, metaDescription, metaKeywords);
    if (!seo.ok) {
      return res.status(500).json({ success: false, error: seo.error || 'Could not generate site SEO.' });
    }
    res.json({
      success: true,
      siteTitle: seo.siteTitle,
      metaDescription: seo.metaDescription,
      metaKeywords: seo.metaKeywords
    });
  } catch (error) {
    console.error('Error generating site SEO:', error);
    res.status(500).json({ success: false, error: error.message || 'Could not generate site SEO.' });
  }
});

router.get('/seo', async (req, res) => {
  try {
    let settings = await SeoSetting.findOne();
    if (!settings) {
      settings = await SeoSetting.create({});
    }

    res.render('admin/seo', {
      title: 'SEO Settings | Admin',
      settings,
      saved: req.query.saved === '1'
    });
  } catch (error) {
    console.error('Error loading SEO settings:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load SEO settings'
    });
  }
});

router.post('/seo', async (req, res) => {
  try {
    const {
      siteTitle,
      titleSeparator,
      metaDescription,
      metaKeywords,
      canonicalBaseUrl,
      robots,
      ogImage,
      twitterCard
    } = req.body;

    let settings = await SeoSetting.findOne();
    if (!settings) {
      settings = new SeoSetting();
    }

    settings.siteTitle = (siteTitle || '').trim() || brand.siteTitle;
    settings.titleSeparator = (titleSeparator || '').trim() || '|';
    settings.metaDescription = (metaDescription || '').trim() || brand.metaDescription;
    settings.metaKeywords = (metaKeywords || '').trim() || brand.metaKeywords;
    settings.canonicalBaseUrl = (canonicalBaseUrl || '').trim();
    settings.robots = (robots || '').trim() || 'index, follow';
    settings.ogImage = (ogImage || '').trim() || brand.defaultOgImage;
    settings.twitterCard = (twitterCard || '').trim() || 'summary_large_image';

    await settings.save();
    res.redirect('/admin/seo?saved=1');
  } catch (error) {
    console.error('Error saving SEO settings:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to save SEO settings'
    });
  }
});

module.exports = router;


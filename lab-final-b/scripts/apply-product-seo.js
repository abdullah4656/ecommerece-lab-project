const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/customized-coats';

function toSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function clip(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function buildSeoForProduct(product) {
  const name = String(product.name || 'Custom Pint').trim();
  const shortDescription = String(product.shortDescription || '').trim();
  const description = String(product.description || '').trim();
  const category = String(product.category || 'ice cream').trim();
  const rarity = String(product.rarity || 'signature').trim();
  const flavourNames = (product.flavourOptions || [])
    .map((item) => String(item.name || '').trim())
    .filter(Boolean)
    .slice(0, 4);

  const seoTitle = clip(`${name} | Custom Ice Cream Pint | ScoopCraft`, 60);
  const summaryBase = shortDescription || description || 'Premium handcrafted custom ice cream pint.';
  const seoDescription = clip(
    `${name} by ScoopCraft. ${summaryBase} Order one-time or subscribe for weekly delivery.`,
    160
  );

  const keywords = [
    name,
    category,
    rarity,
    ...flavourNames,
    'custom ice cream pint',
    'artisan dessert delivery',
    'scoopcraft pints'
  ];

  const seoKeywords = keywords
    .map((item) => item.toLowerCase())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .join(', ');

  const slug = toSlug(name) || String(product._id);
  const canonicalUrl = `/products/${product._id}?slug=${slug}`;

  return {
    seoTitle,
    seoDescription,
    seoKeywords,
    metaRobots: 'index, follow',
    canonicalUrl
  };
}

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to ${MONGODB_URI}`);

    const products = await Product.find({}).lean();
    if (!products.length) {
      console.log('No products found to update.');
      await mongoose.connection.close();
      process.exit(0);
    }

    let updated = 0;

    for (const product of products) {
      const seo = buildSeoForProduct(product);
      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            seoTitle: seo.seoTitle,
            seoDescription: seo.seoDescription,
            seoKeywords: seo.seoKeywords,
            metaRobots: seo.metaRobots,
            canonicalUrl: seo.canonicalUrl
          }
        }
      );
      updated += 1;
    }

    console.log(`Products processed: ${products.length}`);
    console.log(`Products updated with SEO: ${updated}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Failed to apply SEO to products:', error.message);
    process.exit(1);
  }
}

run();

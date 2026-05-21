require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const brand = require('../config/brand');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/customized-coats';

function clip(text, max) {
  const value = String(text || '').trim();
  return value.length <= max ? value : `${value.slice(0, max - 3).trim()}...`;
}

function buildSeo(product) {
  const name = String(product.name || 'Custom Coat').trim();
  const description = String(product.description || '').trim();
  const shortDescription = String(product.shortDescription || '').trim();
  const category = String(product.category || 'custom coats').trim();

  const seoTitle = clip(`${name} | ${brand.name}`, 60);
  const summaryBase = shortDescription || description || 'Premium bespoke coat tailored to your measurements.';
  const seoDescription = clip(
    `${name} by ${brand.name}. ${summaryBase}`,
    160
  );
  const seoKeywords = [
    name.toLowerCase(),
    category.toLowerCase(),
    'custom coat',
    'tailored outerwear',
    brand.name.toLowerCase()
  ]
    .filter(Boolean)
    .join(', ');

  return { seoTitle, seoDescription, seoKeywords };
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const products = await Product.find();
  let updated = 0;

  for (const product of products) {
    const seo = buildSeo(product);
    product.seoTitle = seo.seoTitle;
    product.seoDescription = seo.seoDescription;
    product.seoKeywords = seo.seoKeywords;
    await product.save();
    updated++;
  }

  console.log(`Updated SEO for ${updated} product(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('SEO update failed:', err);
  process.exit(1);
});

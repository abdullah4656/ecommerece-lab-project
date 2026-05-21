require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const brand = require('../config/brand');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/customized-coats';

function buildSeo(name, shortDescription, description, category) {
  const summary = shortDescription || description.slice(0, 120);
  return {
    seoTitle: `${name} | ${brand.name}`.slice(0, 60),
    seoDescription: `${name} by ${brand.name}. ${summary}`.slice(0, 160),
    seoKeywords: `${name.toLowerCase()}, ${category.toLowerCase()}, custom coat, tailored outerwear, ${brand.name.toLowerCase()}`,
    metaRobots: 'index, follow',
    canonicalUrl: ''
  };
}

const COAT_PRODUCTS = [
  {
    name: 'Classic Wool Overcoat',
    price: 289,
    rarity: 'Classic',
    category: 'Overcoats',
    image: '/assets/product-1.webp',
    shortDescription: 'Timeless wool overcoat tailored to your measurements.',
    description:
      'A full-length wool overcoat with structured shoulders, premium lining options, and customizable buttons. Ideal for formal and everyday winter wear.',
    flavourOptions: [
      { name: 'Charcoal Wool', note: 'All-season weight', color: '#4a4a4a' },
      { name: 'Navy Herringbone', note: 'Classic pattern', color: '#2c3e5c' },
      { name: 'Camel Melton', note: 'Warm finish', color: '#c4a574' }
    ]
  },
  {
    name: 'Modern Single-Breasted Coat',
    price: 249,
    rarity: 'Modern',
    category: 'Coats',
    image: '/assets/product-2.webp',
    shortDescription: 'Slim modern coat with clean lines and sharp tailoring.',
    description:
      'A contemporary single-breasted coat designed for city wear. Choose fabric, lining, and lapel style for a sharp personalized look.',
    flavourOptions: [
      { name: 'Slate Wool', note: 'Lightweight', color: '#6b7280' },
      { name: 'Black Cashmere Blend', note: 'Soft drape', color: '#1a1a1a' },
      { name: 'Olive Twill', note: 'Casual tone', color: '#5c6b4a' }
    ]
  },
  {
    name: 'Heritage Trench Coat',
    price: 319,
    rarity: 'Heritage',
    category: 'Trench Coats',
    image: '/assets/product-3.webp',
    shortDescription: 'Weather-ready trench with bespoke fit and details.',
    description:
      'Double-breasted trench coat with storm flap, belt, and tailored sleeve length. Built for rain and transitional seasons.',
    flavourOptions: [
      { name: 'Stone Cotton', note: 'Breathable shell', color: '#d4cfc4' },
      { name: 'Midnight Gabardine', note: 'Water-resistant', color: '#1e2a3a' },
      { name: 'Sand Twill', note: 'Heritage tone', color: '#c9b896' }
    ]
  },
  {
    name: 'Cashmere Blend Topcoat',
    price: 399,
    rarity: 'Premium',
    category: 'Topcoats',
    image: '/assets/product-4.webp',
    shortDescription: 'Luxury cashmere blend topcoat for elevated occasions.',
    description:
      'Soft hand-feel with refined structure. Perfect for evening events and premium everyday layering.',
    flavourOptions: [
      { name: 'Graphite Cashmere', note: 'Ultra soft', color: '#3d3d3d' },
      { name: 'Burgundy Blend', note: 'Statement colour', color: '#6b2d3c' },
      { name: 'Ivory Wool', note: 'Formal light', color: '#f5f0e8' }
    ]
  },
  {
    name: 'Chesterfield Formal Overcoat',
    price: 349,
    rarity: 'Signature',
    category: 'Overcoats',
    image: '/assets/homebannner.webp',
    shortDescription: 'Structured velvet collar overcoat for black-tie and business dress.',
    description:
      'Traditional Chesterfield silhouette with velvet collar, concealed front, and half-canvas construction. Tailored for formal events and executive wear.',
    flavourOptions: [
      { name: 'Midnight Barathea', note: 'Formal finish', color: '#1c1c28' },
      { name: 'Charcoal Flannel', note: 'Winter weight', color: '#454545' },
      { name: 'Deep Forest', note: 'Evening alternative', color: '#2f4538' }
    ]
  },
  {
    name: 'Naval Peacoat',
    price: 269,
    rarity: 'Heritage',
    category: 'Peacoats',
    image: '/assets/image2 (1).webp',
    shortDescription: 'Double-breasted peacoat with anchor buttons and warm melton wool.',
    description:
      'Classic naval peacoat cut to your chest and sleeve measurements. Features broad lapels, six-button front, and quilted lining options.',
    flavourOptions: [
      { name: 'Navy Melton', note: 'Original naval tone', color: '#1f2a44' },
      { name: 'Black Wool', note: 'Versatile dark', color: '#111111' },
      { name: 'Steel Grey', note: 'Modern neutral', color: '#5a5f66' }
    ]
  },
  {
    name: 'Belted Wrap Coat',
    price: 279,
    rarity: 'Modern',
    category: 'Wrap Coats',
    image: '/assets/image2 (2).webp',
    shortDescription: 'Relaxed wrap coat with tie belt and fluid drape.',
    description:
      'Open-front wrap coat with removable belt, deep pockets, and soft shoulder line. Ideal for layering over suits or knitwear.',
    flavourOptions: [
      { name: 'Oatmeal Wool', note: 'Soft neutral', color: '#e8dfd0' },
      { name: 'Espresso Brown', note: 'Rich tone', color: '#4a3428' },
      { name: 'Slate Blue', note: 'Cool palette', color: '#5c6d7a' }
    ]
  },
  {
    name: 'Melton Driving Coat',
    price: 299,
    rarity: 'Classic',
    category: 'Driving Coats',
    image: '/assets/product-1.webp',
    shortDescription: 'Mid-length driving coat with patch pockets and horn buttons.',
    description:
      'Streamlined driving coat inspired by vintage motoring style. Tailored body, raglan option, and wind-resistant melton cloth.',
    flavourOptions: [
      { name: 'British Tan', note: 'Heritage driving', color: '#a67c52' },
      { name: 'Racing Green', note: 'Classic motorsport', color: '#2d4a3e' },
      { name: 'Coal Black', note: 'Urban staple', color: '#222222' }
    ]
  },
  {
    name: 'Velvet Evening Coat',
    price: 429,
    rarity: 'Premium',
    category: 'Evening Coats',
    image: '/assets/product-2.webp',
    shortDescription: 'Opera-length evening coat in plush velvet or barathea.',
    description:
      'Floor-skimming evening coat for galas and formal receptions. Choose silk lining, satin facings, and monogram embroidery.',
    flavourOptions: [
      { name: 'Black Velvet', note: 'Gala standard', color: '#0d0d0d' },
      { name: 'Midnight Silk Velvet', note: 'Deep sheen', color: '#1a1f3a' },
      { name: 'Burgundy Velvet', note: 'Statement evening', color: '#5c1f2e' }
    ]
  },
  {
    name: 'Quilted Field Coat',
    price: 259,
    rarity: 'Modern',
    category: 'Field Coats',
    image: '/assets/product-3.webp',
    shortDescription: 'Lightweight quilted coat for travel and country weekends.',
    description:
      'Diamond-quilted field coat with corduroy collar, two-way zip, and water-repellent finish. Packable warmth without bulk.',
    flavourOptions: [
      { name: 'Olive Quilt', note: 'Country classic', color: '#556b45' },
      { name: 'Waxed Khaki', note: 'Outdoor ready', color: '#8b7d5a' },
      { name: 'Navy Quilt', note: 'Travel friendly', color: '#2a3548' }
    ]
  }
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  let created = 0;
  let skipped = 0;

  for (const product of COAT_PRODUCTS) {
    const exists = await Product.exists({ name: product.name });
    if (exists) {
      skipped++;
      continue;
    }

    const seo = buildSeo(
      product.name,
      product.shortDescription,
      product.description,
      product.category
    );

    await Product.create({
      ...product,
      ...seo,
      isActive: true,
      stock: 25
    });
    created++;
  }

  const total = await Product.countDocuments();
  console.log(`Coat product seed complete. Created ${created}, skipped ${skipped} (already exist). Total products: ${total}.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Coat product seed failed:', err);
    process.exit(1);
  });
}

module.exports = { COAT_PRODUCTS };

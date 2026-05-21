require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../models/Blog');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/customized-coats';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const DEFAULT_BLOGS = [
  {
    title: 'How to Choose the Perfect Fabric for Your Custom Coat',
    excerpt: 'Wool, cashmere, and technical blends each shine in different seasons — here is how to pick yours.',
    image: '/assets/homebannner.webp',
    tags: ['fabrics', 'custom coats', 'buying guide'],
    content: `The right fabric sets the tone for how your coat looks, feels, and performs. At Coat and Craft, we start every build by asking where you will wear it most: city commutes, travel, or formal evenings.

For classic warmth, full wool or wool-cashmere blends offer structure and a refined drape. If you need lighter weight with weather resistance, consider a technical blend with a soft hand and clean silhouette.

Always request a swatch and hold it in daylight. Compare texture, colour depth, and how the cloth recovers after you crush it in your hand. The best custom coat begins with a fabric you are excited to wear for years.`
  },
  {
    title: 'Five Personalization Details That Elevate a Bespoke Coat',
    excerpt: 'From monograms to contrast stitching, small choices create a coat that feels unmistakably yours.',
    image: '/assets/image2 (1).webp',
    tags: ['personalization', 'monogramming', 'style'],
    content: `Personalization is where a made-to-order coat separates itself from off-the-rack options. Start with lining colour — a subtle contrast adds character every time you move.

Button material matters more than people expect: horn, corozo, or matte metal each change the formality of the piece. Interior pockets tailored to your phone, passport, or gloves keep daily carry effortless.

A discreet monogram on the lining or cuff turns a beautiful coat into your coat. At Coat and Craft, we guide you through finishes that look intentional, not busy.`
  },
  {
    title: 'Classic vs Modern Silhouettes: Finding Your Coat Shape',
    excerpt: 'Should you choose a timeless topcoat or a sharper, shorter profile? Fit and lifestyle decide.',
    image: '/assets/image2 (2).webp',
    tags: ['fit', 'silhouette', 'style guide'],
    content: `Classic silhouettes — full-length topcoats and balanced lapels — remain the safest long-term investment. They pair with tailoring and denim alike and photograph beautifully year after year.

Modern profiles run shorter and slimmer, with minimal detailing and stronger shoulder lines. They read contemporary and work well for urban layering over knits and lightweight blazers.

The right answer is not which style is trending, but which shape matches your height, shoulder line, and daily wardrobe. A custom pattern lets us fine-tune length and lapel width so the coat frames you, not the mannequin.`
  },
  {
    title: 'Caring for Your Custom Coat Through Every Season',
    excerpt: 'Simple maintenance habits protect your investment and keep structure, colour, and lining fresh.',
    image: '/assets/homebannner.webp',
    tags: ['coat care', 'maintenance', 'longevity'],
    content: `A bespoke coat should last for many seasons with consistent care. After each wear, brush the cloth to remove surface dust and hang it on a wide shoulder hanger so the chest keeps its shape.

Rotate wear when possible and air the coat away from direct heat. Spot-clean carefully; aggressive home treatments can disturb dye and finish.

Schedule professional cleaning once or twice a year depending on climate and use. Store folded pieces with cedar or breathable garment bags — never in plastic long term. Coat and Craft builds for longevity; thoughtful care completes the investment.`
  }
];

async function seedBlogs() {
  let created = 0;

  for (const post of DEFAULT_BLOGS) {
    const slug = slugify(post.title);
    const exists = await Blog.exists({ slug });
    if (exists) {
      continue;
    }

    await Blog.create({
      ...post,
      slug,
      author: 'Coat and Craft Team',
      isPublished: true,
      generatedByAI: false
    });
    created++;
  }

  return created;
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const created = await seedBlogs();
  console.log(`Blog seed complete. Created ${created} new post(s).`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Blog seed failed:', err);
    process.exit(1);
  });
}

module.exports = { seedBlogs, DEFAULT_BLOGS };

const Product = require('../models/Product');
const Blog = require('../models/Blog');
const brand = require('../config/brand');
const { callOpenAI } = require('./aiClient');

async function getStoreContext() {
  try {
    const [products, blogs] = await Promise.all([
      Product.find({ isActive: true })
        .select('name price category shortDescription description flavourOptions')
        .sort({ createdAt: -1 })
        .limit(24)
        .lean(),
      Blog.find({ isPublished: true })
        .select('title excerpt slug')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
    ]);

    return { products, blogs };
  } catch (error) {
    console.error('Chat context load error:', error.message || error);
    return { products: [], blogs: [] };
  }
}

function formatProductLine(product) {
  const options = (product.flavourOptions || [])
    .map((o) => o.name)
    .filter(Boolean)
    .slice(0, 4)
    .join(', ');
  const desc = product.shortDescription || String(product.description || '').slice(0, 100);
  const extras = options ? ` Options: ${options}.` : '';
  return `${product.name} — $${Number(product.price).toFixed(2)} (${product.category || 'Coats'}). ${desc}${extras} Link: /products/${product._id}`;
}

function formatCatalog(products) {
  if (!products.length) {
    return 'Catalog is being updated. Browse /products soon.';
  }
  return products.map(formatProductLine).join('\n');
}

function buildSystemPrompt(context) {
  const blogLines = (context.blogs || [])
    .map((b) => `- ${b.title}: /blogs/${b.slug}`)
    .join('\n');

  return `You are the helpful shopping assistant for ${brand.name}, a custom coat and bespoke outerwear ecommerce store.

STORE PAGES:
- Home: /
- Shop coats: /products
- Cart: /cart
- Checkout: /checkout (sign in required)
- My orders: /my-orders
- Wishlist: /wishlist
- Custom coat builder: /custom-coat
- Blog: /blogs
- Contact: /contact
- About: /about
- Book fitting / appointment: /contact

POLICIES (summarize briefly when asked):
- Custom sizing and tailoring available; measurements can be discussed at contact.
- Personalization: fabrics, lining, buttons, monogramming on many coats.
- Shipping shown at checkout; orders processed promptly.
- Returns: ready-to-wear often within 30 days; heavily customized pieces may be final sale.
- Prices on each product page; typical range roughly $249–$399+.

PRODUCT CATALOG (recommend from this list only; include name, price, and link path):
${formatCatalog(context.products)}

${blogLines ? `RECENT BLOG POSTS:\n${blogLines}` : ''}

RULES:
- Answer only about ${brand.name}, coats, tailoring, shopping on this site, orders, and support.
- Be friendly and concise (under 150 words unless listing products).
- For product suggestions, name 1–3 real items from the catalog with prices and /products/ links.
- If unsure, suggest /products or /contact rather than inventing products.
- Never mention ice cream, pints, or unrelated food products.`;
}

function findProductMatch(normalized, products) {
  return products.find((p) => {
    const name = String(p.name || '').toLowerCase();
    return name && normalized.includes(name);
  });
}

function filterProductsForIntent(normalized, products) {
  if (!products.length) return [];

  if (/(winter|cold|warm|snow)/.test(normalized)) {
    const winter = products.filter((p) =>
      /overcoat|wool|trench|cashmere|heritage/i.test(`${p.name} ${p.category} ${p.description}`)
    );
    if (winter.length) return winter;
  }

  if (/(formal|office|business|event|wedding)/.test(normalized)) {
    const formal = products.filter((p) =>
      /overcoat|topcoat|classic|heritage|wool/i.test(`${p.name} ${p.category}`)
    );
    if (formal.length) return formal;
  }

  if (/(modern|casual|city|daily)/.test(normalized)) {
    const modern = products.filter((p) => /modern|single/i.test(`${p.name} ${p.category}`));
    if (modern.length) return modern;
  }

  if (/(premium|luxury|best|special)/.test(normalized)) {
    const premium = products.filter((p) => /premium|cashmere/i.test(`${p.name} ${p.category}`));
    if (premium.length) return premium;
  }

  if (/(trench|rain)/.test(normalized)) {
    const trench = products.filter((p) => /trench/i.test(`${p.name} ${p.category}`));
    if (trench.length) return trench;
  }

  return products;
}

function buildProductSuggestionReply(normalized, products) {
  const picks = filterProductsForIntent(normalized, products).slice(0, 3);
  if (!picks.length) {
    return `Browse our full collection at /products — we offer classic overcoats, modern coats, trench styles, and premium topcoats. Tell me your occasion (winter, formal, daily) for a tighter suggestion.`;
  }

  const lines = picks.map((p) => `• ${p.name} ($${Number(p.price).toFixed(2)}) — /products/${p._id}`);
  return `Here are coats I recommend for you:\n${lines.join('\n')}\nSee all styles at /products.`;
}

function localChatAnswer(question, context = {}) {
  const normalized = String(question || '').toLowerCase().trim();
  const products = context.products || [];
  const blogs = context.blogs || [];

  if (!normalized) {
    return `Hello! I am the ${brand.name} assistant. Ask me about coat recommendations, fabrics, sizing, cart, checkout, orders, blogs, or contact support.`;
  }

  if (/(thanks|thank you|thx|cheers|appreciate)/.test(normalized)) {
    return 'You are welcome! Ask anytime about coats, customization, or your order.';
  }

  if (/(hello|hi|hey|good morning|good evening|greetings|howdy)/.test(normalized)) {
    return `Hello! Welcome to ${brand.name}. I can suggest coats from our catalog, explain customization options, or help with cart, checkout, and orders. What are you looking for today?`;
  }

  const matched = findProductMatch(normalized, products);
  if (matched) {
    const options = (matched.flavourOptions || []).map((o) => o.name).filter(Boolean);
    const optionText = options.length ? ` Fabric/finish options include: ${options.join(', ')}.` : '';
    return `${matched.name} costs $${Number(matched.price).toFixed(2)}.${optionText} ${matched.shortDescription || ''} View details: /products/${matched._id}`;
  }

  if (
    /(suggest|recommend|which|what should|looking for|show me|best coat|good coat|need a coat|help me choose|pick a)/.test(
      normalized
    ) ||
    (/(coat|overcoat|jacket|trench|topcoat)/.test(normalized) &&
      /(buy|shop|get|find|choose|want)/.test(normalized))
  ) {
    return buildProductSuggestionReply(normalized, products);
  }

  if (/(what do you sell|what products|catalog|collection|shop)/.test(normalized)) {
    if (!products.length) return 'Visit /products to explore our coat collection.';
    const preview = products.slice(0, 4).map((p) => `• ${p.name} ($${Number(p.price).toFixed(2)})`).join('\n');
    return `We sell custom and ready-to-tailor coats including:\n${preview}\nFull catalog: /products`;
  }

  if (/(size|fit|measurement|measure|sizing|alteration)/.test(normalized)) {
    return 'We offer standard sizes plus custom tailoring. Check each product page for fit notes, or book an appointment via /contact for personal measurements. Delivery for bespoke pieces is typically 5–6 weeks.';
  }

  if (/(customi|personal|monogram|embroider|lining|button|fabric|finish|option)/.test(normalized)) {
    return 'Customize with fabric choices, lining, buttons, and monogramming. On /products use "Customize & Add" or open /custom-coat for a full bespoke request. Our team can guide you at /contact.';
  }

  if (/(shipping|delivery|dispatch|how long|arrive|ship)/.test(normalized)) {
    return 'Shipping cost and timing appear at checkout. Ready-to-wear ships after processing; bespoke coats may take several weeks. Free shipping is noted on many product pages.';
  }

  if (/(return|exchange|refund|cancel|policy)/.test(normalized)) {
    return 'Ready-to-wear items can often be returned within 30 days if unused. Fully customized coats may be final sale — check the product page or ask via /contact with your order number.';
  }

  if (/(track|order status|my order|where is my order|order history)/.test(normalized)) {
    return 'Sign in and open /my-orders to see status and history. After checkout you will receive confirmation; contact us at /contact if you need an update.';
  }

  if (/(cart|bag|basket)/.test(normalized)) {
    return 'View /cart to update quantities or remove items. Custom fabric selections appear under each line item. Proceed to /checkout when ready.';
  }

  if (/(checkout|pay|payment|coupon|discount|promo)/.test(normalized)) {
    return 'Go to /checkout after signing in. Enter shipping details, review totals, and apply any coupon on the checkout page.';
  }

  if (/(wishlist|save|saved|favourite|favorite)/.test(normalized)) {
    return 'Sign in, then use "Add to Wishlist" on a product page. All saved coats are at /wishlist.';
  }

  if (/(custom coat|bespoke|builder|appointment|book|fitting)/.test(normalized)) {
    return 'Use /custom-coat to submit a bespoke coat request (lining, pockets, initials, and more). For a fitting appointment, visit /contact.';
  }

  if (/(blog|article|journal|read)/.test(normalized)) {
    if (!blogs.length) return 'Visit /blogs for style guides and coat care tips.';
    const list = blogs.slice(0, 3).map((b) => `• ${b.title} — /blogs/${b.slug}`).join('\n');
    return `Recent articles:\n${list}\nMore at /blogs`;
  }

  if (/(price|cost|how much|expensive|cheap|budget|afford)/.test(normalized)) {
    if (products.length) {
      const min = Math.min(...products.map((p) => p.price));
      const max = Math.max(...products.map((p) => p.price));
      return `Coats on our site range from about $${min.toFixed(0)} to $${max.toFixed(0)} depending on style and fabric. Each /products page shows the exact price.`;
    }
    return 'Prices vary by style and fabric — typically from about $249 upward. Browse /products for exact pricing.';
  }

  if (/(wool|cashmere|fabric|material|quality|leather|cotton|gabardine)/.test(normalized)) {
    return 'We use premium wool, cashmere blends, cotton gabardine, and other tailoring fabrics. Each product lists available fabric options. Tell me your climate or occasion for a specific recommendation.';
  }

  if (/(winter|formal|office|work|wedding|event)/.test(normalized)) {
    return buildProductSuggestionReply(normalized, products);
  }

  if (/(sign in|sign up|account|register|log in|password)/.test(normalized)) {
    return 'Create an account at /auth/signup or sign in at /auth/signin to checkout, track orders, and use your wishlist.';
  }

  if (/(contact|support|help|email|phone|talk to|human|staff)/.test(normalized)) {
    return 'Reach our team on /contact for sizing help, appointments, or order questions. I can also answer common shopping questions here.';
  }

  if (/(about|who are you|company|brand|story)/.test(normalized)) {
    return `${brand.name} specializes in custom coats and tailored outerwear designed by you. Learn more at /about or start shopping at /products.`;
  }

  if (/(stock|available|in stock|sold out)/.test(normalized)) {
    return 'Availability and stock count are shown on each product page at /products. If a coat is in stock, you can add it to cart immediately.';
  }

  if (/(add to cart|buy now|purchase|order)/.test(normalized)) {
    return 'Open a coat on /products, choose quantity (and customization if offered), then Add to Cart. Review everything at /cart before checkout.';
  }

  if (/(faq|question)/.test(normalized)) {
    return 'Common topics: sizing, fabrics, shipping, returns, customization, and orders. Ask me anything specific or visit /contact.';
  }

  return `I can help with coat suggestions, fabrics, sizing, cart (/cart), checkout, orders (/my-orders), wishlist, blogs (/blogs), and contact (/contact). Try asking "Recommend a coat for winter" or name a style you need.`;
}

async function getChatAnswer(question) {
  const trimmed = String(question || '').trim();
  const context = await getStoreContext();

  if (!trimmed) {
    return localChatAnswer('', context);
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) {
    return localChatAnswer(trimmed, context);
  }

  try {
    const answer = await callOpenAI(
      [
        { role: 'system', content: buildSystemPrompt(context) },
        { role: 'user', content: trimmed }
      ],
      { maxTokens: 450 }
    );
    if (answer) {
      return answer;
    }
  } catch (error) {
    console.error('AI chat error:', error.message || error);
  }

  return localChatAnswer(trimmed, context);
}

module.exports = {
  getStoreContext,
  localChatAnswer,
  getChatAnswer,
  buildSystemPrompt
};

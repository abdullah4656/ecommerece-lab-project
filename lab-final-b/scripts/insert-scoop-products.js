const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/customized-coats';

const productData = [
  {
    name: 'Midnight Cocoa Swirl Pint',
    price: 11.5,
    rarity: 'Signature',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Deep cocoa gelato folded with dark fudge ribbons and sea-salt crunch.',
    shortDescription: 'Dark cocoa, fudge ribbons, sea-salt crunch.',
    stock: 42,
    flavourOptions: [
      { name: 'Dark Cocoa', note: 'Rich and bittersweet', color: '#6f4a3b' },
      { name: 'Fudge Ribbon', note: 'Velvety swirl', color: '#5a3227' },
      { name: 'Sea-Salt Crunch', note: 'Sweet-salty finish', color: '#d7b796' }
    ]
  },
  {
    name: 'Blueberry Cheesecake Pint',
    price: 10.75,
    rarity: 'Signature',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Creamy cheesecake base layered with blueberry compote and biscuit crumble.',
    shortDescription: 'Cheesecake base with blueberry and biscuit crunch.',
    stock: 38,
    flavourOptions: [
      { name: 'Cheesecake Cream', note: 'Tangy and smooth', color: '#efe6d1' },
      { name: 'Blueberry Compote', note: 'Bright berry notes', color: '#5f74d9' },
      { name: 'Biscuit Crumble', note: 'Buttery texture', color: '#cda57a' }
    ]
  },
  {
    name: 'Mango Coconut Cloud Pint',
    price: 10.25,
    rarity: 'Seasonal',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Tropical mango sorbet marbled with coconut cream and toasted flakes.',
    shortDescription: 'Bright mango with coconut cream.',
    stock: 34,
    flavourOptions: [
      { name: 'Alphonso Mango', note: 'Juicy and floral', color: '#ffbe55' },
      { name: 'Coconut Cream', note: 'Soft and mellow', color: '#f4f0df' },
      { name: 'Toasted Coconut', note: 'Nutty finish', color: '#bf8b53' }
    ]
  },
  {
    name: 'Pistachio Honey Crunch Pint',
    price: 12,
    rarity: 'Reserve',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Roasted pistachio base with wildflower honey and caramelized nut brittle.',
    shortDescription: 'Roasted pistachio and honey brittle.',
    stock: 28,
    flavourOptions: [
      { name: 'Roasted Pistachio', note: 'Earthy and rich', color: '#8ba86f' },
      { name: 'Wildflower Honey', note: 'Floral sweetness', color: '#e0b84b' },
      { name: 'Nut Brittle', note: 'Caramel snap', color: '#b87a43' }
    ]
  },
  {
    name: 'Strawberry Matcha Velvet Pint',
    price: 11,
    rarity: 'Signature',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Silky matcha cream paired with strawberry ribbons and white chocolate pearls.',
    shortDescription: 'Matcha cream, strawberry ribbons, white chocolate.',
    stock: 31,
    flavourOptions: [
      { name: 'Ceremonial Matcha', note: 'Smooth green tea body', color: '#7ea66e' },
      { name: 'Strawberry Ribbon', note: 'Fresh fruit lift', color: '#ef6c87' },
      { name: 'White Chocolate Pearl', note: 'Creamy sweetness', color: '#f4ead6' }
    ]
  },
  {
    name: 'Caramel Coffee Crunch Pint',
    price: 11.25,
    rarity: 'Reserve',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Cold-brew coffee base with salted caramel and espresso bean crunch.',
    shortDescription: 'Cold brew coffee, caramel, espresso crunch.',
    stock: 29,
    flavourOptions: [
      { name: 'Cold Brew Cream', note: 'Toasty coffee depth', color: '#8b6248' },
      { name: 'Salted Caramel', note: 'Sweet-salty swirl', color: '#cf9353' },
      { name: 'Espresso Crisp', note: 'Bold crackle', color: '#5b3e2f' }
    ]
  },
  {
    name: 'Vanilla Berry Ripple Pint',
    price: 10.5,
    rarity: 'Signature',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Madagascar vanilla with raspberry ripple and shortbread cookie crumble.',
    shortDescription: 'Vanilla cream with berry ripple and cookie crunch.',
    stock: 37,
    flavourOptions: [
      { name: 'Madagascar Vanilla', note: 'Warm and creamy', color: '#f0e2c4' },
      { name: 'Raspberry Ribbon', note: 'Bright fruit tang', color: '#d25478' },
      { name: 'Shortbread Crumble', note: 'Buttery crunch', color: '#caa276' },
      { name: 'Cream Top Swirl', note: 'Extra smooth finish', color: '#f8efe0' }
    ]
  },
  {
    name: 'Hazelnut Praline Pint',
    price: 11.75,
    rarity: 'Reserve',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Roasted hazelnut cream with praline shards and silky milk chocolate folds.',
    shortDescription: 'Roasted hazelnut, praline shards, milk chocolate.',
    stock: 30,
    flavourOptions: [
      { name: 'Roasted Hazelnut', note: 'Nutty depth', color: '#a1785a' },
      { name: 'Praline Crunch', note: 'Caramelized snap', color: '#bb8556' },
      { name: 'Milk Chocolate Fold', note: 'Smooth chocolate layer', color: '#7a4f3d' },
      { name: 'Toffee Glaze', note: 'Sweet finish', color: '#c58a4f' }
    ]
  },
  {
    name: 'Lemon Basil Sorbet Pint',
    price: 9.95,
    rarity: 'Seasonal',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Zesty lemon sorbet with basil syrup ribbons and candied peel bites.',
    shortDescription: 'Lemon sorbet, basil syrup, candied zest.',
    stock: 35,
    flavourOptions: [
      { name: 'Lemon Zest Sorbet', note: 'Citrus-forward', color: '#f4dd69' },
      { name: 'Sweet Basil Syrup', note: 'Herbal refresh', color: '#82a76a' },
      { name: 'Candied Peel', note: 'Bright chew', color: '#e7c258' },
      { name: 'Cool Mint Mist', note: 'Icy finish', color: '#9ecdc0' }
    ]
  },
  {
    name: 'Cookie Butter Dream Pint',
    price: 10.95,
    rarity: 'Signature',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Spiced cookie butter base layered with biscuit chunks and caramel swirls.',
    shortDescription: 'Spiced cookie butter with caramel ribbons.',
    stock: 33,
    flavourOptions: [
      { name: 'Spiced Cookie Butter', note: 'Warm cinnamon notes', color: '#c18b5c' },
      { name: 'Biscuit Chunks', note: 'Crunchy layers', color: '#d5aa7f' },
      { name: 'Caramel Swirl', note: 'Soft sweetness', color: '#bf7f49' },
      { name: 'Vanilla Cream Core', note: 'Balanced finish', color: '#efdfc5' }
    ]
  },
  {
    name: 'Cherry Chocolate Noir Pint',
    price: 12.15,
    rarity: 'Reserve',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Dark chocolate base with black cherry compote and cocoa nib crackle.',
    shortDescription: 'Dark chocolate with cherry compote.',
    stock: 27,
    flavourOptions: [
      { name: 'Noir Chocolate', note: 'Intense cocoa', color: '#4f342a' },
      { name: 'Black Cherry Compote', note: 'Fruity acidity', color: '#8c2b4c' },
      { name: 'Cocoa Nib Crunch', note: 'Toasty bite', color: '#6a4937' },
      { name: 'Cherry Syrup Ribbon', note: 'Sweet finish', color: '#b3446a' }
    ]
  },
  {
    name: 'Salted Maple Pecan Pint',
    price: 11.35,
    rarity: 'Signature',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Maple cream with toasted pecans, sea-salt caramel, and butter toffee chips.',
    shortDescription: 'Maple cream and toasted pecans.',
    stock: 32,
    flavourOptions: [
      { name: 'Maple Cream', note: 'Woodsy sweetness', color: '#d2a164' },
      { name: 'Toasted Pecan', note: 'Nut-rich crunch', color: '#9b6d4a' },
      { name: 'Sea-Salt Caramel', note: 'Balanced sweet-salty', color: '#c4834c' },
      { name: 'Toffee Chip', note: 'Buttery crackle', color: '#b97c45' }
    ]
  },
  {
    name: 'Passionfruit Yogurt Pint',
    price: 10.35,
    rarity: 'Seasonal',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Tangy yogurt base infused with passionfruit puree and honey granola bites.',
    shortDescription: 'Tangy yogurt with passionfruit notes.',
    stock: 36,
    flavourOptions: [
      { name: 'Yogurt Cream', note: 'Lightly tart', color: '#f4f0df' },
      { name: 'Passionfruit Puree', note: 'Tropical zing', color: '#ebb243' },
      { name: 'Honey Granola', note: 'Crunchy sweetness', color: '#c99863' },
      { name: 'Citrus Zest', note: 'Fresh aroma', color: '#e6d06a' }
    ]
  },
  {
    name: 'Mocha Brownie Batter Pint',
    price: 11.85,
    rarity: 'Reserve',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Mocha cream packed with fudgy brownie chunks and chocolate sauce ribbons.',
    shortDescription: 'Mocha base with brownie chunks.',
    stock: 28,
    flavourOptions: [
      { name: 'Mocha Espresso', note: 'Coffee + cocoa blend', color: '#7b5441' },
      { name: 'Brownie Chunk', note: 'Dense chocolate chew', color: '#5f3a2d' },
      { name: 'Chocolate Sauce', note: 'Silky swirl', color: '#5a3125' },
      { name: 'Cocoa Dust', note: 'Bittersweet finish', color: '#6e4838' }
    ]
  },
  {
    name: 'Rose Pistachio Kulfi Pint',
    price: 11.45,
    rarity: 'Seasonal',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Kulfi-inspired cream with rose syrup, pistachio bits, and saffron threads.',
    shortDescription: 'Kulfi style with rose and pistachio.',
    stock: 26,
    flavourOptions: [
      { name: 'Kulfi Cream', note: 'Dense and aromatic', color: '#e8d7ba' },
      { name: 'Rose Syrup', note: 'Floral sweetness', color: '#d47c99' },
      { name: 'Pistachio Bits', note: 'Nutty crunch', color: '#8aa56a' },
      { name: 'Saffron Milk', note: 'Warm finish', color: '#d9b04f' }
    ]
  },
  {
    name: 'Banoffee Pie Pint',
    price: 10.9,
    rarity: 'Signature',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Banana cream with toffee ribbons, pie crust crumble, and cocoa dust.',
    shortDescription: 'Banana cream and toffee swirl.',
    stock: 34,
    flavourOptions: [
      { name: 'Banana Cream', note: 'Smooth and fruity', color: '#e6cf73' },
      { name: 'Toffee Ribbon', note: 'Sticky caramel notes', color: '#c2844f' },
      { name: 'Pie Crust Crumble', note: 'Buttery texture', color: '#c79a6e' },
      { name: 'Cocoa Dust', note: 'Light chocolate finish', color: '#8e6650' }
    ]
  },
  {
    name: 'Black Sesame Honey Pint',
    price: 11.2,
    rarity: 'Reserve',
    image: '/assets/blackseamer-honey-pint.jpg',
    description: 'Toasted black sesame cream balanced with floral honey and brittle shards.',
    shortDescription: 'Toasted sesame with floral honey.',
    stock: 24,
    flavourOptions: [
      { name: 'Black Sesame Cream', note: 'Toasty and deep', color: '#6b6766' },
      { name: 'Floral Honey', note: 'Sweet lift', color: '#d8ad49' },
      { name: 'Sesame Brittle', note: 'Crunchy finish', color: '#8d7f6f' },
      { name: 'Vanilla Accent', note: 'Creamy balance', color: '#f0e2c4' }
    ]
  }
];

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to ${MONGODB_URI}`);

    let inserted = 0;
    let updated = 0;

    for (const item of productData) {
      const existing = await Product.findOne({ name: item.name });
      if (existing) {
        await Product.updateOne({ _id: existing._id }, { $set: item });
        updated += 1;
      } else {
        await Product.create(item);
        inserted += 1;
      }
    }

    console.log(`Products processed: ${productData.length}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }
}

run();

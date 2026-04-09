const mongoose = require('mongoose');

const flavourOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    color: {
      type: String,
      trim: true,
      default: '#ffe5c2'
    }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  rarity: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: false,
    trim: true
  },
  image: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  shortDescription: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number,
    default: 50,
    min: 0
  },
  flavourOptions: {
    type: [flavourOptionSchema],
    default: []
  },
  seoTitle: {
    type: String,
    trim: true,
    default: ''
  },
  seoDescription: {
    type: String,
    trim: true,
    default: ''
  },
  seoKeywords: {
    type: String,
    trim: true,
    default: ''
  },
  metaRobots: {
    type: String,
    trim: true,
    default: 'index, follow'
  },
  canonicalUrl: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

productSchema.index({ name: 'text', description: 'text', category: 'text', seoKeywords: 'text' });

module.exports = mongoose.model('Product', productSchema);


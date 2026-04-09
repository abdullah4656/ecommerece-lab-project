const mongoose = require('mongoose');

const seoSettingSchema = new mongoose.Schema(
  {
    siteTitle: {
      type: String,
      required: true,
      trim: true,
      default: 'ScoopCraft Pints'
    },
    titleSeparator: {
      type: String,
      trim: true,
      default: '|'
    },
    metaDescription: {
      type: String,
      required: true,
      trim: true,
      default: 'Build custom 3-flavour and 4-flavour artisan ice cream pints with one-time or subscription delivery.'
    },
    metaKeywords: {
      type: String,
      trim: true,
      default: 'custom ice cream pints, flavour builder, artisan dessert, pint subscription'
    },
    canonicalBaseUrl: {
      type: String,
      trim: true,
      default: ''
    },
    robots: {
      type: String,
      trim: true,
      default: 'index, follow'
    },
    ogImage: {
      type: String,
      trim: true,
      default: '/assets/blackseamer-honey-pint.jpg'
    },
    twitterCard: {
      type: String,
      trim: true,
      default: 'summary_large_image'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SeoSetting', seoSettingSchema);

const mongoose = require('mongoose');
const brand = require('../config/brand');

const seoSettingSchema = new mongoose.Schema(
  {
    siteTitle: {
      type: String,
      required: true,
      trim: true,
      default: brand.siteTitle
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
      default: brand.metaDescription
    },
    metaKeywords: {
      type: String,
      trim: true,
      default: brand.metaKeywords
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
      default: brand.defaultOgImage
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

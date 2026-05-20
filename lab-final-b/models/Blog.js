const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true
    },
    excerpt: {
      type: String,
      trim: true,
      default: ''
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    author: {
      type: String,
      trim: true,
      default: 'Admin'
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    generatedByAI: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

blogSchema.index({ title: 'text', excerpt: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Blog', blogSchema);

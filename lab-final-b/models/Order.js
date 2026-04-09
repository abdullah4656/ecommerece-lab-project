const mongoose = require('mongoose');

const trackingEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['Placed', 'Processing', 'Delivered'],
      required: true
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
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
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0
    },
    selectedFlavours: {
      type: [String],
      default: []
    },
    scoopCount: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true }
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: v => Array.isArray(v) && v.length > 0
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    plan: {
      type: String,
      enum: ['one-time', 'subscription'],
      default: 'one-time'
    },
    couponCode: {
      type: String,
      trim: true,
      default: null
    },
    status: {
      type: String,
      enum: ['Placed', 'Processing', 'Delivered'],
      default: 'Placed'
    },
    trackingHistory: {
      type: [trackingEventSchema],
      default: [{ status: 'Placed', note: 'Order confirmed', updatedAt: new Date() }]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Order', orderSchema);



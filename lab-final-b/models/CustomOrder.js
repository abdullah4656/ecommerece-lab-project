const mongoose = require('mongoose');

const customOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerEmail: String,
  customerName: String,
  customization: {
    interiorConstruction: String,
    pockets: String,
    shoulderPads: String,
    chopped: String,
    innerLining: String,
    stitchingStyle: String,
    initials: String,
    fontStyle: String
  },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CustomOrder', customOrderSchema);
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  ordersArray:{type:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],default:[]},
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;

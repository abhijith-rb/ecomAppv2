const mongoose = require('mongoose');

const connectDB = async (mongoURI) => {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.log('Failed connecting to MongoDB:', err);
  }
};

module.exports = connectDB;

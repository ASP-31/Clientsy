const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // 1. Swapped 'localhost' for '127.0.0.1' in the fallback
    // 2. Removed the options object { useNewUrlParser: true, useUnifiedTopology: true }
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clientsy');
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
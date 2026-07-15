const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const localUri = 'mongodb://127.0.0.1:27017/clientsy';

  if (uri) {
    try {
      console.log('Attempting connection to remote MongoDB Atlas...');
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`MongoDB Connected (Atlas): ${conn.connection.host}`);
      isConnected = true;
      return;
    } catch (error) {
      console.warn(`Atlas connection failed: ${error.message}. Falling back to local MongoDB...`);
    }
  }

  try {
    const conn = await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`MongoDB Connected (Local): ${conn.connection.host}`);
    isConnected = true;
  } catch (error) {
    console.error(`Warning: Both remote and local MongoDB connections failed. Details: ${error.message}`);
    console.log('Starting server in offline demo mode. API routes will return a connection warning.');
    isConnected = false;
  }
};

const checkConnection = (req, res, next) => {
  if (!isConnected && mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is currently offline. Please configure your .env MONGODB_URI or run a local MongoDB instance.'
    });
  }
  next();
};

module.exports = { connectDB, checkConnection };
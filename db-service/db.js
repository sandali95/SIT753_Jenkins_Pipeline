const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env

const MONGODB_URI = process.env.MONGODB_URI;
console.log(MONGODB_URI)

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error}`);
    process.exit(1);
  }
};

module.exports = { connectDB };

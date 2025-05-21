const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const winston = require("winston");
const cors = require("cors"); 
require('dotenv').config(); // Load environment variables from .env


const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// Configure Winston Logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log" }),
  ],
});

const MONGO_URI = process.env.MONGODB_URI;
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => logger.info("MongoDB connected for User Service"))
  .catch(err => logger.error("MongoDB connection error:", err));

// Define the User schema and model
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String  
});
const User = mongoose.model("user", UserSchema);

// Secret key for signing JWTs. Secure it via environment variables in production.
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// User Signup Endpoint
app.post('/signup', async (req, res) => {
  console.log("Received signup request");
  const { username, password } = req.body;
  console.log(  `Username: ${username}, Password: ${password}`);
  try {
    const newUser = new User({ username, password });
    await newUser.save();
    logger.info(`New user created: ${username}`);
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.log(err);
    logger.error(`Error creating user: ${err.message}`);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// User Login Endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (!user) {
      logger.warn(`Invalid login attempt for username: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Generate token valid for 1 hour
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    logger.info(`User logged in: ${username}`);
    res.json({ token });
  } catch (err) {
    logger.error(`Error during login: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unknown Route Handler (404)
app.use((req, res, next) => {
  logger.warn(`404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource does not exist.",
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(`500 - Server Error: ${err.message}`);
  res.status(500).json({ error: "Internal Server Error Occurred", message: err.message });
});

module.exports = { app, User };
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => logger.info(`User Service running on port ${PORT}`));
}


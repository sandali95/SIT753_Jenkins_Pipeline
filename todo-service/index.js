const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const winston = require("winston");
const cors = require("cors"); 
require('dotenv').config(); // Load environment variables from .env

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
  .then(() => logger.info("MongoDB connected for Todo Service"))
  .catch(err => logger.error("MongoDB connection error:", err));

// Define the Todo schema and model
const TodoSchema = new mongoose.Schema({
  userId: String,
  title: String,
  completed: { type: Boolean, default: false }
});
const Todo = mongoose.model('Todo', TodoSchema);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// JWT Authentication Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    logger.warn("Unauthorized access attempt - No token provided");
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      logger.warn(`Invalid token: ${err.message}`);
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get all todos for the authenticated user
app.get('/todos', authenticate, async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.user.id });
    logger.info(`Todos fetched for user: ${req.user.username}`);
    res.json(todos);
  } catch (err) {
    logger.error(`Error fetching todos: ${err.message}`);
    res.status(500).json({ error: 'Error fetching todos' });
  }
});

// Create a new todo item
app.post('/todos', authenticate, async (req, res) => {
  const { title } = req.body;
  try {
    const newTodo = new Todo({ userId: req.user.id, title });
    await newTodo.save();
    logger.info(`New todo added for user: ${req.user.username}`);
    res.status(201).json(newTodo);
  } catch (err) {
    logger.error(`Error creating todo: ${err.message}`);
    res.status(500).json({ error: 'Error creating todo' });
  }
});

// Update an existing todo
app.put('/todos/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;
  try {
    const updatedTodo = await Todo.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { title, completed },
      { new: true }
    );
    if (!updatedTodo) {
      logger.warn(`Todo not found for update: ID ${id} by user: ${req.user.username}`);
      return res.status(404).json({ error: 'Todo not found' });
    }
    logger.info(`Todo updated: ID ${id} for user: ${req.user.username}`);
    res.json(updatedTodo);
  } catch (err) {
    logger.error(`Error updating todo: ${err.message}`);
    res.status(500).json({ error: 'Error updating todo' });
  }
});

// Delete a todo item
app.delete('/todos/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const deletedTodo = await Todo.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deletedTodo) {
      logger.warn(`Todo not found for deletion: ID ${id} for user: ${req.user.username}`);
      return res.status(404).json({ error: 'Todo not found' });
    }
    logger.info(`Todo deleted: ID ${id} for user: ${req.user.username}`);
    res.json({ message: 'Todo deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting todo: ${err.message}`);
    res.status(500).json({ error: 'Error deleting todo' });
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

module.exports = { app,Todo };              
if (require.main === module) {    
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => logger.info(`Todo Service running on port ${PORT}`));
}


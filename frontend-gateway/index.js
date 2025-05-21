// index.js
const express = require('express');
const path    = require('path');
const winston = require('winston');
require('dotenv').config(); // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 3002;

// URLs of your microservices
const USER_SERVICE_URL = process.env.USER_SERVICE_URL ;
const TODO_SERVICE_URL = process.env.TODO_SERVICE_URL ;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Winston Logger
const logger = winston.createLogger({
  level: "info", // Log level (info, warn, error, etc.)
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(), // Logs to console
    new winston.transports.File({ filename: "logs/error.log" }), // Logs to file
  ],
});

// ─── Auth proxy ───────────────────────────────────────────────────────────────
app.post('/signup', async (req, res, next) => {
  try {
    const micro = await fetch(`${USER_SERVICE_URL}/signup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(req.body)
    });
    const data = await micro.json();
    res.status(micro.status).json(data);
  } catch (err) { next(err); }
});

app.post('/login', async (req, res, next) => {
  try {
    const micro = await fetch(`${USER_SERVICE_URL}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(req.body)
    });
    const data = await micro.json();
    res.status(micro.status).json(data);
  } catch (err) { next(err); }
});

// ─── Todo proxy ───────────────────────────────────────────────────────────────
app.get('/todos', async (req, res, next) => {
  try {
    const micro = await fetch(`${TODO_SERVICE_URL}/todos`, {
      headers: { 'Authorization': req.headers.authorization }
    });
    const todos = await micro.json();
    res.status(micro.status).json(todos);
  } catch (err) { next(err); }
});

app.post('/todos', async (req, res, next) => {
  try {
    const micro = await fetch(`${TODO_SERVICE_URL}/todos`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify(req.body)
    });
    const data = await micro.json();
    res.status(micro.status).json(data);
  } catch (err) { next(err); }
});

app.patch('/todos/:id', async (req, res, next) => {
  try {
    const micro = await fetch(`${TODO_SERVICE_URL}/todos/${req.params.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': req.headers.authorization }
    });
    const data = await micro.json();
    res.status(micro.status).json(data);
  } catch (err) { next(err); }
});

app.delete('/todos/:id', async (req, res, next) => {
  try {
    const micro = await fetch(`${TODO_SERVICE_URL}/todos/${req.params.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': req.headers.authorization }
    });
    res.status(micro.status).end();
  } catch (err) { next(err); }
});

// ─── Static & health ──────────────────────────────────────────────────────────
app.get('/home', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

app.get('/health', (req,res) =>
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
);

// ─── Error handlers ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});
app.use((req, res) =>
  res.status(404).json({ error: 'Not Found', message: 'No such route' })
);

if (require.main === module) {
  app.listen(PORT, () => console.log(`Gateway listening on ${PORT}`));
}

module.exports = app;

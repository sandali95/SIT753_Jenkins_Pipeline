
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongoServer;
let User;

beforeAll(async () => {
 
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET  = 'testsecret';

  const mod = require('./index');
  app = mod.app;
  User = mod.User;



  await User.findOneAndDelete({ username: 'alice' });

});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User Service Endpoints', () => {
  describe('GET /health', () => {
    it('should return status healthy + uptime + timestamp', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(typeof res.body.uptime).toBe('number');
      expect(typeof res.body.timestamp).toBe('string');
    });
  });

  describe('POST /signup', () => {
  
    it('should create a new user and return 201', async () => {
      const res = await request(app)
        .post('/signup')
        .send({ username: 'alice', password: 'pass123' });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: 'User created successfully' });
    });

    it('should return 500 on duplicate username', async () => {
      // same username again
      const res = await request(app)
        .post('/signup')
        .send({ username: 'alice', password: 'pass123' });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error creating user');
    });
  });

  describe('POST /login', () => {
    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/login')
        .send({ username: 'bob', password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should return a valid JWT on correct credentials', async () => {
      // first, create user
      await request(app)
        .post('/signup')
        .send({ username: 'charlie', password: 'mypw' });

      const res = await request(app)
        .post('/login')
        .send({ username: 'charlie', password: 'mypw' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      // verify token payload
      const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(payload).toMatchObject({ username: 'charlie' });
      expect(payload).toHaveProperty('id');
    });
  });

  describe('404 Handler', () => {
    it('should return JSON 404 for unknown routes', async () => {
      const res = await request(app).get('/no-such-route');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        error: 'Not Found',
        message: 'The requested resource does not exist.'
      });
    });
  });
});

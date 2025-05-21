// tests/todo.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app, mongoServer, token, todoId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET  = 'testsecret';

  app = require('./index');  

  token = jwt.sign(
    { id: 'user1', username: 'tester' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Health Check', () => {
  it('GET /health → 200 + status/uptime/timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'healthy' });
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('Auth Middleware', () => {
  it('GET /todos without token → 401 No token provided', async () => {
    const res = await request(app).get('/todos');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'No token provided' });
  });

  it('GET /todos with invalid token → 401 Invalid token', async () => {
    const res = await request(app)
      .get('/todos')
      .set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid token' });
  });
});

describe('Todos CRUD', () => {
  it('GET /todos (none exist) → []', async () => {
    const res = await request(app)
      .get('/todos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /todos → 201 + new todo', async () => {
    const res = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'First Todo' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'First Todo',
      completed: false,
      userId: 'user1'
    });
    expect(res.body).toHaveProperty('_id');
    todoId = res.body._id;
  });

  it('GET /todos → array with one item', async () => {
    const res = await request(app)
      .get('/todos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject({ title: 'First Todo' });
  });

  it('PUT /todos/:id → update title & completed', async () => {
    const res = await request(app)
      .put(`/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated', completed: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      _id: todoId,
      title: 'Updated',
      completed: true,
      userId: 'user1'
    });
  });

  it('PUT /todos/:nonexistent → 404 Todo not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/todos/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'X', completed: false });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  it('DELETE /todos/:id → 200 Todo deleted', async () => {
    const res = await request(app)
      .delete(`/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Todo deleted successfully' });
  });

  it('DELETE /todos/:same-id again → 404 Todo not found', async () => {
    const res = await request(app)
      .delete(`/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });
});

describe('404 Handler', () => {
  it('GET /nonexistent → 404 Not Found JSON', async () => {
    const res = await request(app).get('/no-route-here');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      error: 'Not Found',
      message: 'The requested resource does not exist.'
    });
  });
});

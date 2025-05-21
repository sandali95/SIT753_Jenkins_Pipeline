const request = require('supertest');
const mockingoose = require('mockingoose');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

let app;
let Todo;
let token;
let fakeTodoId;

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  const mod = require("./index");
  app = mod.app;
  Todo = mod.Todo;

  token = jwt.sign(
    { id: 'user1', username: 'tester' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  fakeTodoId = new mongoose.Types.ObjectId().toHexString(); // convert to string
});

afterEach(() => {
  mockingoose.resetAll();
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
    mockingoose(Todo).toReturn([], 'find');
    const res = await request(app)
      .get('/todos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /todos → 201 + new todo', async () => {
    const mockTodo = {
      _id: fakeTodoId,
      title: 'First Todo',
      completed: false,
      userId: 'user1'
    };
    mockingoose(Todo).toReturn(mockTodo, 'save');

    const res = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'First Todo' });

    expect(res.status).toBe(201);
  });

  it('GET /todos → array with one item', async () => {
    const mockTodos = [{
      _id: fakeTodoId,
      title: 'First Todo',
      completed: false,
      userId: 'user1'
    }];
    mockingoose(Todo).toReturn(mockTodos, 'find');

    const res = await request(app)
      .get('/todos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockTodos);
  });

  it('PUT /todos/:id → update title & completed', async () => {
    const updated = {
      _id: fakeTodoId,
      title: 'Updated',
      completed: true,
      userId: 'user1'
    };
    mockingoose(Todo).toReturn(updated, 'findOneAndUpdate');

    const res = await request(app)
      .put(`/todos/${fakeTodoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated', completed: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(updated);
  });

  it('PUT /todos/:nonexistent → 404 Todo not found', async () => {
    mockingoose(Todo).toReturn(null, 'findOneAndUpdate');

    const res = await request(app)
      .put(`/todos/${new mongoose.Types.ObjectId().toHexString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'X', completed: false });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Todo not found' });
  });

  it('DELETE /todos/:id → 200 Todo deleted', async () => {
    mockingoose(Todo).toReturn({ _id: fakeTodoId }, 'findOneAndDelete');

    const res = await request(app)
      .delete(`/todos/${fakeTodoId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Todo deleted successfully' });
  });

  it('DELETE /todos/:same-id again → 404 Todo not found', async () => {
    mockingoose(Todo).toReturn(null, 'findOneAndDelete');

    const res = await request(app)
      .delete(`/todos/${fakeTodoId}`)
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

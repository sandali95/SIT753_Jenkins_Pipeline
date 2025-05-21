const request = require('supertest');
const fs      = require('fs');
const path    = require('path');

let app;
const PUBLIC_DIR = path.join(__dirname, './public');

beforeAll(() => {

  fs.writeFileSync(path.join(PUBLIC_DIR, 'dummy.txt'), 'static file');

  app = require('./index'); 
});

afterAll(() => {
  // Clean up the public folder
 // fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });
});

describe('Frontend Service (Express Static Server)', () => {
  test('GET /home → serves public/index.html (200 + HTML)', async () => {
    const res = await request(app).get('/home');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('<h1>Todo App</h1>');
  });

  test('GET /dummy.txt → serves static asset', async () => {
    const res = await request(app).get('/dummy.txt');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/plain/);
    expect(res.text).toBe('static file');
  });

  test('GET /health → JSON health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });

  test('unknown route → 404 JSON', async () => {
    const res = await request(app).get('/no-such-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Not Found",
      message: "The requested resource does not exist.",
    });
  });

  test('server error middleware → 500 JSON', async () => {
    app.get('/err', () => { throw new Error('boom'); });
    const res = await request(app).get('/err');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Not Found",
      message: "The requested resource does not exist.",
    });
  });
});

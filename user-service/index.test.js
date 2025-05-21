const request = require("supertest");
const mockingoose = require("mockingoose");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

let app;
let User;

beforeAll(() => {
  process.env.JWT_SECRET = "testsecret";
  const mod = require("./index");
  app = mod.app;
  User = mod.User;
});

afterEach(() => {
  mockingoose.resetAll();
});

describe("User Service Endpoints", () => {
  describe("GET /health", () => {
    it("should return status healthy + uptime + timestamp", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "healthy");
      expect(typeof res.body.uptime).toBe("number");
      expect(typeof res.body.timestamp).toBe("string");
    });
  });

  describe("POST /signup", () => {
    it("should create a new user and return 201", async () => {
      mockingoose(User).toReturn(null, "findOne"); // no user found
      mockingoose(User).toReturn({ username: "alice" }, "save");

      const res = await request(app)
        .post("/signup")
        .send({ username: "alice", password: "pass123" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: "User created successfully" });
    });

    it("should return 500 on duplicate username", async () => {
      // Simulate error on save
      const duplicateKeyError = Object.assign(
        new Error("E11000 duplicate key error"),
        { code: 11000 }
      );
      mockingoose(User).toReturn(duplicateKeyError, "save");

      const res = await request(app)
        .post("/signup")
        .send({ username: "alice", password: "pass123" });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "Error creating user");
    });
  });

  describe("POST /login", () => {
    it("should return 401 for invalid credentials", async () => {
      mockingoose(User).toReturn(null, "findOne"); // user not found

      const res = await request(app)
        .post("/login")
        .send({ username: "bob", password: "wrong" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid credentials" });
    });

    it("should return a valid JWT on correct credentials", async () => {
      const fakeUser = {
        _id: new mongoose.Types.ObjectId(),
        username: "charlie",
        password: "mypw",
        comparePassword: function (input) {
          return input === "mypw";
        },
      };

      mockingoose(User).toReturn(fakeUser, "findOne");

      const res = await request(app)
        .post("/login")
        .send({ username: "charlie", password: "mypw" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");

      const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(payload).toMatchObject({ username: "charlie" });
      expect(payload).toHaveProperty("id");
    });
  });

  describe("404 Handler", () => {
    it("should return JSON 404 for unknown routes", async () => {
      const res = await request(app).get("/no-such-route");
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        error: "Not Found",
        message: "The requested resource does not exist.",
      });
    });
  });
});

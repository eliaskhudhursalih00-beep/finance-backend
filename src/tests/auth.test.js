const request = require("supertest");
const app = require("../../server");
const pool = require("../config/db");
const bcrypt = require("bcrypt");

jest.mock("../config/db", () => ({
  query: jest.fn(),
}));

describe("Auth Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should block registration if email/password missing", async () => {
    const res = await request(app).post("/api/register").send({ email: "test@test.com" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Email and password are required");
  });

  it("should successfully register a new user", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: "new@test.com" }] });

    const res = await request(app).post("/api/register").send({
      email: "new@test.com",
      password: "password123"
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User saved to database");
    expect(res.body.user.email).toBe("new@test.com");
  });

  it("should return 400 for duplicate email registration", async () => {
    const duplicateError = new Error("duplicate map");
    duplicateError.code = '23505';
    pool.query.mockRejectedValueOnce(duplicateError);

    const res = await request(app).post("/api/register").send({
      email: "existing@test.com",
      password: "password123"
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Email is already registered");
  });

  it("should login a user successfully and return a token", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);
    pool.query.mockResolvedValueOnce({ 
      rows: [{ id: 1, email: "login@test.com", password: hashedPassword }] 
    });

    const res = await request(app).post("/api/login").send({
      email: "login@test.com",
      password: "password123"
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Login successful");
    expect(res.body.token).toBeDefined();
  });

  it("should reject login with wrong password", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);
    pool.query.mockResolvedValueOnce({ 
      rows: [{ id: 1, email: "login@test.com", password: hashedPassword }] 
    });

    const res = await request(app).post("/api/login").send({
      email: "login@test.com",
      password: "wrongpassword"
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid password");
  });
});

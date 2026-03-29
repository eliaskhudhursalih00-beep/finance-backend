const request = require("supertest");
const app = require("../../server");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn(),
}));

const getToken = () =>
  jwt.sign({ id: 1, email: "test@test.com" }, process.env.JWT_SECRET || "testsecret", { expiresIn: "15m" });

describe("Budget Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject unauthenticated request", async () => {
    const res = await request(app).get("/api/budgets");
    expect(res.statusCode).toBe(401);
  });

  it("should get budgets for authenticated user", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, category_name: "Food", limit_amount: 500, current_spent: 120, category_color: "#10B981" }
      ]
    });
    pool.query.mockResolvedValueOnce({ rows: [{ count: "1" }] });

    const res = await request(app)
      .get("/api/budgets?month=2026-03")
      .set("Authorization", `Bearer ${getToken()}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.budgets || res.body)).toBe(true);
  });

  it("should create a new budget", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, category_id: 2, limit_amount: 300, month: "2026-03" }]
    });
    const res = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${getToken()}`)
      .send({ category_id: 2, amount: 300, month: "2026-03" });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("should reject budget with missing category", async () => {
    const res = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${getToken()}`)
      .send({ amount: 300, month: "2026-03" });
    expect(res.statusCode).toBe(400);
  });

  it("should reject budget with negative amount", async () => {
    const res = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${getToken()}`)
      .send({ category_id: 1, amount: -100, month: "2026-03" });
    expect(res.statusCode).toBe(400);
  });
});
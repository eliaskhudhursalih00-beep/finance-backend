const request = require("supertest");
const app = require("../../server");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({ query: jest.fn() }));

const generateTestToken = () => {
  return jwt.sign(
    { id: 1, email: "test@test.com" }, 
    process.env.JWT_SECRET || "production_ready_secret_key_123!", 
    { expiresIn: "1h" }
  );
};

describe("Transaction Endpoints", () => {
  let token;

  beforeAll(() => {
    token = generateTestToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should block unauthorized access", async () => {
    const res = await request(app).get("/api/transactions");
    expect(res.statusCode).toBe(401); 
    // Wait, the authMiddleware returns 401 usually.
  });

  it("should create a transaction successfully", async () => {
    const newTx = { type: "expense", amount: 50.5, category: "Food" };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 10, user_id: 1, ...newTx }] });

    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send(newTx);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Transaction created");
    expect(res.body.transaction.amount).toBe(50.5);
  });

  it("should reject creation if missing fields", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "expense" }); // missing amount/category

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Type, amount, and category are required");
  });

  it("should get transactions for user", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

    const res = await request(app)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it("should delete a transaction successfully", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 10 }] });

    const res = await request(app)
      .delete("/api/transactions/10")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Transaction deleted");
  });
});

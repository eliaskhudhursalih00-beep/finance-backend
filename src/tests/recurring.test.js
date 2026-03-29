const request = require("supertest");
const app = require("../../server");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { processRecurringTransactions } = require("../controllers/recurringController");

jest.mock("../config/db", () => ({
  query: jest.fn(),
}));

const getToken = () =>
  jwt.sign({ id: 1, email: "test@test.com" }, process.env.JWT_SECRET || "testsecret", { expiresIn: "15m" });

describe("Recurring Transaction Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject unauthenticated request", async () => {
    const res = await request(app).get("/api/recurring");
    expect(res.statusCode).toBe(401);
  });

  it("should get recurring transactions for authenticated user", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, category_name: "Rent", amount: 1200, frequency: "monthly", next_date: "2026-04-01", type: "expense" }
      ]
    });
    const res = await request(app)
      .get("/api/recurring")
      .set("Authorization", `Bearer ${getToken()}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should create a recurring transaction", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, category_id: 1, amount: 1200, frequency: "monthly", next_date: "2026-04-01", type: "expense" }]
    });
    const res = await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${getToken()}`)
      .send({
        category_id: 1,
        amount: 1200,
        type: "expense",
        frequency: "monthly",
        next_date: "2026-04-01"
      });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("should reject recurring with missing fields", async () => {
    const res = await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${getToken()}`)
      .send({ amount: 100 });
    expect(res.statusCode).toBe(400);
  });

  it("should delete a recurring transaction", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .delete("/api/recurring/1")
      .set("Authorization", `Bearer ${getToken()}`);
    expect([200, 204]).toContain(res.statusCode);
  });

  it("should reject invalid frequency value", async () => {
    const res = await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${getToken()}`)
      .send({
        category_id: 1,
        amount: 100,
        type: "expense",
        frequency: "yearly",
        next_date: "2026-04-01"
      });
    expect(res.statusCode).toBe(400);
  });
});

describe("Recurring Batch Processor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process due monthly items and increment next_date", async () => {
    pool.query
      .mockResolvedValueOnce({
        // 1. SELECT due items
        rows: [
          {
            id: 10,
            user_id: 1,
            category_id: 2,
            type: "expense",
            amount: 50,
            description: "Netflix",
            frequency: "monthly",
            next_date: "2026-03-01",
            is_active: true
          }
        ]
      })
      .mockResolvedValueOnce({
        // 2. SELECT category name
        rows: [{ name: "Entertainment" }]
      })
      .mockResolvedValueOnce({
        // 3. INSERT transaction
        rows: [{ id: 100 }]
      })
      .mockResolvedValueOnce({
        // 4. UPDATE recurring next_date
        rows: [{ id: 10 }]
      });

    await processRecurringTransactions(1);

    expect(pool.query).toHaveBeenCalledTimes(4);
    
    // Check if the update used the '1 month' interval
    expect(pool.query.mock.calls[3][0]).toContain("SET next_date = next_date + CAST($1 AS INTERVAL)");
    expect(pool.query.mock.calls[3][1]).toEqual(['1 month', 10]);
  });

  it("should ignore processing if no items are due", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // No due items

    await processRecurringTransactions(1);

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("should handle daily frequency increment correctly", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 11,
            user_id: 1,
            category_id: 3,
            type: "expense",
            amount: 5,
            description: "Coffee",
            frequency: "daily",
            next_date: "2026-03-01",
            is_active: true
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [{ name: "Food" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await processRecurringTransactions(1);

    expect(pool.query.mock.calls[3][1]).toEqual(['1 day', 11]);
  });
});

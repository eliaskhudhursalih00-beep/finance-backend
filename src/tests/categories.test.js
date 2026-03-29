const request = require("supertest");
const app = require("../../server");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn(),
}));

jest.mock("jsonwebtoken");

let token;
const mockUser = { id: 1, email: "test@test.com" };
const mockCategories = [
  { id: 1, name: "food", color: "#4F46E5" },
  { id: 2, name: "salary", color: "#10B981" }
];

describe("Categories and Analytics API", () => {
  beforeAll(() => {
    token = "fake-token";
    jwt.verify.mockReturnValue(mockUser);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue(mockUser);
  });

  test("GET /api/categories - Should return list of categories", async () => {
    pool.query.mockResolvedValueOnce({ rows: mockCategories });
    
    const res = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${token}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockCategories);
  });

  test("POST /api/transactions - Should create transaction with category_id", async () => {
    const mockTransaction = { id: 10, amount: 100, category_id: 1, user_id: 1 };
    
    // First query: GET category name
    pool.query.mockResolvedValueOnce({ rows: [{ name: "food" }] });
    // Second query: INSERT transaction
    pool.query.mockResolvedValueOnce({ rows: [mockTransaction] });
    
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 100,
        type: "expense",
        category_id: 1,
        description: "Test"
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.transaction.id).toBe(10);
  });

  test("GET /api/analytics/categories - Should return analytics data", async () => {
    const mockAnalytics = [
      { category: "food", total: 500, color: "#4F46E5" },
      { category: "salary", total: 2000, color: "#10B981" }
    ];
    pool.query.mockResolvedValueOnce({ rows: mockAnalytics });
    
    const res = await request(app)
      .get("/api/analytics/categories")
      .set("Authorization", `Bearer ${token}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockAnalytics);
  });
});

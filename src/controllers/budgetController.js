const asyncHandler = require("../utils/asyncHandler");
const pool = require("../config/db");

const setBudget = asyncHandler(async (req, res) => {
  const { category_id, amount, month } = req.body;
  const userId = req.user.id;

  const result = await pool.query(
    `INSERT INTO budgets (user_id, category_id, amount, month)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, category_id, month)
     DO UPDATE SET amount = EXCLUDED.amount
     RETURNING *`,
    [userId, category_id, amount, month]
  );

  res.json({
    message: "Budget set successfully",
    budget: result.rows[0],
  });
});

const getBudgets = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { month, page = 1, limit = 50 } = req.query; // e.g. 2026-03

  if (!month) {
    return res.status(400).json({ error: "Month is required (YYYY-MM)" });
  }

  const offset = (page - 1) * limit;

  // Calculate strict date bounds to allow Postgres to use B-tree indices on created_at
  const startDate = `${month}-01`;
  const dateObj = new Date(startDate);
  dateObj.setMonth(dateObj.getMonth() + 1);
  const endDate = dateObj.toISOString().split('T')[0];

  const result = await pool.query(
    `
    SELECT 
      b.id,
      b.category_id,
      c.name as category_name,
      c.color as category_color,
      b.amount as limit_amount,
      COALESCE(b.current_spent, 0) as current_spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = $1 AND b.month = $2
    ORDER BY b.id ASC
    LIMIT $3 OFFSET $4
    `,
    [userId, month, limit, offset]
  );

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM budgets WHERE user_id = $1 AND month = $2`,
    [userId, month]
  );
  const totalCount = parseInt(countResult.rows[0].count, 10);

  res.json({
    budgets: result.rows,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: parseInt(page, 10),
    totalBudgets: totalCount
  });
});

module.exports = {
  setBudget,
  getBudgets,
};

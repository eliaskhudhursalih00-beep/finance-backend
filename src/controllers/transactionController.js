const pool = require("../config/db");
const { processRecurringTransactions } = require("./recurringController");

const getCategories = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY name ASC");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const createTransaction = async (req, res) => {
  const { type, amount, category_id, description } = req.body;
  const userId = req.user.id;

  // Validation handled by middleware

  try {
    // Get category name for legacy support or analytics if needed
    const catResult = await pool.query("SELECT name FROM categories WHERE id = $1", [category_id]);
    const categoryName = catResult.rows[0]?.name || "other";

    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, category_id, category, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, amount, category_id, categoryName, description]
    );

    res.status(201).json({
      message: "Transaction created",
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getTransactions = async (req, res) => {
  const userId = req.user.id;
  const { month, page = 1, limit = 50, category_id, startDate, endDate, minAmount, maxAmount } = req.query;
  
  await processRecurringTransactions(userId);

  let filters = ["t.user_id = $1"];
  let params = [userId];
  
  if (month) {
    params.push(month);
    filters.push(`to_char(t.created_at, 'YYYY-MM') = $${params.length}`);
  }

  if (category_id) {
    params.push(category_id);
    filters.push(`t.category_id = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    filters.push(`t.created_at >= $${params.length}::date`);
  }

  if (endDate) {
    params.push(endDate);
    filters.push(`t.created_at <= $${params.length}::date`);
  }

  if (minAmount) {
    params.push(minAmount);
    filters.push(`t.amount >= $${params.length}`);
  }

  if (maxAmount) {
    params.push(maxAmount);
    filters.push(`t.amount <= $${params.length}`);
  }

  const offset = (page - 1) * limit;
  const whereClause = "WHERE " + filters.join(" AND ");
  const limitParamIdx = params.length + 1;
  const offsetParamIdx = params.length + 2;
  
  const queryParams = [...params, limit, offset];

  try {
    const result = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color 
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       ${whereClause} 
       ORDER BY t.created_at DESC
       LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      queryParams
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM transactions t ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    res.json({
      transactions: result.rows,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page, 10),
      totalTransactions: totalCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getBalance = async (req, res) => {
  const userId = req.user.id;
  const { month } = req.query;
  
  await processRecurringTransactions(userId);

  let dateFilter = "";
  let params = [userId];
  
  if (month) {
    dateFilter = " AND to_char(created_at, 'YYYY-MM') = $2";
    params.push(month);
  }

  try {
    const incomeResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = $1 AND type = 'income'${dateFilter}`,
      params
    );

    const expenseResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = $1 AND type = 'expense'${dateFilter}`,
      params
    );

    const income = parseFloat(incomeResult.rows[0].coalesce);
    const expenses = parseFloat(expenseResult.rows[0].coalesce);
    const balance = income - expenses;

    res.json({ income, expenses, balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getCategoryAnalytics = async (req, res) => {
  const userId = req.user.id;
  const { month } = req.query;
  
  let dateFilter = "";
  let params = [userId];
  
  if (month) {
    dateFilter = " AND to_char(t.created_at, 'YYYY-MM') = $2";
    params.push(month);
  }

  try {
    const result = await pool.query(
      `
      SELECT c.name as category, SUM(t.amount) as total, c.color
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.type = 'expense'${dateFilter}
      GROUP BY c.name, c.color
      ORDER BY total DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      "DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found or unauthorized" });
    }

    res.json({ message: "Transaction deleted", transaction: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { type, amount, category_id, description } = req.body;
  const userId = req.user.id;

  // Validation handled by middleware

  try {
    let categoryName = null;
    if (category_id) {
      const catResult = await pool.query("SELECT name FROM categories WHERE id = $1", [category_id]);
      categoryName = catResult.rows[0]?.name;
    }

    const result = await pool.query(
      `UPDATE transactions 
       SET type = COALESCE($1, type), 
           amount = COALESCE($2, amount), 
           category_id = COALESCE($3, category_id),
           category = COALESCE($4, category),
           description = COALESCE($5, description)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [type, amount, category_id, categoryName, description, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found or unauthorized" });
    }

    res.json({ message: "Transaction updated", transaction: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { 
  getCategories,
  createTransaction, 
  getTransactions, 
  getBalance, 
  getCategoryAnalytics,
  deleteTransaction,
  updateTransaction
};


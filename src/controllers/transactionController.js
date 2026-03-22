const pool = require("../config/db");

const createTransaction = async (req, res) => {
  const { type, amount, category, description } = req.body;
  const userId = req.user.id;

  if (!type || !amount || !category) {
    return res.status(400).json({ error: "Type, amount, and category are required" });
  }

  const normalizedCategory = category.trim().toLowerCase();

  try {
    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, category, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, amount, normalizedCategory, description]
    );

    res.json({
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
  const { month } = req.query;
  
  let dateFilter = "";
  let params = [userId];
  
  if (month) {
    dateFilter = " AND to_char(created_at, 'YYYY-MM') = $2";
    params.push(month);
  }

  try {
    const result = await pool.query(
      `SELECT * FROM transactions WHERE user_id = $1${dateFilter} ORDER BY created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getBalance = async (req, res) => {
  const userId = req.user.id;
  const { month } = req.query;
  
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
    dateFilter = " AND to_char(created_at, 'YYYY-MM') = $2";
    params.push(month);
  }

  try {
    const result = await pool.query(
      `
      SELECT category, SUM(amount) as total
      FROM transactions
      WHERE user_id = $1 AND type = 'expense'${dateFilter}
      GROUP BY category
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
  const { type, amount, category, description } = req.body;
  const userId = req.user.id;

  const normalizedCategory = category ? category.trim().toLowerCase() : null;

  try {
    const result = await pool.query(
      `UPDATE transactions 
       SET type = COALESCE($1, type), 
           amount = COALESCE($2, amount), 
           category = COALESCE($3, category), 
           description = COALESCE($4, description)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [type, amount, normalizedCategory, description, id, userId]
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
  createTransaction, 
  getTransactions, 
  getBalance, 
  getCategoryAnalytics,
  deleteTransaction,
  updateTransaction
};

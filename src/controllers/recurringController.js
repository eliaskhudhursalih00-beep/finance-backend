const pool = require("../config/db");

const createRecurring = async (req, res) => {
  const { category_id, amount, type, description, frequency, next_date } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `INSERT INTO recurring_transactions (user_id, category_id, type, amount, description, frequency, next_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, category_id, type, amount, description, frequency, next_date]
    );

    res.status(201).json({
      message: "Recurring transaction created",
      recurring: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getRecurring = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT r.*, c.name as category_name 
       FROM recurring_transactions r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = $1 AND r.is_active = TRUE
       ORDER BY next_date ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteRecurring = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    await pool.query("DELETE FROM recurring_transactions WHERE id = $1 AND user_id = $2", [id, userId]);
    res.json({ message: "Recurring transaction deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Process due recurring transactions
const processRecurringTransactions = async (userId) => {
  try {
    const dueItems = await pool.query(
      `SELECT * FROM recurring_transactions 
       WHERE user_id = $1 AND is_active = TRUE AND next_date <= CURRENT_DATE`,
      [userId]
    );

    for (const item of dueItems.rows) {
      // 1. Create the transaction
      const catResult = await pool.query("SELECT name FROM categories WHERE id = $1", [item.category_id]);
      const categoryName = catResult.rows[0]?.name || "other";

      await pool.query(
        `INSERT INTO transactions (user_id, type, amount, category_id, category, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.user_id, item.type, item.amount, item.category_id, categoryName, `[Recurring] ${item.description || ''}`]
      );

      // 2. Schedule next occurrence
      let interval = '1 month';
      if (item.frequency === 'daily') interval = '1 day';
      if (item.frequency === 'weekly') interval = '7 days';

      await pool.query(
        `UPDATE recurring_transactions 
         SET next_date = next_date + CAST($1 AS INTERVAL)
         WHERE id = $2`,
        [interval, item.id]
      );
    }
  } catch (error) {
    console.error("Error processing recurring transactions:", error);
  }
};

module.exports = {
  createRecurring,
  getRecurring,
  deleteRecurring,
  processRecurringTransactions,
};

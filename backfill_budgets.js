require("dotenv").config();
const pool = require("./src/config/db");

const backfill = async () => {
  try {
    console.log("Starting backfill for existing budgets...");
    
    await pool.query(`
      UPDATE budgets b
      SET current_spent = (
          SELECT COALESCE(SUM(amount), 0)
          FROM transactions t
          WHERE t.user_id = b.user_id 
            AND t.category_id = b.category_id 
            AND t.type = 'expense'
            AND to_char(t.created_at, 'YYYY-MM') = b.month
      );
    `);

    console.log("✅ Backfill complete! Data integrity restored.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error running backfill:", err);
    process.exit(1);
  }
};

backfill();

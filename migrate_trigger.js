require("dotenv").config();
const pool = require("./src/config/db");

const setupTrigger = async () => {
  try {
    console.log("Setting up Counter Cache Trigger for Budgets...");

    // 1. Add current_spent column
    await pool.query(`
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS current_spent NUMERIC(12, 2) DEFAULT 0;
    `);

    // 2. Create the Trigger Function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_budget_spent()
      RETURNS TRIGGER AS $$
      BEGIN
          -- 1. Handle DELETES or the "OLD" part of an UPDATE
          IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
              IF OLD.type = 'expense' THEN
                  UPDATE budgets 
                  SET current_spent = current_spent - OLD.amount
                  WHERE user_id = OLD.user_id 
                    AND category_id = OLD.category_id 
                    AND month = to_char(OLD.created_at, 'YYYY-MM');
              END IF;
          END IF;

          -- 2. Handle INSERTS or the "NEW" part of an UPDATE
          IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
              IF NEW.type = 'expense' THEN
                  UPDATE budgets 
                  SET current_spent = current_spent + NEW.amount
                  WHERE user_id = NEW.user_id 
                    AND category_id = NEW.category_id 
                    AND month = to_char(NEW.created_at, 'YYYY-MM');
              END IF;
          END IF;

          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 3. Bind the Trigger (Drop if exists to avoid conflicts, then recreate safely)
    await pool.query(`DROP TRIGGER IF EXISTS trg_update_budget_spent ON transactions;`);
    await pool.query(`
      CREATE TRIGGER trg_update_budget_spent
      AFTER INSERT OR UPDATE OR DELETE ON transactions
      FOR EACH ROW EXECUTE FUNCTION update_budget_spent();
    `);

    console.log("✅ Trigger setup complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error setting up trigger:", err);
    process.exit(1);
  }
};

setupTrigger();

require("dotenv").config();
const pool = require("./src/config/db");

const createTables = async () => {
  try {
    console.log("Connecting to the database to create tables...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        color VARCHAR(20),
        icon VARCHAR(50)
      );
    `);

    // Seed default categories
    const defaultCategories = [
      ['food', '#4F46E5', 'Utensils'],
      ['utilities', '#10B981', 'Zap'],
      ['salary', '#F59E0B', 'Wallet'],
      ['entertainment', '#EF4444', 'Film'],
      ['shopping', '#8B5CF6', 'ShoppingBag'],
      ['health', '#EC4899', 'Heart'],
      ['transport', '#6366F1', 'Car']
    ];

    for (const [name, color, icon] of defaultCategories) {
      await pool.query(
        "INSERT INTO categories (name, color, icon) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING",
        [name, color, icon]
      );
    }

    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100), -- Legacy column, keep for now
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add Indexes for performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_date_type ON transactions (user_id, created_at, type);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        amount DECIMAL(12, 2) NOT NULL,
        month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, category_id, month)
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        description TEXT,
        frequency VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
        next_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON recurring_transactions(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_recurring_next_date ON recurring_transactions(next_date);`);

    console.log("✅ Custom Neon Database tables and indexes created successfully!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Error creating tables:", err);
    process.exit(1);
  }
};

createTables();

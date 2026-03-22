const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "finance_app",
  password: "my f4m1ly f1rst", // use your real password
  port: 5432,
});

module.exports = pool;
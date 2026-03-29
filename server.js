const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const transactionRoutes = require("./src/routes/transactionRoutes");
const budgetRoutes = require("./src/routes/budgetRoutes");
const recurringRoutes = require("./src/routes/recurringRoutes");
const categoriesRoutes = require("./src/routes/categoriesRoutes");
const authMiddleware = require("./src/middleware/auth.middleware");

const app = express();

// Security Middlewares
app.use(helmet());

// CORS — single config, before all routes
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://finance-frontend-one-iota.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Handle preflight requests for all routes
app.options("*", cors());

app.use(express.json());

// API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests from this IP, please try again later." }
});
app.use("/api/", apiLimiter);

// Routes
app.use("/api", authRoutes);
app.use("/api", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/categories", categoriesRoutes);

// Health & Test Routes
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working securely!" });
});

// Profile (Protected)
app.get("/api/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";
  console.error(`[${new Date().toISOString()}] ${err.stack}`);

  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Validation Failed",
      details: err.errors.map(e => ({ field: e.path[0], message: e.message }))
    });
  }

  const dbErrors = {
    "23505": { status: 409, msg: "This record already exists." },
    "23503": { status: 400, msg: "Related record (category/user) not found." },
    "23502": { status: 400, msg: "Missing required fields in the database." }
  };

  if (dbErrors[err.code]) {
    return res.status(dbErrors[err.code].status).json({ error: dbErrors[err.code].msg });
  }

  res.status(err.status || 500).json({
    error: isProduction ? "Internal Server Error" : err.message
  });
});

// Keep Render from sleeping
const keepAlive = () => {
  const url = process.env.BACKEND_URL;
  if (url) {
    fetch(`${url}/api/health`).catch(() => { });
  }
};
setInterval(keepAlive, 14 * 60 * 1000);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
const express = require("express");
const { 
  createTransaction, 
  getTransactions, 
  getBalance, 
  getCategoryAnalytics,
  deleteTransaction,
  updateTransaction
} = require("../controllers/transactionController");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// All routes below use authMiddleware
router.use(authMiddleware);

router.post("/transactions", createTransaction);
router.get("/transactions", getTransactions);
router.get("/balance", getBalance);
router.get("/analytics/categories", getCategoryAnalytics);
router.put("/transactions/:id", updateTransaction);
router.delete("/transactions/:id", deleteTransaction);

module.exports = router;

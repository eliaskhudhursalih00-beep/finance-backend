const express = require("express");
const { 
  createTransaction, 
  getTransactions, 
  getBalance, 
  getCategoryAnalytics,
  deleteTransaction,
  updateTransaction,
  getCategories
} = require("../controllers/transactionController");
const authMiddleware = require("../middleware/auth.middleware");
const { validate, transactionSchema, updateTransactionSchema } = require("../middleware/validation.middleware");

const router = express.Router();

// All routes below use authMiddleware
router.use(authMiddleware);

router.get("/categories", getCategories);
router.post("/transactions", validate(transactionSchema), createTransaction);

router.get("/transactions", getTransactions);
router.get("/balance", getBalance);
router.get("/analytics/categories", getCategoryAnalytics);
router.put("/transactions/:id", validate(updateTransactionSchema), updateTransaction);
router.delete("/transactions/:id", deleteTransaction);

module.exports = router;


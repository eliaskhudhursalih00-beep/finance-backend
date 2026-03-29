const express = require("express");
const router = express.Router();
const { setBudget, getBudgets } = require("../controllers/budgetController");
const authMiddleware = require("../middleware/auth.middleware");
const { validate, budgetSchema } = require("../middleware/validation.middleware");

router.use(authMiddleware);

router.post("/", validate(budgetSchema), setBudget);
router.get("/", getBudgets);

module.exports = router;

const express = require("express");
const router = express.Router();
const categoriesController = require("../controllers/categoriesController");
const authMiddleware = require("../middleware/auth.middleware");

// Get all categories
router.get("/", authMiddleware, categoriesController.getCategories);

module.exports = router;

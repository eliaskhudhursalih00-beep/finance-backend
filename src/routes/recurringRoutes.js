const express = require("express");
const router = express.Router();
const { createRecurring, getRecurring, deleteRecurring } = require("../controllers/recurringController");
const authMiddleware = require("../middleware/auth.middleware");
const { validate, recurringSchema } = require("../middleware/validation.middleware");

router.use(authMiddleware);

router.post("/", validate(recurringSchema), createRecurring);
router.get("/", getRecurring);
router.delete("/:id", deleteRecurring);

module.exports = router;

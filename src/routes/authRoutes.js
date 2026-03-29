const express = require("express");
const { register, login, refresh, logout } = require("../controllers/authController");
const router = express.Router();

const { validate, registerSchema, loginSchema } = require("../middleware/validation.middleware");

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);

module.exports = router;


const { z } = require("zod");

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    const issues = err.issues || err.errors;
    if (issues) {
      return res.status(400).json({
        error: "Validation failed",
        details: issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }
    return res.status(400).json({ error: "Validation failed", details: [] });
  }
};

const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  }),
});

const transactionSchema = z.object({
  body: z.object({
    type: z.enum(["income", "expense"], {
      errorMap: () => ({ message: "Type must be either 'income' or 'expense'" }),
    }),
    amount: z.number().positive("Amount must be a positive number"),
    category_id: z.number({
      required_error: "Category is required",
    }),
    description: z.string().optional(),
  }),
});


const budgetSchema = z.object({
  body: z.object({
    category_id: z.number({ required_error: "Category is required" }),
    amount: z.number().positive("Amount must be a positive number"),
    month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  }),
});

const recurringSchema = z.object({
  body: z.object({
    category_id: z.number({ required_error: "Category is required" }),
    amount: z.number().positive("Amount must be a positive number"),
    type: z.enum(["income", "expense"]),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    next_date: z.string().min(1, "Next date is required"),
    description: z.string().optional(),
  }),
});

const updateTransactionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    type: z.enum(["income", "expense"]).optional(),
    amount: z.number().positive().optional(),
    category_id: z.number().optional(),
    description: z.string().optional(),
  }),
});


module.exports = {
  validate,
  registerSchema,
  loginSchema,
  transactionSchema,
  updateTransactionSchema,
  budgetSchema,
  recurringSchema,
};

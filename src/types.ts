import { z } from "zod";
import { Request } from "express";
import {
  registerSchema,
  loginSchema,
  transactionSchema,
  budgetSchema,
  recurringSchema,
  updateTransactionSchema
} from "./middleware/validation.middleware";

// Extract TYPES from validated Zod object schemas
export type RegisterRequest = z.infer<typeof registerSchema>["body"];
export type LoginRequest = z.infer<typeof loginSchema>["body"];
export type TransactionRequest = z.infer<typeof transactionSchema>["body"];
export type BudgetRequest = z.infer<typeof budgetSchema>["body"];
export type RecurringRequest = z.infer<typeof recurringSchema>["body"];
export type UpdateTransactionRequest = z.infer<typeof updateTransactionSchema>["body"];
export type UpdateTransactionParams = z.infer<typeof updateTransactionSchema>["params"];

// Shared type for authenticated requests
export interface AuthRequest extends Request {
  user: { id: number; email: string };
}
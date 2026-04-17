import { budgetStatus, type BudgetStatus } from "../budget.js";
import { BudgetStatusInputSchema } from "../schemas.js";

export const budgetStatusJsonSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

export async function runBudgetStatus(raw: unknown): Promise<BudgetStatus> {
  BudgetStatusInputSchema.parse(raw ?? {});
  return budgetStatus();
}

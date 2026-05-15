import { z } from 'zod'

export const ClassificationItemSchema = z.object({
  index: z.number().int().min(0),
  category_name: z.string(),
  confidence: z.number().min(0).max(1),
})

export const ClassificationResponseSchema = z.array(ClassificationItemSchema)
export type ClassificationResponse = z.infer<typeof ClassificationResponseSchema>

export const BudgetSuggestionItemSchema = z.object({
  category_name: z.string(),
  suggested_amount: z.number().int().nonnegative(),
  reason: z.string(),
})

export const SpendingPatternSchema = z.object({
  summary: z.string(),
  habits: z.array(z.string()),
})

export const BudgetAdviceResponseSchema = z.object({
  budget_suggestions: z.array(BudgetSuggestionItemSchema),
  spending_pattern: SpendingPatternSchema,
})

export type BudgetAdviceResponse = z.infer<typeof BudgetAdviceResponseSchema>

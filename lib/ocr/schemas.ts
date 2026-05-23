import { z } from 'zod'

export const OcrResultSchema = z.object({
  payee:       z.string().max(100).default(''),
  amount:      z.number().default(0),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
  confidence:  z.number().min(0).max(1).default(0),
})

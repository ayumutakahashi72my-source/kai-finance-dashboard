import type { SupabaseClient } from '@supabase/supabase-js'

// ── Pricing (USD per 1M tokens, 2026-05) ─────────────────────────
// Update when Anthropic changes pricing.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-opus-4-8':           { input: 15.00, output: 75.00 },
}

// Default fallback if model is unknown
const DEFAULT_PRICING = { input: 3.00, output: 15.00 }

export type CostFeature =
  | 'classification'
  | 'chat'
  | 'monthly_summary'
  | 'budget_suggest'
  | 'spending_pattern'
  | 'goal_budget'
  | 'quarterly_insight'

export interface CostLogEntry {
  household_id: string
  model: string
  feature: CostFeature
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

export interface TokenUsageAccum {
  inputTokens: number
  outputTokens: number
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model] ?? DEFAULT_PRICING
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

/** 150 JPY/USD rough conversion */
export function costUsdToYen(usd: number, rate = 150): number {
  return Math.ceil(usd * rate)
}

/** Fire-and-forget: writes one row to ai_cost_logs. Swallows errors to never block callers. */
export async function writeCostLog(entry: CostLogEntry, supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.from('ai_cost_logs').insert(entry)
  } catch {
    // Non-critical: monitoring data loss is acceptable
  }
}

/** Convenience: computes cost_usd and calls writeCostLog */
export async function trackCost(
  opts: Omit<CostLogEntry, 'cost_usd'>,
  supabase: SupabaseClient
): Promise<void> {
  const cost_usd = estimateCostUsd(opts.model, opts.input_tokens, opts.output_tokens)
  void writeCostLog({ ...opts, cost_usd }, supabase)
}

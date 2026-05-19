# KAI — AI-Powered Household Finance Dashboard

A full-stack web application for household budget management, built with Next.js 14, Supabase, and Claude AI. Designed for real family use and as a portfolio demonstration of modern full-stack development practices.

**Live demo:** [kai-finance-dashboard.vercel.app](https://kai-finance-dashboard.vercel.app)

---

## Features

### Core
- **Transaction management** — CRUD with category classification, CSV import (Money Forward format), and inline editing
- **AI auto-classification** — Haiku-powered categorization with RAG cache (keyword + embedding hybrid lookup)
- **Money Forward auto-sync** — Unofficial API integration via Vercel Cron; headless browser session management
- **Monthly score** — Composite financial health score (savings rate, budget adherence, classification coverage)

### AI / LLM
- **Monthly summary** — Sonnet generates a narrative summary of spending patterns each month
- **AI chat** — Contextual Q&A over your own transaction history
- **Budget advisor** — Haiku suggests per-category budgets based on 3-month rolling average
- **Spending patterns** — Detects fixed expenses, recurring subscriptions, and unusual spends
- **Cost tracking** — Per-model token usage tracked in `ai_cost_logs`; admin dashboard shows daily spend

### UX
- Mobile-first responsive layout with bottom navigation bar and sheet-style modals
- Calendar view with per-day transaction dots and tap-to-expand bottom sheet
- Budget dashboard with ring charts, category drill-down, and score card
- Skeleton loading states across all screens
- Push notifications (Web Push API)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS, Recharts |
| Data fetching | TanStack Query v5, Zod |
| Backend | Next.js API Routes (all business logic) |
| Database | Supabase (PostgreSQL + pgvector + RLS) |
| Auth | Supabase Google OAuth |
| AI | Anthropic Claude — Sonnet 3.5 (summaries/chat), Haiku 3 (classification/budget) |
| Cron | Vercel Cron Jobs |
| Deployment | Vercel |
| Testing | Vitest |
| CSV parsing | papaparse |

---

## Architecture

```
app/
  api/           # All business logic lives here (API Routes only)
    ai/          # summary, chat
    budget/      # suggest, score
    cron/        # monthly rollup, MF import
    transactions/ # CRUD, CSV import, AI classify
    settings/    # MF connection, members, notifications
  (pages)/       # App Router pages

components/
  dashboard/     # Summary cards, charts, AI panel
  budget/        # BudgetDashboard, ScoreRing, SpendingPatternCard
  transactions/  # List, filters, CSV import dialog
  calendar/      # Calendar grid + bottom sheet
  kai/           # Mobile-specific screen wrappers

lib/
  ai-classifier.ts      # Haiku classification pipeline
  embedder.ts           # pgvector embedding + RAG lookup
  score-calculator.ts   # Composite score computation
  moneyforward-client.ts # MF unofficial API client
  mf-browser.ts         # Headless browser session for MF
  monthly-summary.ts    # Sonnet summary generation
  budget-advisor.ts     # Haiku budget suggestion
  cost-tracker.ts       # Per-model cost logging

supabase/migrations/    # Full schema history (25 migrations)
docs/                   # API conventions, AI rules, DB notes, test policy
__tests__/              # Vitest unit tests (score, CSV, RAG, forecast)
```

**Key design decisions:**
- Business logic is 100% in API Routes — Supabase is used only for DB and Auth, never called directly from the browser for writes
- RAG classification uses a keyword → embedding two-pass lookup to minimize LLM calls (cache hit rate ~80%)
- TanStack Query handles all server state; URL params manage month/filter selection; `useState` is reserved for modals only

---

## Database Schema

25 migrations covering:
`households` → `household_members` → `transactions` → `categories` → `category_rag_cache` → `budget_suggestions` → `monthly_scores` → `fixed_expense_suggestions` → `financial_goals` → `ai_cost_logs` → `push_subscriptions` → `chat_histories` → vector extension (`pgvector`)

Row Level Security (RLS) is enabled on all tables; policies enforce household-scoped access.

---

## Local Development

### Prerequisites
- Node.js 20+
- Supabase project (free tier works)
- Anthropic API key
- Google OAuth credentials

### Setup

```bash
git clone https://github.com/ayumutakahashi72my-source/kai-finance-dashboard.git
cd kai-finance-dashboard
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
ANTHROPIC_API_KEY=your_anthropic_key
```

Run migrations in Supabase SQL editor (files in `supabase/migrations/` in order), then:

```bash
npm run dev
```

### Tests

```bash
npm test
```

Three test suites: score calculation boundary values, CSV duplicate detection, RAG hit/miss classification.

---

## CI/CD

GitHub Actions runs lint + type-check + vitest on every push. Vercel deploys preview on PR and production on merge to `main`.

---

## Development Approach

Built over ~11 weeks in weekly sprints, incrementally adding features from basic CRUD through AI integration to a production-grade dashboard. Each week's schema changes are captured as numbered migrations; each API surface has a corresponding doc in `docs/`.

The AI classification pipeline evolved through three iterations: keyword rules only → keyword + Haiku fallback → keyword + pgvector RAG + Haiku fallback. The RAG layer reduced Haiku invocations by ~80% while maintaining classification accuracy.

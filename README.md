# match//ai

> AI-powered resume analyzer. Upload your resume and a job description — get a precision match score, skill gap analysis, tailored summary, and actionable suggestions in under 15 seconds.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-job--matcher--zeta.vercel.app-22C55E?style=flat-square)](https://job-matcher-zeta.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                         User Input                          │
│              Resume (PDF/DOCX/paste) + Job URL              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │     Resume Parser      │
              │  unpdf (PDF) /         │
              │  mammoth (DOCX)        │
              │  + cleanText()         │
              │  + detectConfidence()  │
              └───────────┬────────────┘
                          │ cleaned text
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌──────────────────┐            ┌──────────────────────┐
│ Keyword          │            │ AI Analyzer          │
│ Extractor        │            │ (Claude Haiku)       │
│                  │            │                      │
│ TF-IDF-style     │            │ Structured JSON      │
│ frequency match  │            │ aiScore 0-100        │
│ stopword filter  │            │ skills/gaps/summary  │
│ √ damping        │            │ suggestions          │
│                  │            │                      │
│ keywordScore     │            │ aiScore              │
│ (0–95 ceiling)   │            │ + token counts       │
└────────┬─────────┘            └──────────┬───────────┘
         │                                 │
         └──────────────┬──────────────────┘
                        │  Promise.all() — parallel
                        ▼
            ┌───────────────────────┐
            │   Composite Scorer    │
            │                       │
            │  final = round(       │
            │    kw  × 0.40 +       │
            │    ai  × 0.60         │
            │  )                    │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Structured Output   │
            │                       │
            │  matchScore (0-100)   │
            │  matchTier            │
            │  presentSkills[]      │
            │  missingSkills[]      │
            │  strengths[]          │
            │  tailoredSummary      │
            │  suggestions[]        │
            │  scoreBreakdown       │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Supabase Storage    │
            │                       │
            │  analyses table       │
            │  usage_logs table     │
            │  usage_quotas table   │
            │  (RLS enforced)       │
            └───────────────────────┘
```

---

## Key Engineering Decisions

### Why Hybrid Scoring?

Pure AI scoring is non-deterministic and expensive — the same resume against the same JD can produce scores that vary by ±5 points across calls, making the product feel unreliable. Pure keyword matching is fast and stable but misses semantic relationships (e.g. "machine learning" vs "ML") and entirely ignores experience quality.

The hybrid approach gives us:
- **Keyword score (40%):** fast, deterministic, pure ATS-signal. Weighted by JD term frequency so keywords that appear more in the JD contribute more to the score. Square-root dampening (`√ratio × 95`) prevents a trivially keyword-stuffed resume from scoring 100 on this leg.
- **AI score (60%):** semantic, experience-aware, can evaluate seniority and context. Carries more weight because it's the harder signal to game and closer to how humans actually evaluate fit.

Both legs run in `Promise.all()` — no serial latency penalty for having two signals.

### Prompt Design

The AI prompt instructs Claude to score *genuine skill and experience alignment* and explicitly states that keyword presence is handled separately. This prevents the AI score from double-counting the keyword signal and keeps the two components orthogonal. Input is hard-truncated at 6,000 chars (resume) and 3,000 chars (JD) — approximately 2,250 tokens combined — to keep latency predictable and costs bounded.

Output is manually validated field-by-field rather than trusting Zod on the raw string. This produces a typed fallback (`aiScore: 50`, empty arrays) instead of a 502 when the model returns slightly malformed JSON, which happens ~2% of the time on edge cases.

### Cost Tracking Design

Every AI call writes a row to `usage_logs` with `prompt_tokens`, `completion_tokens`, and `cost_usd` computed in application code before insert. The `total_tokens` column is a PostgreSQL `GENERATED ALWAYS AS` expression — never out of sync with its parts. Usage logging is **fire-and-forget**: it runs in a `void Promise.all()` after the response has already been sent. A logging failure never surfaces to the user.

Quota enforcement happens *before* any AI spend. If a user is at their limit, we 429 immediately and never hit the Anthropic API. This means quota checks are the only usage-related code in the hot path.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, RSC) |
| Language | TypeScript 5, strict mode |
| Auth + DB | Supabase (PostgreSQL 15, GoTrue) |
| AI | Anthropic Claude Haiku (`claude-haiku-4-5`) |
| PDF parsing | unpdf (pdf.js/WASM, edge-compatible) |
| DOCX parsing | mammoth |
| UI components | shadcn/ui + Radix UI primitives |
| Styling | Tailwind CSS 3 |
| Deployment | Vercel (serverless functions) |
| Testing | Vitest |
| Validation | Zod |

---

## Local Development

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is sufficient)
- An [Anthropic](https://console.anthropic.com) API key

### Setup

```bash
git clone https://github.com/BhaskarPurohit/job-matcher.git
cd job-matcher
npm install
cp .env.local.example .env.local   # then fill in values
npm run dev
```

### Environment Variables

```bash
# .env.local

# Supabase — find in Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Anthropic — https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-...

# Optional: override default model (default: claude-haiku-4-5)
ANTHROPIC_MODEL=claude-haiku-4-5
```

### Database Setup

Run the migrations in order in your Supabase SQL editor:

```bash
supabase/migrations/001_initial.sql       # analyses table + RLS
supabase/migrations/002_add_usage_tracking.sql  # usage_logs + usage_quotas + trigger
```

> The trigger in `002` auto-provisions a `usage_quotas` row for every new signup. For pre-existing users, `checkQuota()` upserts the row on first call.

---

## Database Schema

### `analyses`
Core table. One row per analysis run.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `user_id` | uuid | FK → `auth.users`, CASCADE delete |
| `job_title` | text | User-supplied |
| `company_name` | text | Nullable |
| `match_score` | smallint | 0–100, composite final score |
| `match_tier` | text | `strong` / `moderate` / `weak` |
| `present_skills` | jsonb | `[{name, importance}]` |
| `missing_skills` | jsonb | `[{name, importance}]` |
| `strengths` | jsonb | `string[]` |
| `tailored_summary` | text | AI-generated |
| `suggestions` | jsonb | `[{section, suggested, reasoning}]` |
| `processing_ms` | integer | Wall-clock latency |
| `created_at` | timestamptz | Default `now()` |

### `usage_logs`
Append-only. One row per AI API call.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users` |
| `analysis_id` | uuid | FK → `analyses`, nullable (SET NULL on delete) |
| `prompt_tokens` | integer | |
| `completion_tokens` | integer | |
| `total_tokens` | integer | Generated column (`prompt + completion`) |
| `cost_usd` | numeric(10,6) | Computed in app before insert |
| `model` | text | e.g. `claude-haiku-4-5` |
| `created_at` | timestamptz | |

### `usage_quotas`
One row per user. Tracks plan and monthly counter.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | PK + FK → `auth.users` |
| `plan` | text | Default `free` |
| `analyses_used` | integer | Reset manually or by cron |
| `analyses_limit` | integer | Default `5` for free tier |
| `reset_at` | timestamptz | First of next month |
| `updated_at` | timestamptz | |

---

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/analyze` | Required | Run hybrid analysis pipeline |
| `GET` | `/api/analyses` | Required | List user's analyses |
| `GET` | `/api/analyses/[id]` | Required | Fetch single analysis |
| `DELETE` | `/api/analyses/[id]` | Required | Delete analysis |
| `POST` | `/api/resume/parse` | Required | Parse PDF or DOCX, return text + confidence |
| `GET` | `/api/usage/me` | Required | Current quota status |

All routes return `{ success: false, code, error, fieldErrors[] }` on error. Validation errors include per-field messages that map directly to form inputs.

---

## Project Structure

```
app/
  (auth)/           # Login, signup pages (unauthenticated layout)
  (dashboard)/      # Protected app pages (sidebar layout)
    analyze/        # New analysis form
    analysis/[id]/  # Analysis result page
    dashboard/      # Overview + recent analyses
    history/        # Full history with search/filter
  api/
    analyze/        # POST — main pipeline
    analyses/       # GET list, GET [id], DELETE [id]
    resume/parse/   # POST — file parser
    usage/me/       # GET — quota status
  auth/callback/    # OAuth + email confirmation handler

lib/
  ai/               # Legacy prompt builder (still used for lib/ai/schema.ts)
  parser/           # resumeParser.ts — PDF/DOCX extraction + cleanText
  scoring/          # keywordExtractor, aiAnalyzer, compositeScorer
  usage/            # tracker.ts — checkQuota, logUsage, incrementUsage
  data/             # analyses.ts — Supabase query helpers
  hooks/            # useAnalyze — client-side analysis state machine
  supabase/         # server.ts, client.ts, middleware.ts

components/
  analysis/         # ScoreRing, StrengthsList, NextStepsBanner, CopyButton
  layout/           # Sidebar (mobile-responsive)
  usage/            # QuotaBadge (server component)
  ui/               # shadcn/ui primitives

types/
  analysis.ts       # Shared TypeScript interfaces

supabase/
  migrations/       # SQL migration files — run in order
```

---

## Running Tests

```bash
npm run test          # run all tests once
npm run test:watch    # watch mode
npm run test:cover    # coverage report
```

Tests use Vitest. The AI layer (`runAIAnalysis`) is mocked in `tests/setup.ts` — no real API calls are made during testing.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes with TypeScript strict mode passing (`npx tsc --noEmit`)
4. Ensure tests pass: `npm run test`
5. Open a pull request against `master`

Please keep PRs focused. One concern per PR.

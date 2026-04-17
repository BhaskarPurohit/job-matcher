# AI Resume + Job Match Analyzer — Architecture

> Last updated: 2026-04-17

---

## 1. Project Status: What's Built vs What's Missing

### ✅ Built & Working
| Area | Status | Notes |
|------|--------|-------|
| `POST /api/analyze` | ✅ Complete | Auth, Zod validation, Claude call, Supabase persist |
| AI pipeline (`lib/ai/`) | ✅ Complete | Single-call Claude haiku, Zod-validated output |
| Zod schemas | ✅ Complete | Request + AI output validation |
| Type system | ✅ Complete | `types/analysis.ts` covers all shapes |
| Analysis result page | ✅ Complete | Server component, score ring, skills, suggestions |
| Analyze form page | ✅ Complete | 3-step UX, char counters, field errors |
| History data layer | ✅ Complete | `getAnalysisById`, `listAnalysesByUser` |
| Auth middleware | ✅ Complete | Protects dashboard routes |
| UI components | ✅ Complete | shadcn/ui base + ScoreRing, CopyButton |
| Sidebar layout | ✅ Complete | Dashboard shell |

### ❌ Missing Pieces (Critical for MVP)

| Missing | Priority | Why It's Blocking |
|---------|----------|-------------------|
| **Supabase DB migration file** | 🔴 P0 | App can't persist data without the `analyses` table |
| **Dashboard home page** | 🔴 P0 | `/dashboard` route likely blank or broken |
| **History page** | 🔴 P0 | `history/page.tsx` exists but needs UI + data wiring |
| **Auth pages (login/signup)** | 🔴 P0 | Shell exists but forms need Supabase auth calls |
| **`lib/hooks/useAnalyze.ts`** | 🔴 P0 | Analyze form depends on this hook — needs audit |
| **PDF/file upload** | 🟡 P1 | Currently text-paste only; no `POST /api/resume/upload` |
| **`GET /api/analyses` + `GET /api/analyses/[id]`** | 🟡 P1 | Only POST analyze exists; history/result pages need GET routes |
| **Export PDF button** | 🟡 P1 | Button renders but does nothing (`Download` icon, no handler) |
| **Strengths section in UI** | 🟡 P1 | AI returns `strengths[]` but result page doesn't render it |
| **`DELETE /api/analyses/[id]`** | 🟢 P2 | Nice to have for history management |
| **Rate limiting** | 🟢 P2 | No protection on `/api/analyze` yet |
| **Error/loading UI states** | 🟢 P2 | `error.tsx` / `loading.tsx` stubs exist, need content |
| **Supabase types codegen** | 🟢 P2 | `types/database.ts` referenced in arch but doesn't exist |
| **Environment variable validation** | 🟢 P2 | No startup check for missing `ANTHROPIC_API_KEY` etc. |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js 14 App Router (SSR + API)          │   │
│  │                                                         │   │
│  │  ┌──────────────┐    ┌──────────────┐  ┌────────────┐  │   │
│  │  │  React UI    │    │  App Routes  │  │ API Routes │  │   │
│  │  │  (Tailwind)  │    │  /app/*      │  │ /app/api/* │  │   │
│  │  └──────────────┘    └──────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────┐        ┌─────────────────────────┐
│   Supabase          │        │   Anthropic Claude API  │
│  ┌───────────────┐  │        │                         │
│  │  PostgreSQL   │  │        │  Model: haiku-4-5       │
│  │  (analyses)   │  │        │  Single-call pipeline   │
│  ├───────────────┤  │        │  Zod-validated output   │
│  │  Auth         │  │        └─────────────────────────┘
│  └───────────────┘  │
└─────────────────────┘
```

**Request flow:**
1. User pastes resume + job description → `/analyze` form
2. `useAnalyze` hook → `POST /api/analyze`
3. API route: auth check → Zod validate → Claude API call → Zod validate output → Supabase insert
4. Response redirects to `/analysis/[id]`
5. Server component fetches from Supabase → renders result

---

## 3. Folder Structure (Actual vs Planned)

```
job-matcher/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx               ✅ shell
│   │   ├── login/page.tsx           ⚠️  needs Supabase auth wiring
│   │   └── signup/page.tsx          ⚠️  needs Supabase auth wiring
│   ├── (dashboard)/
│   │   ├── layout.tsx               ✅ complete
│   │   ├── dashboard/page.tsx       ❌ likely blank
│   │   ├── analyze/page.tsx         ✅ complete
│   │   ├── history/page.tsx         ⚠️  needs UI + data
│   │   └── analysis/[id]/
│   │       ├── page.tsx             ✅ complete
│   │       ├── error.tsx            ⚠️  stub, needs content
│   │       └── loading.tsx          ⚠️  stub, needs content
│   ├── api/
│   │   └── analyze/route.ts         ✅ complete
│   │   ── analyses/                 ❌ MISSING
│   │      ├── route.ts              ❌ GET list
│   │      └── [id]/route.ts         ❌ GET + DELETE single
│   │   ── resume/upload/route.ts    ❌ MISSING (P1)
│   ├── auth/callback/route.ts       ✅ OAuth callback
│   ├── globals.css                  ✅
│   ├── layout.tsx                   ✅
│   └── page.tsx                     ✅ landing
│
├── components/
│   ├── ui/                          ✅ shadcn/ui components
│   ├── analysis/
│   │   ├── ScoreRing.tsx            ✅ complete
│   │   └── CopyButton.tsx           ✅ complete
│   │   ── StrengthsList.tsx         ❌ MISSING (strengths not rendered)
│   └── layout/
│       └── Sidebar.tsx              ✅ complete
│
├── lib/
│   ├── ai/
│   │   ├── analyze.ts               ✅ complete (Claude, Zod)
│   │   ├── prompts.ts               ✅ complete
│   │   └── schema.ts                ✅ complete
│   ├── data/
│   │   └── analyses.ts              ✅ complete
│   ├── hooks/
│   │   └── useAnalyze.ts            ⚠️  needs audit
│   ├── supabase/
│   │   ├── client.ts                ✅ complete
│   │   └── server.ts                ✅ complete
│   └── utils.ts                     ✅ complete
│
├── types/
│   ├── analysis.ts                  ✅ complete
│   └── database.ts                  ❌ MISSING (Supabase generated types)
│
├── supabase/
│   └── migrations/
│       └── 001_initial.sql          ❌ MISSING (P0 — nothing persists without this)
│
├── middleware.ts                    ✅ complete
├── next.config.js                   ✅
├── tailwind.config.ts               ✅
└── .env.local.example               ✅
```

---

## 4. API Endpoints

| Method | Endpoint | Auth | Status | Description |
|--------|----------|------|--------|-------------|
| `POST` | `/api/analyze` | ✅ | ✅ Built | Run AI analysis, persist result |
| `GET` | `/api/analyses` | ✅ | ❌ Missing | List user's analysis history |
| `GET` | `/api/analyses/[id]` | ✅ | ❌ Missing | Get single analysis |
| `DELETE` | `/api/analyses/[id]` | ✅ | ❌ Missing | Delete analysis |
| `POST` | `/api/resume/upload` | ✅ | ❌ Missing | Upload PDF → extract text |
| `GET` | `/auth/callback` | — | ✅ Built | Supabase OAuth callback |

### Request/Response shapes

```typescript
// POST /api/analyze — request
{
  resumeText: string       // 100–15,000 chars
  jobDescription: string   // 50–8,000 chars
  jobTitle?: string        // max 200 chars
  companyName?: string     // max 200 chars
}

// POST /api/analyze — success response
{
  success: true,
  data: {
    id: string
    matchScore: number          // 0–100
    matchTier: 'strong' | 'moderate' | 'weak'
    presentSkills: Skill[]
    missingSkills: Skill[]
    strengths: string[]
    tailoredSummary: string
    suggestions: Suggestion[]
    processingMs: number
  }
}

// Error response (all routes)
{
  success: false
  code: 'VALIDATION_ERROR' | 'AI_ERROR' | 'RATE_LIMIT' | 'INTERNAL_ERROR'
  error: string
  fieldErrors: { field: string; message: string }[]
}
```

---

## 5. Database Schema

```sql
-- supabase/migrations/001_initial.sql  ← THIS FILE NEEDS TO BE CREATED

CREATE TABLE analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title       TEXT NOT NULL,
  company_name    TEXT,

  -- AI output (JSONB for schema flexibility)
  match_score     SMALLINT CHECK (match_score BETWEEN 0 AND 100),
  match_tier      TEXT CHECK (match_tier IN ('strong', 'moderate', 'weak')),
  present_skills  JSONB DEFAULT '[]',
  missing_skills  JSONB DEFAULT '[]',
  strengths       JSONB DEFAULT '[]',
  tailored_summary TEXT,
  suggestions     JSONB DEFAULT '[]',

  -- Meta
  processing_ms   INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX analyses_user_id_idx ON analyses(user_id);
CREATE INDEX analyses_created_at_idx ON analyses(created_at DESC);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their analyses"
  ON analyses FOR ALL USING (auth.uid() = user_id);
```

> **Note:** `resumes` table is not yet needed since the app uses text-paste only (no file upload built yet).

---

## 6. AI Processing Pipeline

### Current implementation (single-call)

```
User input
    │
    ▼
POST /api/analyze
    │
    ├─ Zod validate request (AnalyzeRequestSchema)
    │
    ├─ buildAnalysisPrompt(resumeText, jobDescription)
    │       ↓ single Claude API call
    │   claude-haiku-4-5  (max_tokens: 1500, temp: 0.2)
    │
    ├─ Strip markdown fences → JSON.parse
    │
    ├─ Zod validate AI output (AIAnalysisSchema)
    │       Fields: matchScore, presentSkills, missingSkills,
    │               strengths, tailoredSummary, suggestions
    │
    └─ Supabase INSERT → return { id, ...result }
```

### AI output schema (what Claude must return)

```typescript
{
  matchScore: number            // 0–100 integer
  presentSkills: Skill[]        // max 20
  missingSkills: Skill[]        // max 15
  strengths: string[]           // 1–10 items
  tailoredSummary: string       // 10–1000 chars
  suggestions: {
    section: 'summary' | 'experience' | 'skills' | 'education'
    suggested: string
    reasoning: string
  }[]                           // max 10
}
```

### Cost estimate
- `claude-haiku-4-5`: ~$0.002/analysis at 1,500 output tokens
- `claude-sonnet-4-6`: ~$0.015/analysis — use for higher accuracy

---

## 7. Security

### Authentication
- Supabase Auth (email/password + OAuth via `/auth/callback`)
- `middleware.ts` protects `/dashboard` and `/api` routes
- Server Supabase client uses `cookies()` — service role key never exposed to client

### Data protection
- RLS enforced at DB level: users can only query their own `analyses` rows
- API routes re-verify `auth.getUser()` as second layer
- AI responses parsed through Zod before any field is trusted

### Environment variables
```
ANTHROPIC_API_KEY              → server-only (Vercel env var)
NEXT_PUBLIC_SUPABASE_URL       → safe to expose
NEXT_PUBLIC_SUPABASE_ANON_KEY  → safe to expose
SUPABASE_SERVICE_ROLE_KEY      → server-only, NEVER expose to client
```

### Missing security items
- [ ] Rate limiting on `/api/analyze` (no protection currently)
- [ ] File upload validation (when PDF upload is added: type + size check)
- [ ] Startup env var validation (fail fast if `ANTHROPIC_API_KEY` missing)

---

## 8. What to Build Next (Prioritized)

### P0 — Can't ship without these

1. **`supabase/migrations/001_initial.sql`** — create `analyses` table + RLS
2. **`app/(auth)/login/page.tsx`** — wire up Supabase `signInWithPassword`
3. **`app/(auth)/signup/page.tsx`** — wire up Supabase `signUp`
4. **`app/(dashboard)/dashboard/page.tsx`** — summary stats + quick-start CTA
5. **`app/(dashboard)/history/page.tsx`** — list analyses with scores/dates

### P1 — Core product completeness

6. **`app/api/analyses/route.ts`** — `GET` list (needed by history page)
7. **`app/api/analyses/[id]/route.ts`** — `GET` single + `DELETE`
8. **`components/analysis/StrengthsList.tsx`** — render `strengths[]` on result page
9. **Export PDF** — wire up the Download button on result page (`react-pdf` or `jsPDF`)
10. **`app/(dashboard)/analysis/[id]/loading.tsx`** — skeleton while fetching
11. **`app/(dashboard)/analysis/[id]/error.tsx`** — error boundary UI

### P2 — Polish & production-readiness

12. **Rate limiting** on `/api/analyze` — simple in-memory or Upstash Redis
13. **`types/database.ts`** — generate Supabase types with `supabase gen types`
14. **Resume PDF upload** — `POST /api/resume/upload` + `pdf-parse` extraction
15. **Env var validation** — check all required vars at startup
16. **Google OAuth** — reduce signup friction

---

## 9. Trade-offs & Decisions

### Single AI call vs multi-call pipeline

| | Single call (current) | Multi-call pipeline |
|---|---|---|
| Latency | ~5–10s | ~15–25s |
| Cost | ~$0.002 | ~$0.005 |
| Complexity | Low | High |
| Output quality | Good | Slightly better |
| **Verdict** | **Use for MVP** | **Consider post-launch** |

### Synchronous vs async AI processing

| | Sync (current) | Async queue |
|---|---|---|
| Complexity | Low | High |
| UX | Loading spinner | Email/notification |
| Vercel timeout | ⚠️ 60s risk | ✅ No limit |
| **Verdict** | **Fine for MVP** | **Add Inngest/Trigger.dev at scale** |

> Mitigation: `claude-haiku-4-5` + max_tokens 1500 typically completes in 5–10s, well within 60s.

### JSONB vs normalized tables for AI output

- JSONB wins for MVP: no joins, flexible schema evolution, simpler queries
- Normalize only if you need cross-analysis queries like "all users missing React"

### Text-paste vs PDF upload

- Text-paste is faster to ship, works for all resume formats
- PDF upload (P1): adds `pdf-parse` dependency + Supabase Storage bucket setup
- Current architecture supports both — just add the upload route and pass `extractedText` to analyze

---

## 10. Deployment

```
Platform:    Vercel (recommended — App Router, Edge, serverless)
Database:    Supabase (managed Postgres + Auth + Storage)
AI:          Anthropic Claude API (haiku for cost, sonnet for quality)

Environment variables needed in Vercel:
  ANTHROPIC_API_KEY
  ANTHROPIC_MODEL              (optional, defaults to claude-haiku-4-5-20251001)
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY    (if using server-side admin operations)
```

### Deploy checklist
- [ ] Create Supabase project + run migration
- [ ] Enable Email auth in Supabase dashboard
- [ ] Set all env vars in Vercel
- [ ] Add Vercel domain to Supabase allowed origins
- [ ] Test full flow: signup → analyze → view result → history

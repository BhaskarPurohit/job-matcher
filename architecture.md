# Architecture — match//ai

This document describes the technical architecture of match//ai: an AI-powered resume analysis tool built on Next.js 14, Supabase, and Anthropic Claude. It is intended for engineers evaluating the codebase.

---

## System Overview

match//ai is a full-stack Next.js application deployed on Vercel. There is no separate backend service — all server logic runs as Next.js Route Handlers (serverless functions). Supabase provides PostgreSQL storage and GoTrue-based authentication. The AI layer calls Anthropic's Claude API; there is no model fine-tuning or self-hosted inference.

The core product is a **hybrid scoring pipeline**: a deterministic keyword extraction pass runs in parallel with an AI analysis pass, and their scores are blended by a weighted composite formula. This was a deliberate architectural choice — see the Scoring Algorithm section for rationale.

---

## Data Flow

### Full Request Lifecycle: POST /api/analyze

```
Client (browser)
    │
    │  POST /api/analyze
    │  { resumeText, jobDescription, jobTitle, companyName }
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js Route Handler — app/api/analyze/route.ts               │
│                                                                 │
│  1. supabase.auth.getUser()  ──── 401 if no session            │
│                                                                 │
│  2. checkQuota(userId)  ──────── 429 if analyses_used ≥ limit  │
│     (reads usage_quotas)          before any AI spend          │
│                                                                 │
│  3. Zod validation               400 + fieldErrors[] if bad    │
│                                                                 │
│  4. Promise.all([                                               │
│       computeKeywordScore(),   ◄─── synchronous, ~1ms          │
│       runAIAnalysis(),         ◄─── ~3-8s API call            │
│     ])                                                          │
│                                                                 │
│  5. computeCompositeScore()   final = kw×0.4 + ai×0.6         │
│                                                                 │
│  6. supabase.from('analyses').insert(...)                       │
│                                                                 │
│  7. void Promise.all([                   ◄─── fire-and-forget  │
│       logUsage(),                         after response sent  │
│       incrementUsage(),                                         │
│     ])                                                          │
│                                                                 │
│  8. return { success, data: { ...result, usage: { remaining }}}│
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
Client renders analysis result page
```

### Resume Parse Lifecycle: POST /api/resume/parse

```
Client
    │
    │  POST /api/resume/parse (multipart/form-data)
    │  file: File (PDF or DOCX, ≤4MB)
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  app/api/resume/parse/route.ts                                  │
│                                                                 │
│  1. Auth check                                                  │
│  2. MIME type + extension validation                            │
│  3. Size check (4MB — Vercel request body limit)                │
│                                                                 │
│  4. parseResume(file)  ──  lib/parser/resumeParser.ts          │
│       │                                                         │
│       ├─ PDF path: unpdf (pdf.js/WASM)                         │
│       │    getDocumentProxy() → extractText({ mergePages })    │
│       │                                                         │
│       └─ DOCX path: mammoth.extractRawText()                   │
│                                                                 │
│  5. cleanText(raw)                                              │
│       ├─ normalise line endings                                 │
│       ├─ fix 7 ligature patterns (ﬁ→fi, ﬂ→fl, etc.)           │
│       ├─ convert smart quotes/dashes to ASCII                  │
│       ├─ strip standalone page-number lines (/^\s*\d{1,3}\s*$/)│
│       └─ collapse 3+ blank lines → 2                           │
│                                                                 │
│  6. detectConfidence(text)                                      │
│       ├─ 'low'    — length < 200 chars                         │
│       ├─ 'medium' — >30% of lines are <10 chars               │
│       └─ 'high'   — otherwise                                  │
│                                                                 │
│  7. return { text, confidence, warnings[], fileType }           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

All tables enforce Row Level Security (RLS). API routes run as the authenticated user via `@supabase/ssr` cookie-based sessions — they cannot read other users' data.

### `analyses`

```sql
CREATE TABLE analyses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title        TEXT NOT NULL,
  company_name     TEXT,
  match_score      SMALLINT CHECK (match_score BETWEEN 0 AND 100),
  match_tier       TEXT CHECK (match_tier IN ('strong', 'moderate', 'weak')),
  present_skills   JSONB DEFAULT '[]',   -- [{name, importance}]
  missing_skills   JSONB DEFAULT '[]',   -- [{name, importance}]
  strengths        JSONB DEFAULT '[]',   -- string[]
  tailored_summary TEXT,
  suggestions      JSONB DEFAULT '[]',   -- [{section, suggested, reasoning}]
  processing_ms    INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now()
);
```

AI output fields are stored as JSONB rather than normalised relational tables. The schema for `present_skills`, `missing_skills`, and `suggestions` is defined in `types/analysis.ts` and validated at the application layer. This trade-off prioritises iteration speed — changing the AI output format doesn't require a migration — at the cost of not being able to query individual skills with SQL indexes.

**Indexes:** `(user_id)`, `(created_at DESC)`
**RLS policy:** `FOR ALL USING (auth.uid() = user_id)` — users own all operations on their rows.

---

### `usage_logs`

```sql
CREATE TABLE usage_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id       UUID REFERENCES analyses(id) ON DELETE SET NULL,
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens      INTEGER NOT NULL
                    GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  cost_usd          NUMERIC(10,6) NOT NULL DEFAULT 0,
  model             TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Append-only. Never updated after insert. `total_tokens` is a generated column — it is always consistent with its parts and cannot be manually set. `analysis_id` uses `ON DELETE SET NULL` so deleting an analysis does not erase the cost history.

**Indexes:** `(user_id)`, `(created_at DESC)`
**RLS policy:** users may SELECT their own rows; INSERT requires `auth.uid() = user_id`.

---

### `usage_quotas`

```sql
CREATE TABLE usage_quotas (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL DEFAULT 'free',
  analyses_used   INTEGER NOT NULL DEFAULT 0,
  analyses_limit  INTEGER NOT NULL DEFAULT 5,
  reset_at        TIMESTAMPTZ NOT NULL
                  DEFAULT (date_trunc('month', now()) + interval '1 month'),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

One row per user. Auto-provisioned on new signup via the `on_auth_user_created_quota` trigger. For users who existed before the trigger was deployed, `checkQuota()` upserts the row on first call.

`reset_at` stores *when* the quota should reset. Actual reset (zeroing `analyses_used`) is not yet automated — it requires a scheduled Supabase Edge Function or a Vercel cron job. This is a known gap; see Limitations.

---

### Auth Trigger

```sql
CREATE TRIGGER on_auth_user_created_quota
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_quota();
```

The trigger function uses `SECURITY DEFINER` so it can write to `public.usage_quotas` even though it fires from the `auth` schema. `ON CONFLICT DO NOTHING` makes it idempotent — re-running the migration does not corrupt existing rows.

---

## Scoring Algorithm

### Keyword Score (weight: 40%)

**File:** `lib/scoring/keywordExtractor.ts`

```
extractKeywords(text):
  1. Lowercase + strip non-alphanumeric (preserve c++, c#)
  2. Tokenise on whitespace
  3. Filter: length < 3 OR in STOPWORDS set (50 words)
  4. Return Map<word, frequency>

computeKeywordScore(resume, jd):
  resumeKw = extractKeywords(resume)
  jdKw     = extractKeywords(jd)

  totalWeight = Σ jdKw[word].frequency
  hitWeight   = Σ jdKw[word].frequency  WHERE word ∈ resumeKw

  rawRatio = hitWeight / totalWeight    // 0.0 – 1.0
  dampened = √rawRatio                  // soft ceiling
  score    = round(dampened × 95)       // max 95, never 100
```

**Why square-root damping?** A resume that contains every single keyword from the JD (e.g. a copied-and-pasted JD) would score 100 on the keyword leg, which would pull the composite score to a minimum of 40. The `√` transform maps a perfect keyword match to ~95 on this leg, preserving headroom for the AI score to differentiate candidates. A 100% keyword match with a 60 AI score produces a composite of `round(95×0.4 + 60×0.6) = 74` — correctly "moderate," better than average but not top-of-stack.

**Why JD-frequency weighting?** A keyword that appears once in the JD is a lower-signal requirement than one repeated five times. Weighting by JD frequency approximates importance without requiring any external ontology or role-specific keyword lists.

### AI Score (weight: 60%)

**File:** `lib/scoring/aiAnalyzer.ts`

The AI call instructs Claude to evaluate *genuine skill and experience alignment*, explicitly noting that keyword presence is handled separately. This keeps the two components statistically independent — the AI is not rewarded for counting words.

Input is hard-truncated:
- Resume: 6,000 chars (~1,500 tokens)
- JD: 3,000 chars (~750 tokens)

Total prompt is approximately 2,500–3,000 tokens. With `max_tokens: 2048` for the response, each analysis call costs roughly 4,500–5,000 tokens total.

The model response is parsed defensively: `safeParseJSON()` attempts standard `JSON.parse()`, then falls back to extracting the first `{...}` block from the raw string (handles cases where Claude prepends a sentence despite instructions). If both fail, `validateResult()` returns the typed fallback (`aiScore: 50`, empty arrays) rather than throwing. This trades occasional score accuracy for zero 502s on malformed model output.

### Composite Score

**File:** `lib/scoring/compositeScorer.ts`

```typescript
finalScore = Math.round(keywordScore * 0.4 + aiScore * 0.6)
```

**Match tiers:**
- `strong` ≥ 70
- `moderate` 40–69
- `weak` < 40

**Why 40/60?** The AI signal is given higher weight because it evaluates experience quality and semantic fit — things keyword matching cannot assess. Keyword matching is still meaningful because ATS systems at many companies are keyword-based, so it's a useful proxy for "will this resume even be seen." The 40% floor also means a candidate with genuinely relevant experience but imperfect keyword coverage won't score in the weak tier solely due to word choice.

The weights are currently hardcoded. A/B testing this ratio against actual hiring outcomes is on the roadmap.

---

## Cost Model

Cost is calculated in `lib/usage/tracker.ts` before each `usage_logs` insert:

```typescript
cost_usd = (promptTokens / 1000) × 0.000003
         + (completionTokens / 1000) × 0.000015
```

These are Claude Haiku's published input/output token prices as of April 2026. They must be updated manually if the model or pricing changes — there is no automatic price-sync mechanism.

**Typical cost per analysis:**
- Input: ~2,800 tokens → $0.0000084
- Output: ~600 tokens → $0.000009
- **Total: ~$0.000017 per analysis** (less than $0.00002)

At 5 analyses/user on the free tier, the maximum cost per user is ~$0.0001. The quota exists to prevent abuse and create upgrade pressure, not because of direct cost pressure at current scale.

`NUMERIC(10,6)` stores values up to `9999.999999` — sufficient for any plausible per-user cost tracking.

---

## Prompt Design

The current prompt is built inline in `lib/scoring/aiAnalyzer.ts:buildPrompt()`. Key design choices:

**Explicit orthogonality instruction:** The prompt tells the model "aiScore: reflect genuine skill and experience alignment, not keyword presence (that is handled separately)." Without this, Claude tends to score higher when it sees more matching keywords in the resume — double-counting the keyword signal.

**Strict JSON instruction:** "Respond ONLY with valid JSON, no markdown, no explanation." Combined with `safeParseJSON()` fallback extraction, this produces parseable output ~99% of the time at `temperature: 0.2`.

**Section deduplication at validation time:** Even if the model returns two suggestions for the "Experience" section (which the prompt forbids), `validateResult()` deduplicates by section before returning — last occurrence wins. The UI's accordion uses section as the React key, so duplicates would silently overwrite each other if not caught server-side.

**No prompt versioning:** The prompt is in source code. Changing it changes all future analyses. There is no way to A/B test variants or roll back a bad change without a code deployment. Adding a `prompt_versions` table and linking each `usage_logs` row to the prompt version used is a planned improvement.

---

## Authentication & Session Model

Supabase GoTrue handles auth. Sessions are cookie-based via `@supabase/ssr`. The `middleware.ts` runs on every request to the `(dashboard)` routes and calls `supabase.auth.getUser()` — this is a network call to Supabase on each request. If Supabase is down, middleware fails open (catch block redirects to login rather than returning 500) to prevent the dashboard from being permanently inaccessible during Supabase outages.

OAuth (Google, GitHub) uses the standard Supabase OAuth flow with `redirectTo` pointing to `/auth/callback`, which exchanges the code for a session cookie and redirects to `/dashboard`.

---

## Known Limitations

### Quota Reset Not Automated
`usage_quotas.reset_at` stores the intended reset timestamp but nothing zeros `analyses_used` at that time. This needs a Supabase Edge Function on a cron schedule or a Vercel cron job. Currently, free-tier users who hit their limit stay at their limit indefinitely until manually reset.

### No Prompt Versioning
Prompt changes are invisible in the data. A/B testing scoring quality or rolling back a bad prompt requires a code deployment. A `prompt_versions` table linked to `usage_logs.prompt_version_id` is the correct fix.

### Keyword Extractor Is Unigrams Only
The keyword extractor tokenises on whitespace and treats each word independently. This means "machine learning" and "deep learning" are treated as `{machine:1, learning:2, deep:1}` — the phrase is lost. Bigram extraction would improve matching for multi-word technical terms. This is the single largest source of false negatives in the keyword score.

### No Resume Storage
The raw resume text is not persisted — it is consumed during the analysis and discarded. Users must re-upload to run a second analysis against a different JD. Storing the parsed resume text (or a hash-keyed cache) would improve the "apply to multiple jobs" workflow significantly.

### AI Score Non-Determinism
`temperature: 0.2` produces low but non-zero variance. Two identical submissions will typically produce scores within ±3 points but can occasionally differ by more. This is inherent to LLM sampling. Caching AI responses by `SHA256(resume+jd)` would give deterministic results for identical inputs; not implemented due to the risk of serving a cached response after a prompt change.

### `incrementUsage` Race Condition
`incrementUsage()` tries an RPC call (`increment_analyses_used`) which is atomic. If the RPC function is not deployed (e.g. a fresh environment), it falls back to a read-modify-write pattern that has a race condition under concurrent requests from the same user. The fix is to deploy the PostgreSQL function or change the fallback to `UPDATE ... SET analyses_used = analyses_used + 1 WHERE user_id = $1`.

### DOCX Multi-Column Layouts
mammoth extracts DOCX text in document order, which for two-column resume templates produces interleaved content from adjacent columns. `detectConfidence()` will classify this as `medium` and warn the user, but the text passed to the AI will still be scrambled. There is no current fix for this within mammoth's extraction model.

---

## Planned Improvements

| Priority | Item |
|---|---|
| High | Quota reset cron job (Supabase Edge Function or Vercel cron) |
| High | Deploy `increment_analyses_used` PostgreSQL function for atomic counter |
| Medium | Bigram keyword extraction for multi-word technical terms |
| Medium | Prompt versioning in database |
| Medium | Resume storage + multi-JD comparison against same resume |
| Low | A/B test the 40/60 score weighting against hiring outcome data |
| Low | AI response caching by content hash |
| Low | Cover letter generation (referenced in UI copy, not yet implemented) |

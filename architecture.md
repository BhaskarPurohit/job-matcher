# AI Resume + Job Match Analyzer — Architecture

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js App Router (SSR + API)             │   │
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
│   Supabase          │        │   OpenAI / Claude API   │
│  ┌───────────────┐  │        │                         │
│  │  PostgreSQL   │  │        │  - Resume parsing       │
│  │  (schema)     │  │        │  - Match scoring        │
│  ├───────────────┤  │        │  - Skill gap analysis   │
│  │  Auth         │  │        │  - Suggestions          │
│  ├───────────────┤  │        └─────────────────────────┘
│  │  Storage      │  │
│  │  (resumes)    │  │
│  └───────────────┘  │
└─────────────────────┘
```

**Request flow:**
1. User uploads resume → Supabase Storage
2. User pastes job description → stored in DB
3. API route triggers AI pipeline (OpenAI/Claude)
4. AI returns structured JSON → stored in DB
5. UI renders match score, gaps, suggestions

---

## 2. Folder Structure

```
ai-resume-matcher/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard home
│   │   ├── analyze/
│   │   │   └── page.tsx                # New analysis form
│   │   ├── history/
│   │   │   └── page.tsx                # Analysis history
│   │   └── analysis/[id]/
│   │       └── page.tsx                # Single result view
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts                # POST: trigger analysis
│   │   ├── analyses/
│   │   │   ├── route.ts                # GET: list history
│   │   │   └── [id]/route.ts           # GET: single analysis
│   │   ├── resume/
│   │   │   └── upload/route.ts         # POST: upload resume
│   │   └── webhooks/
│   │       └── stripe/route.ts         # (scalable: billing)
│   └── layout.tsx
│
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── analysis/
│   │   ├── ScoreRing.tsx
│   │   ├── SkillGapList.tsx
│   │   ├── SuggestionCard.tsx
│   │   └── AnalysisResult.tsx
│   ├── resume/
│   │   ├── ResumeUpload.tsx
│   │   └── ResumePreview.tsx
│   └── forms/
│       └── AnalyzeForm.tsx
│
├── lib/
│   ├── ai/
│   │   ├── pipeline.ts                 # Orchestrates AI calls
│   │   ├── prompts.ts                  # All prompt templates
│   │   ├── parsers.ts                  # Parse AI JSON output
│   │   └── providers/
│   │       ├── openai.ts
│   │       └── claude.ts
│   ├── supabase/
│   │   ├── client.ts                   # Browser client
│   │   ├── server.ts                   # Server client
│   │   └── middleware.ts
│   ├── storage/
│   │   └── resume.ts                   # Upload/retrieve resume
│   └── utils/
│       ├── pdf.ts                      # PDF text extraction
│       └── validation.ts
│
├── types/
│   ├── analysis.ts
│   ├── resume.ts
│   └── database.ts                     # Generated Supabase types
│
├── middleware.ts                        # Auth protection
├── .env.local
└── supabase/
    └── migrations/
        └── 001_initial.sql
```

---

## 3. API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/resume/upload` | ✅ | Upload PDF/DOCX → Supabase Storage, extract text |
| `POST` | `/api/analyze` | ✅ | Trigger AI analysis pipeline |
| `GET` | `/api/analyses` | ✅ | List user's analysis history |
| `GET` | `/api/analyses/[id]` | ✅ | Get single analysis result |
| `DELETE` | `/api/analyses/[id]` | ✅ | Delete analysis |

### Request/Response shapes

```typescript
// POST /api/analyze
type AnalyzeRequest = {
  resumeId: string        // Supabase storage path
  jobTitle: string
  jobDescription: string
  companyName?: string
}

type AnalyzeResponse = {
  analysisId: string
  matchScore: number      // 0-100
  matchTier: 'strong' | 'moderate' | 'weak'
  missingSkills: Skill[]
  presentSkills: Skill[]
  tailoredSummary: string
  suggestions: Suggestion[]
  processingTimeMs: number
}

type Skill = {
  name: string
  importance: 'required' | 'preferred' | 'nice-to-have'
  found: boolean
}

type Suggestion = {
  section: 'summary' | 'experience' | 'skills' | 'education'
  original?: string
  suggested: string
  reasoning: string
}
```

---

## 4. DB Schema

```sql
-- supabase/migrations/001_initial.sql

-- Users handled by Supabase Auth (auth.users)

CREATE TABLE resumes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  storage_path TEXT NOT NULL,           -- Supabase storage object path
  extracted_text TEXT,                  -- Plain text from PDF
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id       UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_title       TEXT NOT NULL,
  job_description TEXT NOT NULL,
  company_name    TEXT,

  -- AI output (stored as JSONB for flexibility)
  match_score     SMALLINT CHECK (match_score BETWEEN 0 AND 100),
  match_tier      TEXT CHECK (match_tier IN ('strong', 'moderate', 'weak')),
  missing_skills  JSONB DEFAULT '[]',
  present_skills  JSONB DEFAULT '[]',
  tailored_summary TEXT,
  suggestions     JSONB DEFAULT '[]',

  -- Meta
  ai_model        TEXT NOT NULL,        -- 'gpt-4o' | 'claude-3-5-sonnet'
  processing_ms   INTEGER,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','complete','error')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX analyses_user_id_idx ON analyses(user_id);
CREATE INDEX analyses_created_at_idx ON analyses(created_at DESC);

-- Row Level Security
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their resumes"
  ON resumes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their analyses"
  ON analyses FOR ALL USING (auth.uid() = user_id);
```

---

## 5. AI Processing Pipeline

```typescript
// lib/ai/pipeline.ts

export async function runAnalysisPipeline(input: PipelineInput): Promise<AnalysisResult> {
  // Step 1: Extract structured resume data
  const resumeData = await extractResumeStructure(input.resumeText)

  // Step 2: Extract job requirements
  const jobData = await extractJobRequirements(input.jobDescription)

  // Step 3: Score and gap analysis (single call with full context)
  const analysis = await scoreAndAnalyze(resumeData, jobData)

  // Step 4: Generate tailored suggestions
  const suggestions = await generateSuggestions(resumeData, jobData, analysis)

  return { ...analysis, suggestions }
}
```

### Prompt strategy (2-call approach for MVP)

**Call 1 — Structured extraction + scoring:**
```
System: You are an expert ATS resume analyzer. Return ONLY valid JSON.

User:
RESUME:
{resumeText}

JOB DESCRIPTION:
{jobDescription}

Analyze the resume against the job description and return:
{
  "matchScore": <0-100>,
  "matchTier": "strong|moderate|weak",
  "presentSkills": [{"name": string, "importance": "required|preferred"}],
  "missingSkills": [{"name": string, "importance": "required|preferred"}],
  "tailoredSummary": "<2-3 sentence professional summary targeting this role>"
}
```

**Call 2 — Suggestions:**
```
System: You are a professional resume coach. Return ONLY valid JSON.

User:
Based on this resume and job match analysis, provide 3-5 specific,
actionable resume improvements:
[context from call 1]

Return: {"suggestions": [{"section", "original", "suggested", "reasoning"}]}
```

### Provider abstraction

```typescript
// lib/ai/providers/index.ts
export function getAIProvider() {
  const provider = process.env.AI_PROVIDER ?? 'openai'
  return provider === 'claude'
    ? new ClaudeProvider(process.env.ANTHROPIC_API_KEY!)
    : new OpenAIProvider(process.env.OPENAI_API_KEY!)
}
```

**Model recommendations:**
- MVP: `gpt-4o-mini` (~$0.003/analysis) or `claude-haiku-4-5`
- Portfolio polish: `gpt-4o` or `claude-sonnet-4-6`

---

## 6. Security Considerations

### Authentication
- Supabase Auth with email/password + Google OAuth
- `middleware.ts` protects all `/dashboard` and `/api` routes
- Server-side Supabase client uses `cookies()` — never exposes service role key to client

### File upload
```typescript
// Validate before storing
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
const MAX_SIZE_BYTES = 5 * 1024 * 1024  // 5MB

if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Invalid file type')
if (file.size > MAX_SIZE_BYTES) throw new Error('File too large')
```

- Store resumes in a **private** Supabase Storage bucket (not public)
- Generate signed URLs for download, expiring in 1 hour
- Strip file metadata before AI processing

### API protection
- All API routes validate `auth.uid()` — users can only access their own data
- RLS enforced at DB level as a second layer
- Rate limit `/api/analyze` — 10 requests/hour per user
  - MVP: simple in-memory counter
  - Scalable: Upstash Redis

### Secret management
```
OPENAI_API_KEY          → Vercel env var (server-only)
ANTHROPIC_API_KEY       → Vercel env var (server-only)
SUPABASE_SERVICE_ROLE   → Vercel env var (server-only, NEVER expose to client)
NEXT_PUBLIC_SUPABASE_URL      → safe to expose
NEXT_PUBLIC_SUPABASE_ANON_KEY → safe to expose
```

### AI output safety
- Always parse AI responses through a Zod schema — never trust raw `JSON.parse()`
- Sanitize AI text before rendering (avoid `dangerouslySetInnerHTML`)

---

## 7. MVP vs Scalable

### MVP (ship in 7 days)

| Concern | Decision | Why |
|---------|----------|-----|
| AI calls | Synchronous in API route | Simple, no queue needed |
| Rate limiting | In-memory counter | No Redis dependency |
| Resume storage | Supabase Storage | Zero infra setup |
| PDF parsing | `pdf-parse` npm package | Serverless-compatible |
| Auth | Supabase email/password | Built-in, 30min setup |
| Billing | None | Ship first |
| History | All stored in DB | No archival needed at small scale |

### Scalable (post-launch)

| Concern | Upgrade | Why |
|---------|---------|-----|
| AI calls | Background jobs via Inngest/Trigger.dev | Handle timeouts, retries, Vercel 60s limit |
| Rate limiting | Upstash Redis | Distributed, accurate |
| Resume processing | Dedicated microservice | Isolate heavy compute |
| PDF parsing | Dedicated worker or Apify | Better accuracy, handles scanned PDFs |
| Auth | Add Google/LinkedIn OAuth | Reduce signup friction |
| Billing | Stripe + usage metering | Monetize power users |
| Caching | Redis cache AI results | Same resume+JD = no re-call |
| Multi-tenancy | Org/team support | B2B expansion |

---

## 8. Trade-offs

### Sync vs async AI processing

| | Sync (MVP) | Async (Queue) |
|---|---|---|
| Complexity | Low | High |
| UX | Loading spinner | Email/notification |
| Vercel limit | ⚠️ 60s timeout risk | ✅ No limit |
| **Verdict** | **Use for MVP** | **Migrate at scale** |

> **Mitigation for MVP:** Use streaming responses from OpenAI/Claude to show progressive output before timeout hits. `gpt-4o-mini` + concise prompts typically runs in 8–15s.

### Single DB call vs JSONB vs normalized tables

Storing `missing_skills`, `suggestions` etc. as **JSONB** vs separate tables:
- JSONB wins for MVP — simpler queries, no joins, flexible schema evolution
- Normalize only if you need to query "show all users missing React" across analyses

### OpenAI vs Claude

| | OpenAI `gpt-4o-mini` | Claude `haiku-4-5` |
|---|---|---|
| JSON reliability | ✅ `response_format: json_object` | ✅ Tool use / JSON mode |
| Speed | Fast | Fast |
| Cost | ~$0.003/analysis | ~$0.002/analysis |
| **Verdict** | **Slightly easier JSON** | **Cheaper + equal quality** |

Recommendation: Abstract the provider (as shown in section 5), default to OpenAI, configure via `AI_PROVIDER` env var.

---

## 9. Quick-start Checklist (7-day sprint)

```
Day 1: Supabase project + auth + DB schema + env setup
Day 2: Resume upload + PDF extraction
Day 3: AI pipeline (prompts + parsing + Zod validation)
Day 4: Core UI (upload form + results display)
Day 5: History page + single analysis view
Day 6: Polish (loading states, error handling, score ring animation)
Day 7: Deploy to Vercel + domain + README
```

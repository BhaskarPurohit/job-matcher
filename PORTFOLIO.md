# Portfolio Materials — AI Resume + Job Match Analyzer

---

## 1. Resume Bullet Points

Pick the 3 that best match the role you're applying to.

---

**Bullet A — Full-stack + AI focus**
> Built an AI Resume + Job Match Analyzer with Next.js App Router and OpenAI API; engineered a two-layer Zod validation pipeline (request inputs + raw AI output) and a structured `FieldError[]` response contract that maps validation failures directly to form fields client-side.

**Bullet B — Architecture + TypeScript focus**
> Architected a full-stack SaaS analyzer with discriminated union API contracts (`success: true | false`), async server components with `notFound()` boundaries, a swappable three-tier storage abstraction (in-memory → Supabase → Drizzle), and a custom `AIAnalysisError` class with error cause chaining.

**Bullet C — Testing + production quality focus**
> Shipped production-grade API route for AI resume analysis with Vitest test suite covering boundary values (99 vs. 100-char inputs), whitespace-only refine checks, AI mock isolation, and contract assertions verifying `fieldErrors` is always a stable array — no test makes a real network call.

---

## 2. Portfolio Project Description

*(For personal site, Notion portfolio, or application project section — ~120 words)*

---

**AI Resume + Job Match Analyzer**
*Next.js · TypeScript · Tailwind · OpenAI API · Zod · Vitest*

A full-stack SaaS tool that analyzes a resume against a job description using OpenAI's structured JSON output mode and returns a match score (0–100), skill gap analysis, a role-tailored professional summary, and specific resume improvement suggestions.

Built with Next.js App Router, separating server components (data fetching, no JS shipped) from client islands (copy button only). The API layer uses a two-layer Zod validation pipeline — request inputs and raw AI output — with a consistent `FieldError[]` response contract for form-level error display. Storage is abstracted across three tiers (in-memory, Supabase, Drizzle) with a single function signature so callers never change when the backend upgrades. Includes a Vitest suite with boundary value, whitespace refine, and AI mock isolation tests.

[GitHub →](#) | [Live Demo →](#)

---

## 3. GitHub README

*(Copy into README.md at the project root)*

---

```markdown
# match//ai — AI Resume + Job Match Analyzer

Analyze your resume against any job description. Get a match score, skill gaps,
a tailored professional summary, and specific suggestions — all in under 15 seconds.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Tests](https://img.shields.io/badge/tests-14%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it does

1. Upload your resume (PDF or DOCX)
2. Paste a job description
3. Receive:
   - **Match score** (0–100) with a Strong / Moderate / Weak tier
   - **Skill gap analysis** — present skills vs. missing skills by importance
   - **Tailored professional summary** written for the specific role
   - **Actionable suggestions** — section-level resume improvements with reasoning

---

## Tech stack

| Layer       | Technology                            |
|-------------|---------------------------------------|
| Framework   | Next.js 14 App Router                 |
| Language    | TypeScript (strict mode)              |
| Styling     | Tailwind CSS + CSS variable design tokens |
| UI          | shadcn/ui + Lucide icons              |
| AI          | OpenAI `gpt-4o-mini` (`response_format: json_object`) |
| Validation  | Zod (request inputs + AI output)      |
| Testing     | Vitest                                |
| Storage     | In-memory → Supabase → Drizzle (swappable) |
| Deploy      | Vercel                                |

---

## Architecture highlights

### Two-layer validation
Every request is validated by Zod before the AI is called. The AI response is
also validated by a separate Zod schema before any field is trusted — `JSON.parse()`
alone is never used.

```ts
// Request validation
const parsed = AnalyzeRequestSchema.safeParse(body)

// AI output validation (separate schema)
const result = AIAnalysisSchema.safeParse(JSON.parse(rawContent))
```

### Consistent error contract
All API errors — validation failures, AI errors, rate limits — share one shape:

```ts
{ success: false, code: string, error: string, fieldErrors: FieldError[] }
```

`fieldErrors` is always a stable array (never `undefined`), so client code can
destructure it without guards.

### Async server components
The results page is a pure `async` server component. No `useState`, no
`useEffect`, no `"use client"`. The only client JavaScript shipped is the
`CopyButton` component (~300 bytes).

```ts
export default async function AnalysisResultPage({ params }) {
  const analysis = await getAnalysisById(params.id)
  if (!analysis) notFound()
  // renders real data, no hydration overhead
}
```

### Swappable storage
```ts
// Swap Tier 1 → Tier 2 by changing one function body.
// Every caller (page, API route) is untouched.
export async function getAnalysisById(id: string): Promise<Analysis | null> {
  return analysisStore.get(id) ?? null   // Tier 1: in-memory
  // return await supabaseQuery(id)      // Tier 2: Supabase (comment swap)
}
```

---

## Project structure

```
app/
  api/analyze/route.ts         — POST handler: validate → AI → persist → respond
  (dashboard)/
    layout.tsx                 — Sidebar + shell (single source of truth)
    page.tsx                   — Dashboard with stats and recent analyses
    analyze/page.tsx           — Upload form + job description input
    analysis/[id]/
      page.tsx                 — Async server component, real data by ID
      loading.tsx              — Skeleton with directional SVG shimmer
      error.tsx                — Structured error boundary with cause mapping

lib/
  ai/
    analyze.ts                 — OpenAI call + custom error class
    schema.ts                  — Zod schemas + extractFieldErrors()
    prompts.ts                 — Prompt templates
  data/analyses.ts             — Tiered storage abstraction
  hooks/useAnalyze.ts          — Client hook with fieldError(field) helper

types/analysis.ts              — Shared TypeScript interfaces
tests/api/analyze.test.ts      — 14 Vitest tests, zero real network calls
```

---

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/your-username/job-matcher
cd job-matcher
npm install

# 2. Set environment variables
cp .env.local.example .env.local
# Add OPENAI_API_KEY to .env.local

# 3. Run development server
npm run dev

# 4. Run tests
npm test
```

---

## Running tests

```bash
npm test           # run all tests
npm run test:watch # watch mode
npm run test:cover # coverage report
```

The test suite mocks the AI module globally — no API key needed to run tests.

---

## Roadmap

- [ ] Supabase auth + user accounts
- [ ] PDF text extraction (pdf-parse)
- [ ] Supabase storage for resume files
- [ ] Analysis history persistence
- [ ] Export to PDF
- [ ] Streaming AI responses (reduce perceived latency)
- [ ] Rate limiting via Upstash Redis

---

## License

MIT
```

---

## 4. LinkedIn Post

*(Paste as-is. Optimized for reach: hook → problem → build → signal → CTA)*

---

I just shipped a project that I actually wish existed when I was job hunting.

**match//ai** — an AI resume analyzer that tells you exactly how well your resume matches a specific job description.

Not vibes. Actual signal:
→ Match score (0–100)
→ Which required skills you're missing
→ A tailored summary rewritten for the role
→ Specific resume changes with reasoning

---

What I built under the hood:

**AI layer**
Used OpenAI's `response_format: json_object` to force structured output. Then validated the AI response with a separate Zod schema before trusting any field. Two layers of validation — request inputs and AI output — because AI responses break in production in ways you don't expect.

**API design**
Every error, whether a missing field, an AI failure, or a rate limit, returns the same shape: `{ success, code, error, fieldErrors[] }`. Field errors are structured objects with a field name and message, not a concatenated string. The form can highlight the exact broken input.

**Architecture**
The results page is a pure async server component. Zero `useState`. Zero `useEffect`. The only JavaScript that ships to the browser is the copy button.

Storage is a three-tier abstraction — in-memory now, Supabase next, Drizzle for scale — behind a single `getAnalysisById()` function. The page never knows which tier is running.

**Testing**
14 Vitest tests. Boundary values (99 chars fails, 100 passes), whitespace-only refine checks, and a `not.toHaveBeenCalled()` assertion proving the AI is never called when validation fails. Zero real network calls in the test suite.

---

The stack: Next.js 14 App Router · TypeScript · Tailwind · OpenAI API · Zod · Vitest · Vercel

GitHub link in comments. Would love feedback from anyone who's built AI-powered tools or worked on resume/career tech.

#buildinpublic #nextjs #typescript #webdev #ai

---

## 5. 90-Second Interview Explanation

*(Practice this out loud. Hits problem → decision → hard part → result.)*

---

> "I built a full-stack AI tool called match//ai that analyzes your resume against a job description and gives you a match score, skill gaps, and specific rewrite suggestions.
>
> The most interesting engineering decision was around AI output trust. OpenAI returns JSON, but the structure can drift, fields can be missing, values can be wrong types. So I built two separate Zod schemas — one validates the incoming request before I call the AI at all, and a second validates the raw JSON the model returns before any field gets used. That way I know the shape of data at every boundary.
>
> The second interesting part was the error contract. I wanted every failure — validation error, AI error, rate limit — to return the same shape from the API, with `fieldErrors` always being a stable array. That means the React hook consuming it never needs to guard for undefined or parse a string to figure out which input failed. It just calls `fieldError('resumeText')` and gets the message or undefined.
>
> On the frontend, the results page is a pure async server component. No hooks, no client-side fetching. The only JavaScript that ships to the browser for that whole page is the copy-to-clipboard button, which is about 300 bytes.
>
> I also wrote a Vitest suite testing the API route directly — calling the exported handler function without an HTTP server, with the AI mocked so no tests hit the network. I specifically tested boundary values — 99 characters should fail, 100 should pass — because that's where off-by-one bugs live."

---

## 6. Why This Project Is Impressive to Hiring Managers

*(What a senior engineer or hiring manager actually notices — not marketing)*

---

**What most candidates submit:** a frontend that calls an AI API, renders the response, and calls it done.

**What this project demonstrates instead:**

**1. You think in contracts, not just code**
The `AnalyzeErrorResponse` type has `fieldErrors: FieldError[]` — always an array, never optional. That's not accidental. It means you thought about what the consumer needs and made it impossible for a breaking change to slip in silently. Junior engineers think about making it work; senior engineers think about what breaks the consumer.

**2. You validate AI output, not just user input**
Most AI integrations do `JSON.parse(response)` and spread the result directly. You run it through a Zod schema. A senior engineer reviewing this will immediately recognize that you've been burned by (or read about being burned by) AI schema drift in production. That's hard-won knowledge.

**3. You know where JavaScript belongs**
The results page is an async server component. You didn't reach for `useEffect` and `fetch` because that's the pattern you know — you made a conscious decision about what renders on the server vs. what ships as JavaScript. That distinction matters for performance and for demonstrating App Router comprehension.

**4. Your tests prove something**
`expect(analyzeResume).not.toHaveBeenCalled()` — testing that the AI function is *not* invoked on bad input shows you think about cost, side effects, and correctness simultaneously. Most portfolio test suites only assert happy paths.

**5. The architecture document exists and matches the code**
An ADR-style architecture doc with tradeoff analysis (sync vs. async AI, JSONB vs. normalized tables, OpenAI vs. Claude) that reflects what's actually built signals someone who thinks before coding and documents decisions. Rare at any level, striking in a portfolio.

**6. The storage abstraction is production-aware**
The tiered `getAnalysisById()` with in-memory now and Supabase commented in is not lazy — it's deliberate. It shows you know how to ship something that works today while designing the seam for what comes next. That's exactly how good engineers operate under deadline.

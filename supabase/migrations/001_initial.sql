-- supabase/migrations/001_initial.sql
-- Run this in the Supabase SQL editor or via: supabase db push

CREATE TABLE IF NOT EXISTS analyses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title        TEXT NOT NULL,
  company_name     TEXT,

  -- AI output (JSONB for flexibility)
  match_score      SMALLINT CHECK (match_score BETWEEN 0 AND 100),
  match_tier       TEXT CHECK (match_tier IN ('strong', 'moderate', 'weak')),
  present_skills   JSONB DEFAULT '[]',
  missing_skills   JSONB DEFAULT '[]',
  strengths        JSONB DEFAULT '[]',
  tailored_summary TEXT,
  suggestions      JSONB DEFAULT '[]',

  -- Meta
  processing_ms    INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX analyses_user_id_idx    ON analyses(user_id);
CREATE INDEX analyses_created_at_idx ON analyses(created_at DESC);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their analyses"
  ON analyses FOR ALL USING (auth.uid() = user_id);

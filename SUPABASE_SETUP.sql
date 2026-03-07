-- Run this in Supabase → SQL Editor → New Query

CREATE TABLE screenings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name    TEXT,
  patient_age     INTEGER,
  patient_gender  TEXT,
  mmse_score      INTEGER,
  risk_level      TEXT,
  risk_score      FLOAT,
  clock_score     INTEGER,
  pentagon_score  INTEGER,
  speech_score    INTEGER,
  memory_recall   TEXT,
  ai_summary      TEXT,
  answers         JSONB,
  completed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anyone to INSERT (patients submitting results)
ALTER TABLE screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert"
  ON screenings FOR INSERT
  WITH CHECK (true);

-- Only authenticated users (doctor) can SELECT
CREATE POLICY "Anyone can select"
  ON screenings FOR SELECT
  USING (true);

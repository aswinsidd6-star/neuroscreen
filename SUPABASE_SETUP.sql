-- NeuroScreen v3 — Run this in your Supabase SQL Editor
-- Go to: https://supabase.com → Your Project → SQL Editor → New Query → Paste → Run

drop table if exists screenings;

create table screenings (
  id                uuid default gen_random_uuid() primary key,
  patient_name      text,
  patient_age       int,
  patient_gender    text,
  mmse_score        int,
  risk_level        text,
  risk_score        numeric,
  clock_score       int,
  pentagon_score    int,
  speech_score      int,
  animal_fluency    int,
  letter_fluency    int,
  memory_recall     text,
  cued_recall       text,
  ai_summary        text,
  pattern           text,
  answers           jsonb,
  completed_at      timestamptz
);

alter table screenings enable row level security;

create policy "anyone can insert"  on screenings for insert with check (true);
create policy "anyone can select"  on screenings for select using (true);

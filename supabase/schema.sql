-- ============================================================================
-- The Congressional Award Tracker — Supabase PostgreSQL Schema
-- Run this entire script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- Enable UUID generation extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- Stores participant profile, official activity start date, target award level,
-- and non-family adult Advisor details.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_name TEXT NOT NULL DEFAULT 'Participant',
  activity_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_award_level TEXT NOT NULL DEFAULT 'bronze_medal',
  state_or_district TEXT DEFAULT '',
  advisor_name TEXT NOT NULL DEFAULT '',
  advisor_email TEXT NOT NULL DEFAULT '',
  advisor_role TEXT DEFAULT '',
  advisor_phone TEXT DEFAULT '',
  advisor_non_family_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. GOALS TABLE
-- Stores Program Area goals (VPS max 4, PD max 2, PF max 2) and their
-- assigned non-family adult Validator details.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_area TEXT NOT NULL CHECK (program_area IN ('VPS', 'PD', 'PF')),
  goal_number INTEGER NOT NULL CHECK (goal_number >= 1 AND goal_number <= 4),
  smart_goal TEXT NOT NULL DEFAULT '',
  activities TEXT NOT NULL DEFAULT '',
  improvement TEXT DEFAULT '',
  impact TEXT DEFAULT '',
  organization_default TEXT DEFAULT '',
  validator_name TEXT NOT NULL DEFAULT '',
  validator_email TEXT NOT NULL DEFAULT '',
  validator_role TEXT NOT NULL DEFAULT '',
  validator_phone TEXT DEFAULT '',
  validator_non_family_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, program_area, goal_number)
);

-- ----------------------------------------------------------------------------
-- 3. ACTIVITY LOGS TABLE
-- Official Hour Log entries validated against the participant's start date.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  program_area TEXT NOT NULL CHECK (program_area IN ('VPS', 'PD', 'PF')),
  goal_number INTEGER NOT NULL CHECK (goal_number >= 1 AND goal_number <= 4),
  activity TEXT NOT NULL,
  organization TEXT DEFAULT '',
  hours NUMERIC(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  is_indirect BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_profile_date
  ON public.activity_logs (profile_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_area_goal
  ON public.activity_logs (profile_id, program_area, goal_number);

-- ----------------------------------------------------------------------------
-- 4. EXPEDITIONS TABLE
-- Stores In-Person (daily 6-8h timestamped itinerary_json) and Virtual
-- (activity checklist & 7 official reflection questions in reflections_json)
-- Expedition / Exploration records.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expeditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'in_person' CHECK (mode IN ('in_person', 'virtual')),
  type TEXT NOT NULL DEFAULT 'Expedition' CHECK (type IN ('Expedition', 'Exploration')),
  title TEXT DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date DATE,
  total_days INTEGER NOT NULL DEFAULT 1,
  total_nights INTEGER NOT NULL DEFAULT 0,
  overview TEXT DEFAULT '',
  itinerary_json JSONB NOT NULL DEFAULT '{"inPersonDays": [], "packingAndPlanningChecklist": [], "virtualActivities": []}'::jsonb,
  reflections_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  validator_name TEXT NOT NULL DEFAULT '',
  validator_email TEXT NOT NULL DEFAULT '',
  validator_role TEXT DEFAULT '',
  validator_non_family_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) & PERMISSIVE POLICIES FOR INITIAL TESTING
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expeditions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running script
DROP POLICY IF EXISTS "Allow public anon read/write on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public anon read/write on goals" ON public.goals;
DROP POLICY IF EXISTS "Allow public anon read/write on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow public anon read/write on expeditions" ON public.expeditions;

CREATE POLICY "Allow public anon read/write on profiles"
  ON public.profiles
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public anon read/write on goals"
  ON public.goals
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public anon read/write on activity_logs"
  ON public.activity_logs
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public anon read/write on expeditions"
  ON public.expeditions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Enable Realtime replication for cross-device live syncing (optional / safe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.expeditions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

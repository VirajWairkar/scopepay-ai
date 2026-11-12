-- ScopePay AI 2.1 — Supabase PostgreSQL schema
-- Run automatically by the backend's PostgreSQL adapter on first boot.
-- No anon/authenticated policies: only the trusted backend with DATABASE_URL can access these tables.
CREATE TABLE IF NOT EXISTS public.scopepay_projects (
  id text PRIMARY KEY,
  position integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.scopepay_analyses (
  id text PRIMARY KEY,
  position integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.scopepay_negotiations (
  id text PRIMARY KEY,
  position integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.scopepay_change_orders (
  id text PRIMARY KEY,
  position integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.scopepay_activities (
  id text PRIMARY KEY,
  position integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL
);
ALTER TABLE public.scopepay_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_activities ENABLE ROW LEVEL SECURITY;

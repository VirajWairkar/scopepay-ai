-- ScopePay AI 2.2 visitor-isolated schema.
-- The backend applies this migration automatically with its privileged DATABASE_URL.
-- No browser-facing Supabase keys or public RLS policies are used.

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

-- Additive migration: pre-existing rows remain owner_id NULL and stay in the private legacy workspace.
ALTER TABLE public.scopepay_projects ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE public.scopepay_analyses ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE public.scopepay_negotiations ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE public.scopepay_change_orders ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE public.scopepay_activities ADD COLUMN IF NOT EXISTS owner_id text;

CREATE INDEX IF NOT EXISTS scopepay_projects_owner_idx ON public.scopepay_projects(owner_id, position);
CREATE INDEX IF NOT EXISTS scopepay_analyses_owner_idx ON public.scopepay_analyses(owner_id, position);
CREATE INDEX IF NOT EXISTS scopepay_negotiations_owner_idx ON public.scopepay_negotiations(owner_id, position);
CREATE INDEX IF NOT EXISTS scopepay_change_orders_owner_idx ON public.scopepay_change_orders(owner_id, position);
CREATE INDEX IF NOT EXISTS scopepay_activities_owner_idx ON public.scopepay_activities(owner_id, position);

CREATE TABLE IF NOT EXISTS public.scopepay_visitors (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  initialized boolean NOT NULL DEFAULT false
);
ALTER TABLE public.scopepay_visitors ADD COLUMN IF NOT EXISTS initialized boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.scopepay_credentials (
  owner_id text PRIMARY KEY,
  gemini_key_enc text,
  paypal_client_id_enc text,
  paypal_client_secret_enc text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.scopepay_public_tokens (
  token_hash text PRIMARY KEY,
  owner_id text NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS scopepay_public_tokens_entity_idx ON public.scopepay_public_tokens(entity_type, entity_id);
CREATE TABLE IF NOT EXISTS public.scopepay_sessions (
  sid varchar PRIMARY KEY,
  sess json NOT NULL,
  expire timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS scopepay_sessions_expire_idx ON public.scopepay_sessions(expire);

ALTER TABLE public.scopepay_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_public_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scopepay_sessions ENABLE ROW LEVEL SECURITY;

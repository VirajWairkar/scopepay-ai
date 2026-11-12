# Supabase + Render Setup (ScopePay AI 2.2)

## Supabase

- [ ] Create a Supabase project and strong database password.
- [ ] Open **Connect** and choose **Session pooler**, port 5432.
- [ ] Copy the PostgreSQL URI and percent-encode special characters in the password.
- [ ] Store the URI as the Render secret `DATABASE_URL`.
- [ ] Do not use the direct IPv6 host if Render reports `ENETUNREACH`.
- [ ] The application applies the additive schema migration automatically.

## Render environment variables

- [ ] `NODE_ENV=production`
- [ ] `HOST=0.0.0.0`
- [ ] `DATABASE_URL` — Supabase Session Pooler URI (secret)
- [ ] `SESSION_SECRET` — random persistent value, 32+ characters (secret)
- [ ] `CREDENTIALS_ENCRYPTION_KEY` — 32 random bytes encoded as base64 (secret)
- [ ] `GEMINI_MODEL=gemini-2.5-flash`
- [ ] `PAYPAL_ENV=sandbox`

Do not add a shared Gemini API key or PayPal merchant secret for public visitor functionality. Each visitor connects their own integrations on the website. `ADMIN_USERNAME` and `ADMIN_PASSWORD` are optional; configure both only if the site owner needs the legacy-record access panel. They are not required for normal visitor access.

## Deploy

- [ ] Build command: `npm install --omit=dev`
- [ ] Start command: `npm start`
- [ ] Health check: `/api/health`
- [ ] Confirm the site opens without a login prompt.
- [ ] Open a second browser/incognito session and confirm it receives a separate workspace.
- [ ] Verify that projects created in one browser are not visible in the other.
- [ ] Connect a Gemini API key and validate live analysis.
- [ ] Connect a PayPal Sandbox Business app and test checkout with a separate Sandbox Personal buyer.

Keep `SESSION_SECRET` and `CREDENTIALS_ENCRYPTION_KEY` unchanged between deploys. Do not commit `.env` or database data.

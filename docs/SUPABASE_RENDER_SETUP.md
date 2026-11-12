# ScopePay AI — Supabase + Render deployment checklist

Follow the full [README](../README.md) for explanations and security guidance. This short checklist is designed to use alongside your browser.

## 1. Supabase

- [ ] Create Supabase project at https://supabase.com/dashboard/projects
- [ ] From project dashboard choose **Connect → Session pooler** (`:5432`). Copy the displayed PostgreSQL connection URI.
- [ ] Replace password placeholder with your actual database password and percent-encode special characters.
- [ ] Include `sslmode=require` (without duplicating query parameters).
- [ ] **Do not share the connection string**. Save it only in `.env` or Render's secret env variables.
- [ ] Locally run `npm install` and `npm start` with `DATABASE_URL` configured.
- [ ] Confirm `http://localhost:3000/api/health` returns `{ "ok": true }`; confirm PostgreSQL in the unlocked Integrations view.
- [ ] Find five `scopepay_*` tables in Supabase Table Editor. The backend creates them on first boot; no manual SQL execution is needed.

## 2. GitHub

- [ ] Upload only source files, README, license, `.env.example`, `render.yaml`, scripts, and tests.
- [ ] Confirm neither `.env` nor `server/data/store.json` appears in GitHub or Git history.
- [ ] If any secret was committed, rotate it and remove it from history.

## 3. Render

- [ ] Render → New Web Service → connect GitHub repository.
- [ ] Build: `npm install --omit=dev` / Start: `npm start`.
- [ ] Add `DATABASE_URL`, `GEMINI_API_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` as **secret env vars**.
- [ ] Add `GEMINI_MODEL=gemini-2.5-flash`, `PAYPAL_ENV=sandbox`, `HOST=0.0.0.0`.
- [ ] Add `ADMIN_USERNAME=demo` and a strong **secret** `ADMIN_PASSWORD`.
- [ ] Don't manually override Render's `PORT`.
- [ ] Check `https://<service>.onrender.com/api/health` returns HTTP 200 and `{ "ok": true }`.
- [ ] Check the original homepage opens without any login challenge; unlock private operations in Integrations. Client links require their own token.

## 4. Test full workflow

- [ ] Run Gemini AI analysis on a new client request (not sample preview).
- [ ] Publish AI-generated negotiation alternatives.
- [ ] Accept a paid option from the client invite link.
- [ ] Use a **Sandbox Personal buyer** and complete a small PayPal Sandbox payment.
- [ ] Confirm `Paid` and a capture ID.
- [ ] Restart/redeploy and ensure the paid record remains in Supabase.
- [ ] Record your demo under three minutes.

**Current verification note:** Automated tests cover adapters and mocked integrations. A real Supabase connection and live PayPal/Gemini end-to-end hosted test require your own accounts; they are not performed by the package generator.

# ScopePay AI 2.1 — AI Negotiation + PayPal Sandbox

**A working, open-source freelancer scope-negotiation and sandbox-payment prototype.**

ScopePay AI helps freelancers compare a client's new request against a written project agreement. **Google Gemini** explains potential scope changes and suggests evidence-backed estimates and three approaches: a full build, a lean alternative, or a written scope exchange. The freelancer reviews the terms, the client chooses or counteroffers, and accepted paid changes can be completed through **PayPal Sandbox**. The application marks payments **Paid only after server-side capture verification**.

This version supports **Supabase PostgreSQL + Render Web Service** *and* the original local JSON storage mode. All payments are simulated PayPal Sandbox transactions; the application is a hackathon demo, not a production invoicing or escrow system.

## 1. Run locally (easiest way to explore)

**Prerequisites:** Node.js **20.11+**, npm, and a browser.

```bash
# From the root of this repository:
npm install
npm start
```

Open **http://localhost:3000**. Without workspace credentials, the original homepage shows only the three fictional seed projects and navigation. Private records and state-changing actions remain locked. In the existing **Integrations** page, enter `ADMIN_USERNAME` and `ADMIN_PASSWORD` to unlock the full original workspace, including sample analysis, live Gemini, and Sandbox payments. There is no separate login page or browser authentication prompt.

To use real AI + sandbox checkout, copy `.env.example` to `.env`:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

Set your credentials in `.env`:

```dotenv
GEMINI_API_KEY=your_own_gemini_key
GEMINI_MODEL=gemini-2.5-flash
PAYPAL_CLIENT_ID=your_own_sandbox_business_app_client_id
PAYPAL_CLIENT_SECRET=your_own_sandbox_business_app_secret
PAYPAL_ENV=sandbox
HOST=127.0.0.1
PORT=3000
# Leave DATABASE_URL blank to use local JSON storage.
DATABASE_URL=
```

- Get a Gemini API key at [Google AI Studio](https://aistudio.google.com/apikey).
- Get your PayPal **Sandbox** Client ID and Secret at [PayPal Developer](https://developer.paypal.com/dashboard/applications/sandbox). The app must be associated with a **Sandbox Business** account.
- Checkout uses a separate **Sandbox Personal** account as buyer. You can create one at [Sandbox Accounts](https://developer.paypal.com/dashboard/accounts). US Business + US Personal + USD is a simple testing combination. **Do not use real payment credentials.**
- Restart `npm start` after updating `.env`. Never put an API secret in GitHub, client JavaScript, or the demo video.

## 2. Complete end-to-end test

1. Open **Integrations** and unlock the workspace, then open **AI Scope Analyzer**, select one of the three demo projects or create your own in **My Projects**.
2. Type a new client request and choose **Analyze with Gemini**. A live analysis requires your key. The sample button is clearly marked as a non-live walkthrough.
3. Examine agreement evidence, itemized hours and Gemini's suggested alternatives.
4. Open **Negotiation Studio**. Review/change the options and amounts, then **Publish client options**.
5. Open the generated `/negotiate/<token>` link in another tab (this is the client's view). Accept an option or send a counteroffer.
6. If countered, return to the freelancer workspace and explicitly accept or decline it.
7. For an accepted **paid** option, open the token-bearing checkout page, sign in as a **Sandbox Personal buyer**, and approve payment in PayPal.
8. Verify the dashboard/change order becomes **Paid** with a PayPal capture ID. A $0 scope exchange requires agreement but does not trigger PayPal payment.

For your hackathon video, use a small Sandbox charge such as $10. The server checks the expected exact USD amount and PayPal capture status. A visible PayPal button alone is not proof of payment.

## 3. Supabase PostgreSQL setup (persistent storage)

The cloud version stores data in **five PostgreSQL tables** (project, analysis, negotiation, change-order, activity). Each row is a JSONB record so existing records/UI stay compatible. Mutations are persisted in PostgreSQL transactions; the app does not fall back silently if `DATABASE_URL` is invalid.

1. Create a new project at [Supabase](https://supabase.com/dashboard/projects). Set a **strong database password** and keep it private.
2. In the project dashboard, click **Connect**. Choose **Session pooler** (the shared pooler; port **5432**), especially for Render's IPv4 network. Do **not** confuse it with the Direct (IPv6-only on free projects) or Transaction pooler (port 6543) connection.
3. Copy the entire PostgreSQL URI shown by Supabase. Replace its `[YOUR-PASSWORD]` placeholder with your DB password. **Percent-encode special characters**, e.g. `%40` for `@` or `%23` for `#`. Add `?sslmode=require` if the URI does not already have SSL enabled.
4. Put the string in `.env` as `DATABASE_URL=postgresql://...` to test from your own computer, or in Render's secret environment settings (see next section). **Never add it to the frontend.**
5. Run `npm install` and `npm start`. At the first successful PostgreSQL startup, the backend automatically creates the tables using `server/sql/001_init.sql`, enables Row Level Security with no public policies, and seeds the three example projects. Later starts read the saved PostgreSQL data.
6. Visit `/api/health`. You should see `"ok":true` (confirm PostgreSQL in the unlocked Integrations view). Create a project, restart the server, and confirm it still exists.

**Important:** You do **not** need to paste SQL manually into the Supabase dashboard. The backend creates the schema using your privileged server-side database connection. Keep your Supabase Postgres connection URI secret; never use the browser with these database credentials.

## 4. Deploy on Render (hosted demo)

**Before deploying:** push the source files (but not `.env`, `store.json`, passwords, or tokens) to a **public GitHub repository** with the root `LICENSE` file.

1. Open [Render Dashboard](https://dashboard.render.com/) → **New** → **Web Service** and connect your GitHub repository. Alternatively use the included `render.yaml` Blueprint.
2. Choose the service root directory containing `package.json` (usually the repository root), runtime **Node**, and your preferred plan.
3. Configure **Build Command**: `npm install --omit=dev`.
4. Configure **Start Command**: `npm start`.
5. Add these environment variables in **Render → Environment**:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | **Secret**: Supabase Session pooler PostgreSQL URI with SSL required |
| `GEMINI_API_KEY` | **Secret**: your Gemini key |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `PAYPAL_CLIENT_ID` | **Secret**: your PayPal Sandbox Business app Client ID |
| `PAYPAL_CLIENT_SECRET` | **Secret**: matching Sandbox Client Secret |
| `PAYPAL_ENV` | `sandbox` |
| `HOST` | `0.0.0.0` |
| `ADMIN_USERNAME` | `demo` (or another name) |
| `ADMIN_PASSWORD` | **Secret**: strong password protecting the freelancer workspace |

Render sets the `PORT` environment variable itself; **do not hardcode a public port**. The app listens on `0.0.0.0:$PORT` on Render. The health check path is `/api/health`.

6. Deploy. Open `https://your-name.onrender.com/api/health` and verify `"ok":true` and `"ok":true` (confirm PostgreSQL in the unlocked Integrations view).
7. Open the original homepage without a login prompt. To access private records or live actions, unlock the workspace inside the existing **Integrations** page with `ADMIN_USERNAME`/`ADMIN_PASSWORD`. Client invitation and checkout links use their own scoped capabilities.
8. Test **Gemini analysis → publish negotiation → client accepts → sandbox PayPal checkout → Paid** on Render. Restart/redeploy and confirm data remains present in Supabase.

**Security and limitations:** The public homepage uses only fictional seed records. Private database records, Gemini calls, project mutations, negotiation publication, and payment operations require workspace authorization; client-specific links have narrowly scoped capabilities. Workspace access uses HttpOnly, SameSite=Lax sessions, Secure cookies in production, CSRF checks, expiry, logout (Lock workspace), and login rate limiting. No browser Basic Auth challenge is sent. `SESSION_SECRET` is optional (32+ random characters if supplied); otherwise a fresh random process-local secret is generated. Sessions reset after restart. Keep administrator credentials and client links confidential. Use exactly one Node process / Render instance; distributed coordination, MFA, and webhook reconciliation are not implemented.

**Existing checkout links:** Negotiation token values are retained. Additive token/expiry metadata protects checkout access without deleting records. Old bare `/pay/<id>` links must be reshared using the token-bearing link from the original Change Orders page, or reached through a valid negotiation link. Existing additive fields in Supabase are retained; this interface restoration does not remove database records or tables.

## 5. Optional: import YOUR earlier local JSON records

The repository deliberately **does not contain your real `server/data/store.json`** because it might include client details, analyses and sandbox transaction history. You can preserve it locally:

1. Stop both server versions and back up the original `store.json`.
2. Copy your old `store.json` into this project's `server/data/` directory (it is ignored by Git).
3. Set `DATABASE_URL` to a **fresh Supabase workspace** with no custom records. If your Render app has already created custom records, don't run this import without a plan to merge them.
4. Preview the record counts:

   ```bash
   npm run import:json -- --file server/data/store.json
   ```

5. If correct, perform the explicit one-time import:

   ```bash
   npm run import:json -- --file server/data/store.json --apply
   ```

6. Restart `npm start`. The import refuses to overwrite a nonempty PostgreSQL workspace. **Never publish the old file**, even if its contents appear to be only sandbox activity.

If no import is needed, skip this section; your hosted app will start with the three example projects and empty payment history.

## 6. Run automated tests

```bash
npm test
```

The suite covers Gemini normalization, PayPal request/capture validation (with mocked APIs), local JSON storage, PostgreSQL adapter persistence and rollback (with a mocked PostgreSQL connection), admin workspace access, public client negotiation and UI smoke tests.

**Verification scope:** This repository's automated tests do not require API keys and **do not perform a live Gemini request, real Supabase connection, or actual PayPal Sandbox purchase**. You must run those integration checks with your own credentials. No unverified payments are marked Paid.

## 7. Troubleshooting

| Problem | Action |
| --- | --- |
| `Gemini 503 / high demand` | Wait and retry; check model and free-tier limits in AI Studio. No successful analysis should be invented. |
| `PayPal OAuth 401` | Re-check the same **Sandbox Business app** Client ID/Secret, not a buyer password. |
| PayPal `UNSUPPORTED_PAYEE_CURRENCY` | Test with a US Business Sandbox seller and a US Personal Sandbox buyer for USD. |
| PayPal remembers another buyer | Log out of sandbox.paypal.com, or use a fresh Incognito session. |
| Render no open ports | Set `HOST=0.0.0.0`; don't override the Render-provided `PORT`. |
| `getaddrinfo ENETUNREACH` or PostgreSQL connection failure | On Render use Supabase **Session pooler** (port 5432) rather than a direct IPv6 connection. Check the password and SSL URI. |
| `Cannot find package 'pg'` | Run `npm install` before starting. |
| Live action returns HTTP 401 | Unlock private workspace access in Integrations. The homepage itself needs no login. |
| Old transactions absent on new database | See optional JSON migration above. Old JSON is never uploaded automatically. |
| Data disappears on restart | Check `/api/health` shows `postgresql`; without `DATABASE_URL` the app uses local JSON, which is ephemeral on Render. |

## 8. Project structure

```text
scopepay-ai/
├─ client/                 # Freelancer dashboard, client negotiation, PayPal checkout
├─ server/
│  ├─ index.mjs             # API routes + workspace authorization
│  ├─ lib/analysis.mjs      # Gemini AI integration and normalization
│  ├─ lib/negotiation.mjs   # Negotiation options and validation
│  ├─ lib/paypal.mjs        # Sandbox Orders v2 + capture verification
│  ├─ lib/store.mjs         # Local JSON storage fallback and seed data
│  ├─ lib/postgres-store.mjs# Supabase PostgreSQL adapter
│  └─ sql/001_init.sql      # Five PostgreSQL tables + RLS enabled
├─ scripts/import-json.mjs # Optional explicit, protected local migration
├─ tests/                  # Automated test suite
├─ docs/                   # Architecture, demo, and submission materials
├─ .env.example            # Safe placeholders; fill in .env locally
├─ render.yaml             # Render Blueprint option
├─ package.json
├─ Dockerfile
└─ LICENSE                 # MIT
```

## 9. Hackathon submission checklist

- Include public repository URL, source code, `.env.example`, and complete local run instructions.
- Keep the root `LICENSE` file visible on GitHub.
- Provide a **YouTube video under three minutes** showing real Gemini analysis and a real PayPal **Sandbox** checkout and captured payment.
- Describe how Gemini and PayPal are meaningfully integrated, identify the audience and provide honest limitations.
- A hosted URL is optional under the original rules, but can improve judge accessibility if configured safely and tested.

**License:** MIT; see [LICENSE](LICENSE).

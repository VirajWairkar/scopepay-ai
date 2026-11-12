# ScopePay AI — AI Scope Negotiation & PayPal Sandbox

ScopePay AI helps freelancers compare a new client request with an original project agreement. Gemini can explain potential scope changes, estimate additional effort, and suggest negotiation options. The freelancer reviews and publishes the options; the client can accept or counteroffer. An approved paid change can proceed through PayPal Sandbox checkout.

**This version uses public anonymous visitor workspaces.** No ScopePay username or password is required. Each visitor gets a private workspace tied to a secure browser session and connects their own Gemini API key and PayPal Sandbox merchant app. All visitors can use the same Supabase PostgreSQL database, but application records are scoped to the visitor who owns them.

This is a hackathon prototype, not a production invoicing, escrow, or legally binding e-signature platform. PayPal payments are Sandbox-only and do not move real money.

## 1. Run locally

Requirements: Node.js 20.11+ and npm.

```bash
npm install
npm start
```

Open `http://localhost:3000`. A visitor session is created automatically. The first visit receives three fictional sample projects:

- Atelier — Brand Website
- Northstar — Mobile App
- Solace — Content Refresh

You can explore sample data and create projects without connecting an integration. A live Gemini analysis requires your own API key. PayPal checkout requires your own Sandbox merchant credentials.

### Local environment setup

Copy `.env.example` to `.env`:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

Generate two persistent secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Put the first value in `SESSION_SECRET` and the second in `CREDENTIALS_ENCRYPTION_KEY`. Keep both private and stable. Changing the encryption key makes previously saved API credentials unreadable.

For local JSON mode, leave `DATABASE_URL` blank. The app uses `server/data/store.json` for the private legacy workspace and `server/data/store.json.tenants.json` for visitor workspaces. These files are ignored by Git.

## 2. Connect your own integrations

Open **Integrations** in the website.

### Gemini AI

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Paste it into the Gemini API key field.
3. Select **Connect Gemini**.
4. Once validated, live analysis is available in AI Scope Analyzer.

The key is sent to the backend over HTTPS and encrypted before storage. It is not saved in browser storage and is never returned to the browser. Each visitor has a separate credential record.

### PayPal Sandbox

1. Open [PayPal Developer](https://developer.paypal.com/dashboard/applications/sandbox).
2. Create or select a Sandbox REST app associated with a Sandbox Business merchant account.
3. Copy that app's Sandbox Client ID and Client Secret.
4. Enter both values in **Integrations** and select **Connect PayPal Sandbox**.
5. Use a separate Sandbox Personal account as the buyer when testing checkout. You can manage test accounts in [PayPal Sandbox Accounts](https://developer.paypal.com/dashboard/accounts).

ScopePay validates the credentials against PayPal Sandbox OAuth. Client Secret values are encrypted server-side and are never returned to the browser. The public PayPal Client ID is provided only where the PayPal JavaScript SDK needs it. Live PayPal credentials are not supported.

## 3. Visitor privacy and session behavior

- Every visitor receives a cryptographically random anonymous workspace ID stored in a signed, HttpOnly session cookie.
- Projects, analyses, negotiations, change orders, activity records, and integration credentials are scoped to that workspace on the server.
- The server never trusts a visitor ID supplied in a request body.
- Changing record IDs does not grant access to another visitor's data.
- Existing rows from the previous shared workspace remain `owner_id IS NULL` in PostgreSQL and are not shown to public visitors.
- If the owner needs to access those legacy records, configure optional `ADMIN_USERNAME` and `ADMIN_PASSWORD` on the server. An **Optional owner access** panel then appears in Integrations. It is separate from anonymous visitor access; normal visitors never need it.
- Client negotiation and payment links use separate high-entropy, expiring capability tokens. Only the specific negotiation or payment order is exposed through that link.
- Clearing browser cookies or using another device creates a new anonymous workspace. There is no account recovery or cross-device sync for anonymous visitors.
- Local JSON session storage is process-local for development. Render uses the PostgreSQL session table so sessions survive service restarts.

For production-grade account recovery, use registered user accounts with email verification, MFA, and explicit account recovery rather than relying on anonymous sessions.

## 4. Supabase PostgreSQL setup

1. Create a project at [Supabase](https://supabase.com/dashboard/projects).
2. Open **Connect** and select **Session pooler** (port 5432). This is recommended for Render's IPv4 environment. Avoid the direct connection if Render reports IPv6 `ENETUNREACH`.
3. Copy the PostgreSQL URI and replace `[YOUR-PASSWORD]` with your database password. Percent-encode special characters in the password (for example, `@` as `%40`).
4. Set the full URI as `DATABASE_URL` locally or in Render.
5. Start the application. The backend applies the additive schema migration automatically.

The migration adds `owner_id` columns to the existing data tables. Existing records are preserved with a NULL owner and remain in the private legacy workspace. New visitor records are written with a server-generated owner ID. Additional tables store anonymous sessions, encrypted integration credentials, visitor IDs, and hashed client-link tokens.

The backend connects using the privileged server-side PostgreSQL URI. Do not put the database URI or Supabase service credentials in frontend code. RLS is enabled and no public policies are created.

## 5. Deploy on Render

The included `render.yaml` configures a Node web service. Connect the GitHub repository to Render or deploy the Blueprint.

Set these environment variables in Render:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | Secret: Supabase Session Pooler PostgreSQL URI |
| `SESSION_SECRET` | Secret: random value with at least 32 characters; keep stable |
| `CREDENTIALS_ENCRYPTION_KEY` | Secret: 32 random bytes encoded as base64; keep stable |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `PAYPAL_ENV` | `sandbox` |

Do **not** configure a shared `GEMINI_API_KEY`, `PAYPAL_CLIENT_ID`, or `PAYPAL_CLIENT_SECRET` for public visitors. Visitors connect their own keys through Integrations. `ADMIN_USERNAME` and `ADMIN_PASSWORD` are optional; configure both only if the owner needs the legacy-record access panel. They are not required for normal public access.

Build command: `npm install --omit=dev`  
Start command: `npm start`  
Health check: `/api/health`

The server refuses to start in Render if the persistent database URL, session secret, or credential-encryption key is missing. Render supplies `PORT`; the app binds to `0.0.0.0`.

## 6. End-to-end demo flow

1. Open the public site without entering credentials.
2. Explore one of the three fictional sample projects or create your own project.
3. Connect your Gemini key in Integrations.
4. Analyze a client request and review evidence, estimated hours, and options.
5. Publish client options and open the generated `/negotiate/<token>` link in another tab.
6. Accept an option or submit a counteroffer.
7. Return to the freelancer workspace to resolve a counteroffer if needed.
8. Connect a PayPal Sandbox Business merchant app in Integrations.
9. Open the generated payment link and pay with a separate Sandbox Personal buyer account.
10. Verify that the change order becomes **Paid** only after server-side PayPal capture verification.

A sample analysis is clearly labeled as sample data and is not presented as a live Gemini response.

## 7. Tests and troubleshooting

```bash
npm test
```

Useful checks:

- `GET /api/health` confirms the Node service is running.
- `GET /api/config` returns only the current visitor's integration connection status.
- A new incognito browser should receive a separate set of sample projects and a separate workspace.
- A project ID copied from another browser should return 404 when used from the current browser.
- A Gemini key must be connected before live analysis.
- A PayPal Sandbox merchant app must be connected before creating or capturing an order.
- A client payment link must include its token and must not be shared publicly.

If saved credentials cannot be decrypted, confirm that `CREDENTIALS_ENCRYPTION_KEY` is unchanged. If visitors lose sessions after deployment, confirm that `SESSION_SECRET` remains stable and that `DATABASE_URL` uses the Supabase Session Pooler. If Render reports `ENETUNREACH` for an IPv6 Supabase address, switch to the Session Pooler URI.

## 8. Security limitations

This version implements anonymous visitor isolation and encrypted server-side storage for BYOK credentials, but it is still a hackathon prototype. It does not provide registered accounts, MFA, account recovery, formal tenant-management controls, or a full security audit. Anonymous workspaces are recoverable only while the browser session remains available. Rate limits and usage limits should be strengthened before a public production launch.

Never commit `.env`, database dumps, local tenant JSON files, API keys, PayPal secrets, or session/encryption secrets. If a credential was included in a ZIP or committed to Git, rotate it before using the integration again.

## License

MIT. See [LICENSE](LICENSE).

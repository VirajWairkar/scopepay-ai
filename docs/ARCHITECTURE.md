# ScopePay AI — Technical architecture and threat model

## Components

```text
Freelancer browser  ───────> Node.js HTTP API on Render <─────── Client invitation / PayPal checkout
                            │             │             │
                            │             │             └── PayPal Sandbox Orders v2
                            │             │                   OAuth2 create + verified capture
                            │             └── Google Gemini AI (server-side key)
                            └── Supabase PostgreSQL via pg / SSL
                                 ├── scopepay_projects
                                 ├── scopepay_analyses
                                 ├── scopepay_negotiations
                                 ├── scopepay_change_orders
                                 └── scopepay_activities
```

The same application can run without `DATABASE_URL`, in which case the original **single-machine JSON file store** is used. PostgreSQL mode creates five JSONB-backed tables and commits state mutations in database transactions; this is an intentionally simple compatibility layer for the existing API, not a complete relational domain model.

## Business invariants

- Gemini examines an agreement/request and suggests alternative scopes. Output is untrusted advice and cannot initiate a payment itself.
- Model-proposed agreement excerpts are kept only if they occur verbatim in the stored agreement. Estimates are itemized; suggested prices are calculated using the stored hourly rate.
- The freelancer approves which alternatives to publish, and controls final prices.
- The client explicitly accepts an offer or makes a counteroffer, which the freelancer separately approves.
- An accepted **paid** option creates a change order. A negotiated $0 trade does not create a charge.
- The server creates a PayPal Sandbox order using the **stored approved amount**, not a browser-provided total.
- The server marks a change order **Paid** only when the PayPal capture API confirms the matching original PayPal order, `COMPLETED` statuses, currency `USD`, and exact amount.

## Data durability

- With `DATABASE_URL`, app initialization creates the five PostgreSQL tables (with Row Level Security enabled and no browser-facing policies), reads saved records and seeds three fictional sample projects on an empty database.
- Mutations use a queued, single-process in-memory draft and a PostgreSQL transaction, then commit the new live state. If persistence fails, the live draft is not adopted.
- A local JSON fallback remains available and is deliberately never synchronized to Supabase automatically. `scripts/import-json.mjs` offers an explicit one-time import.
- Multiple Render replicas or another writer modifying the same tables concurrently can race against the in-memory coordinator. Use **one instance only** for this hackathon demo.

## Security boundaries

- `DATABASE_URL`, `PAYPAL_CLIENT_SECRET`, and `GEMINI_API_KEY` are server-side secrets in Render env vars / local `.env`. The PayPal Client ID is intentionally public, as expected by its browser SDK.
- The homepage is public and exposes only fictional seed records. Unlock private records and live actions in the existing Integrations page using `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Sessions, CSRF checks, and rate limiting protect these operations; no HTTP Basic challenge or separate login page exists.
- Public `/negotiate/<token>` invitation links use unguessable bearer tokens, but possession of the link grants the ability to respond. Public payment links require a scoped random checkout token as well as their change-order ID. Tokens expire and can be revoked.
- No production customer logins, per-user roles, webhook verification, distributed rate limiting, reconciliation, backups or automated database-migration versioning are implemented.
- Do not host real client agreements or expose public API credentials through Devpost or GitHub. Protect the hosted demo password and rotate after judging.
- Sandbox payments move no real money. This application is not an escrow or real-money payment system.

## Deployment requirements

Use the **Supabase Session pooler PostgreSQL URI (port 5432)** for an IPv4-compatible Render backend; require TLS via `sslmode=require`. Set `HOST=0.0.0.0`, use Render's `PORT`, set all required server-only environment secrets, then verify `/api/health` returns `{ "ok": true }`. Full instructions are in `README.md` and `docs/SUPABASE_RENDER_SETUP.md`.

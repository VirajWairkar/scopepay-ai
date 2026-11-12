# ScopePay AI restoration report

Restoration baseline: commit `5959fce` (Add ScopePay AI application), the working version before the Public Demo Mode and Secure Admin Login request. Files were restored selectively from Git history; no reset, commit, push, or deployment was performed. `.env` was not edited.

## Restored interface

The original homepage, dashboard layout, navigation, analyzer, Negotiation Studio, projects, change orders, activity log, integrations, client proposal page, and checkout page remain in place. The added landing page, Public Demo walkthrough, separate administrator route/page, login page, and their assets/tests were removed.

The original HTML pages, stylesheet, logo, client negotiation script, Gemini implementation, negotiation logic, storage adapters, and Render configuration were compared byte-for-byte with the baseline and match. `client/app.js` retains the original interface with only the access control integration below. Checkout JavaScript retains scoped client-token transmission. Public product headings use ScopePay AI without version numbers; package versioning remains internal.

## Necessary security differences

Restoring unrestricted anonymous access to the original private APIs would expose Supabase projects, spend Gemini quota, and permit payment operations. Therefore:

- The original homepage opens immediately without login or an HTTP Basic challenge.
- Anonymous `/api/state` reads return only the original three fictional seed projects and no real analyses, negotiations, payment records, or private activity.
- Private records and real actions require unlocking **Private workspace access** inside the existing **Integrations** page. This is a small inline control, not a separate login page, dashboard, modal, or browser authentication popup. It uses existing `ADMIN_USERNAME` and `ADMIN_PASSWORD` variables.
- The same original workspace becomes fully functional after unlock. **Lock workspace** ends authorization and reloads public seed data.
- Session cookies are HttpOnly, SameSite=Lax, Secure in production, and expire. Login is rate limited; authenticated mutations require CSRF tokens. The necessary express-session dependency remains.
- `SESSION_SECRET` is optional. If omitted, a strong random process-local secret is generated. No new Render variable is required. Sessions reset when the process restarts; keep one instance as the existing storage adapter requires.
- Client invitations and checkout retain scoped, expiring capabilities and verified PayPal amount/currency checks. Concurrent duplicate payment requests remain blocked. Existing bare checkout URLs must be reshared with their token; negotiation URLs preserve their existing token values.

No tables or production records were removed or reverted. Existing additive token/expiry metadata from the preceding task remains intact. This restoration did not connect to Supabase or run live Gemini/PayPal requests.

## Verification

`npm test`: 24 passed, 0 failed. Includes original workflows, Gemini/PayPal mocks, PostgreSQL persistence/rollback, original UI navigation, inline unlock/lock, public isolation, credential validation, CSRF, expiry, rate limiting, scoped client links, and duplicate capture prevention.

`npm start`: succeeded with `SCOPEPAY_SKIP_ENV=1`, separate disposable JSON data, and no integration credentials. Local HTTP checks confirmed the original homepage returns 200 without WWW-Authenticate and anonymous state contains only fictional seed data. The local verification server was stopped afterwards.

`git diff --check`: passed. Browser visual verification was unavailable; hosted Render behavior and a genuine Sandbox checkout remain unverified. No deployment was performed, so the hosted website remains unchanged until an approved redeployment.

## Review and redeploy later

Review the changes, then approve any commit/push/deployment separately. Existing Render commands and environment configuration remain valid. After an approved deployment, check `/`, unlock in Integrations, test Gemini and a genuine Sandbox buyer checkout with your own accounts, and confirm Supabase persistence. Public visitors cannot use live actions without workspace credentials or the relevant scoped client link.

# Upgrade your existing ScopePay AI project

This package changes the earlier password-unlocked shared workspace into public anonymous visitor workspaces with Bring Your Own Keys (BYOK). The ZIP intentionally excludes `.env`, `.git`, `node_modules`, local database files, and private transaction data.

## Safe upgrade on Windows / VS Code

1. Stop the old server with `Ctrl+C`.
2. Keep a full backup of your existing project folder. Do not overwrite it.
3. Extract this ZIP into a new folder, for example `scopepay-ai-public`.
4. Copy only the required database connection string into the new `.env` as `DATABASE_URL`. For Render, use the Supabase **Session Pooler** URI (port 5432), not the IPv6 Direct URI if your host reports `ENETUNREACH`.
5. Generate a new `SESSION_SECRET` and `CREDENTIALS_ENCRYPTION_KEY` using the commands in `.env.example`. Keep both values stable and private.
6. Do not copy the old shared `GEMINI_API_KEY`, `PAYPAL_CLIENT_ID`, or `PAYPAL_CLIENT_SECRET` variables into the new configuration. Each visitor now connects their own credentials in Integrations.
7. If you want local legacy records preserved, copy your own `server/data/store.json` into the new folder's `server/data/store.json`. Those records remain private to optional owner access; they are not copied into public visitor workspaces.
8. If you need to access legacy records, configure optional `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`. Normal visitors do not need either value.
9. Open the new folder in VS Code, run `npm install`, `npm test`, then `npm start`.
10. Open `http://127.0.0.1:3000`. The site should load without a ScopePay login.

## Supabase migration

When the new application connects to your existing Supabase database, it applies additive migrations. Existing rows are preserved with `owner_id IS NULL`; they are not shown to public visitors. New anonymous visitor workspaces get server-generated owner IDs. Configure optional owner access if you need to inspect the previous private workspace.

Back up your database before the first deployment of the new version. Do not delete the existing tables or reset the Supabase project.

## Test the new behavior

1. Open the public site in normal Chrome and create a project.
2. Open the site in Incognito and create a different project.
3. Confirm the Incognito visitor cannot see the first visitor's project.
4. Connect your own Gemini key in Integrations and run a live analysis.
5. Connect your PayPal Sandbox Business merchant app in Integrations.
6. Use a separate Sandbox Personal buyer account to test checkout.
7. Confirm payment is marked Paid only after PayPal capture verification.

## Important limitations

- Anonymous workspaces are tied to browser cookies. Clearing cookies or switching devices loses access to that anonymous workspace; there is no account recovery.
- Client invitation and checkout links are bearer capabilities. Anyone holding the link can use the specific link until it expires or is revoked.
- This is still a hackathon prototype, not a production multi-tenant SaaS. Complete an independent security review and add registered accounts, MFA, recovery, stronger abuse controls, and monitoring before handling real customer data.
- This updated ZIP excludes environment files and private data. If an old `.env` file or any credentials were ever shared publicly or committed, rotate the Supabase database password, Gemini key, and PayPal Sandbox secret.

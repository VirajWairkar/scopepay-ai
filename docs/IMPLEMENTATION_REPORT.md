# ScopePay AI 2.2 Implementation Notes

This release changes the application from a single password-unlocked shared workspace to public anonymous visitor workspaces.

- The public site opens without ScopePay username/password credentials.
- Each visitor receives a server-generated workspace ID in a signed HttpOnly session.
- PostgreSQL data access is filtered by owner ID.
- Existing ownerless rows remain private in the legacy workspace.
- Gemini and PayPal Sandbox credentials are supplied per visitor and encrypted server-side with AES-256-GCM.
- PayPal checkout links remain token-scoped and resolve to the merchant credentials for the workspace that created the order.
- PostgreSQL-backed sessions persist across Render restarts.

Run `npm test` for automated tests. Live Gemini and PayPal tests require real Sandbox/test credentials and are not implied by mocked tests.

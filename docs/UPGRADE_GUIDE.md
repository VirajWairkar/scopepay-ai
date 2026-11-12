> **Version 2.1:** For Supabase + Render setup, read `docs/SUPABASE_RENDER_SETUP.md` and `README.md`. This guide was written for the earlier 2.0 negotiation upgrade.

# Upgrading your existing ScopePay AI project to 2.0

You can preserve your verified PayPal Sandbox transactions and existing Gemini history. The provided ZIP **intentionally excludes your `.env` and `server/data/store.json`**.

## Safe upgrade on Windows (VS Code)

1. **Stop** the running app with `Ctrl+C`.
2. Make a backup copy of your old `scopepay-ai` folder on your own computer.
3. Extract the NEW ZIP into a **different folder** (`scopepay-ai-v2`), not over your old files.
4. Copy **your own local** `.env` file from the old folder to the new folder. Do **not** send it to other people or commit it to GitHub.
5. Optional: If you want your old projects, analysis and verified sandbox payments preserved, copy **your own local** `server/data/store.json` into `scopepay-ai-v2/server/data/store.json`. The v2 code reads v1 data, including existing Paid records; it adds the `negotiations` field as needed. This file is private; do not upload it to GitHub.
6. Open the new project directory in VS Code, run `npm test`, then `npm start`.
7. Open `http://127.0.0.1:3000` and run through the new **Negotiation Studio** flow.
8. If you copied historical analyses, analyses created by older Gemini versions won't have evidence excerpts or AI option descriptions. Run a **new** Gemini analysis for the best 2.0 experience.

## How to test the new feature

1. Select **AI Scope Analyzer** → Atelier project → **Example request**.
2. With Gemini configured, select **Analyze with Gemini**. With no key, select **See a labeled example analysis** (this does **not** demonstrate real AI).
3. Read the **Verified agreement evidence** and the **estimated effort breakdown**.
4. Click **Open AI Negotiation Studio**.
5. Review three options, edit the prices, and select **Publish client options**.
6. Copy the **client invitation link** and open it in a different tab. This simulates a client, but is not identity-verified.
7. Choose an option OR submit a **counteroffer**. If there is a counteroffer, return to the freelancer dashboard and accept or decline it.
8. For an accepted **paid** option, open the resulting Change Order and pay in **PayPal Sandbox** using a Sandbox Personal buyer account. For an accepted **$0 scope exchange**, no payment is required.
9. Confirm `Paid` and the PayPal capture ID **only after real sandbox capture**.

## Security and hackathon submission

- The app is a **local hackathon demo** with no authentication. Don't deploy it openly with actual client contracts or real private data.
- Client proposal links are **bearer capabilities**; anyone holding the URL can respond. The app records consent in the demo, but does not verify the client's identity or provide a legally valid signature.
- The included sample preview is clearly labeled static fixture data.
- The original ZIP you uploaded contained a `.env` with credentials and a private `store.json`. **Do not commit the original ZIP or these files to GitHub.** If credentials were exposed publicly, rotate them.
- `.gitignore` excludes `.env`, `.env.*` (except `.env.example`) and `server/data/*.json`, but always check `git status` and GitHub's file list before publishing.

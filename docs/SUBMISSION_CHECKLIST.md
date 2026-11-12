# PayPal AI Hackathon — submission checklist

Official deadline: **Thursday November 12, 2026, 12:00 PM PST** = **Friday November 13, 2026, 1:30 AM IST**. Confirm on the [official Devpost page](https://paypalaihackathon.devpost.com/).

## Code / functionality

- [x] Working Node.js local app, tested through API.
- [x] Responsive freelancer interface and client checkout page implemented.
- [x] Real Gemini API integration implemented; **requires your key and a live test**.
- [x] PayPal Sandbox create/capture and official buttons implemented; **requires your credentials and a live test**.
- [x] AI review, evidence, negotiation options, client acceptance/counteroffer, and change order records implemented.
- [x] 13 local automated tests (`npm test`) passing in build environment.
- [x] MIT license, `.gitignore`, README, `.env.example` included.
- [ ] Test the full Gemini → freelancer offers → client acceptance → PayPal Sandbox capture with your own credentials.
- [ ] Check dashboard, Negotiation Studio, client invitation, and payment page on your browser/device.

## Submission items you must complete

- [ ] Create GitHub repository named `scopepay-ai` and push this source code.
- [ ] Make repository **public**; verify GitHub detects MIT license.
- [ ] Make sure `.env` and `server/data/*.json` are NOT uploaded. The original uploaded ZIP included both: never push that ZIP to GitHub.
- [ ] Use fictitious project names and text for the demo.
- [ ] Add Devpost project name, short tagline, descriptive text (draft in `DEVPOST_SUBMISSION.md`).
- [ ] Record and upload an actual functional demo video to YouTube, public visibility, **under 3 minutes**.
- [ ] Verify demo link from a signed-out/incognito browser.
- [ ] Attach GitHub URL and optional hosted URL.
- [ ] Name the AI service and PayPal technology used.
- [ ] Submit before deadline and capture confirmation.

## GitHub publishing commands

From this folder, after creating an empty repository on GitHub:

```bash
git init
git add .
git commit -m "Build ScopePay AI hackathon prototype"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/scopepay-ai.git
git push -u origin main
```

Check GitHub Settings / repo homepage to confirm license detection. Do not commit your keys; `.gitignore` protects `.env` and local data files.

## Deployment (optional)

A public hosted URL is **not required** if your repository provides complete setup and run instructions. Hosting this current prototype publicly is **not recommended** because it lacks authentication and tenant authorization. For external judges, local setup plus demo video are the safer options. If you deploy anyway, keep to fake agreements and sandbox credentials, configure `HOST=0.0.0.0`, use TLS and persistent disk, and do not expose private client documents.

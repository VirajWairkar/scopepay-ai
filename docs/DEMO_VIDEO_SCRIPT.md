# 2:45 demonstration video — recording plan

**Aim for approximately 2 minutes 45 seconds, comfortably under 3:00.** The footage must show the working desktop app. Record in 16:9 with screen capture (OBS Studio or Windows Snipping Tool recording). Narration is optional but recommended. No copyrighted background music. Do not show secret keys or sandbox passwords.

**Before filming:** Configure `GEMINI_API_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`. Restart the server. Verify both integrations are green. Keep a PayPal **Personal Sandbox buyer** account ready to log in; use a different Business Sandbox merchant linked to the app. Make a short test transaction before recording. If real Gemini/PayPal can't be tested, don't fake a transaction or describe a sample analysis as live.

| Timestamp | On screen | Narration |
|---|---|---|
| 0:00–0:17 | Dashboard + original agreement | “Freelancers lose time to small extra requests that turn into unpaid work. ScopePay helps both sides negotiate fair changes.” |
| 0:17–0:35 | Atelier project → scope analyzer | “This project includes a five-page website but excludes bookings and deposit payments.” |
| 0:35–1:02 | Real **Analyze with Gemini** result | “Gemini finds the new feature, cites exact agreement wording, and breaks down the additional effort. Its estimates are advisory.” |
| 1:02–1:30 | **AI Negotiation Studio** | “Instead of presenting only a take-it-or-leave-it invoice, ScopePay offers a full build, lean alternative, or mutually agreed scope exchange. The freelancer reviews and sets prices.” |
| 1:30–1:53 | Open client invitation in second tab | “The client can accept a proposal or submit a counteroffer. If countered, the freelancer explicitly reviews it.” |
| 1:53–2:21 | Client accepts a paid option → PayPal Sandbox checkout | “After both agree, PayPal Checkout securely authorizes the Sandbox payment. The backend creates and captures the order.” |
| 2:21–2:35 | Paid status + capture ID | “Only PayPal-confirmed captures mark the payment Paid—ScopePay checks the USD amount on the server.” |
| 2:35–2:45 | Dashboard + final tagline | “ScopePay AI: more than scope detection—fair negotiation followed by verified payments.” |

## Recording checklist

- [ ] Show the actual live Gemini result instead of the labeled sample fixture.
- [ ] Show the *real PayPal Sandbox approval and captured result* in the PayPal UI. No production credentials or real money.
- [ ] Show the negotiated paid proposal before PayPal approval.
- [ ] Keep secret `.env` and API keys hidden throughout.
- [ ] Avoid spelling mistakes and unrelated desktop tabs.
- [ ] Edit to under 3 minutes.
- [ ] Upload to **public YouTube**, copy the URL into Devpost.
- [ ] Include repository URL in video description.

## Demo if one integration isn't configured

You can still demonstrate the local UI with the static preview, but the hackathon requires meaningful PayPal and AI integration. Explicitly disclose missing credentials or untested third-party services. Prioritize obtaining working Sandbox credentials and AI access before recording the final judged demo.

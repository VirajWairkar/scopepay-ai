# Devpost submission draft — ScopePay AI

> Update claims to match your own successfully recorded test. Never say you personally completed a live sandbox capture until you actually have.

## Project title

**ScopePay AI — Negotiate Scope. Agree Fairly. Get Paid.**

## One-liner

An AI-assisted negotiation studio that explains scope creep, offers fair project trade-offs, and lets clients approve and pay through PayPal Sandbox.

## Inspiration

Freelancers regularly encounter a familiar moment: a client says, "It's just one more small change." Individually, these requests sound harmless. But a new feature can mean hours of unpaid work, while asking for more money can feel awkward. We wanted a practical system that turns that uncomfortable conversation into a clear, transparent workflow.

## What it does

ScopePay starts with the project's agreed scope and its hourly rate. When a client requests a change, Gemini analyzes both pieces of text, identifies whether the request falls outside the agreement, explains why, and produces a list of newly requested deliverables. It also estimates additional hours, creates an itemized effort breakdown, provides verifiable excerpts from the original agreement, and drafts a professional reply.

The AI then recommends three negotiation choices: **full implementation**, a **lean first version**, or a **scope exchange** where both parties explicitly approve removing or replacing an agreed deliverable. The freelancer curates the proposals and sets their final prices. The client receives a private invitation link to choose an option or propose a counteroffer, which the freelancer can accept or decline. Only mutually accepted paid options create a PayPal change order; accepted $0 scope exchanges do not need payment. PayPal's official buttons handle buyer approval; the backend creates and captures the sandbox order through Orders v2. The app only marks the change order Paid when PayPal returns a completed capture for the expected USD amount.

The app also includes a freelancer dashboard, project library, evidence-backed scope review, client negotiation portal, activity history, client checkout view, and integration-readiness panel. A visibly labeled static preview demonstrates the UI if no Gemini key is configured.

## How we built it

- **Google Gemini REST API**: structured scope analysis, quote-backed evidence, itemized effort estimate, three negotiation alternatives, and a client response draft. The server verifies evidence is actually excerpted from the original agreement and computes prices independently.
- **PayPal Sandbox Orders v2 + JavaScript SDK**: server-side OAuth2, order creation, client authorization in PayPal Checkout, capture and server-side verification.
- **Node.js**: built-in HTTP server and local persistent JSON store, eliminating npm dependencies for quick judge setup.
- **HTML, CSS and JavaScript**: responsive freelancer negotiation studio, shareable client offer portal, and checkout page.
- **Node test runner**: 13 tests covering pricing math, quote checks, negotiation decisions, counteroffers, zero-fee trades, payment verification, persistence, and local API flows.

## Challenges we designed around

The biggest design question was where AI should stop and financial authority should begin. Language models are useful for reasoning about change requests, but they should not be allowed to charge clients. ScopePay therefore uses AI to recommend *hours*, applies the hourly rate saved by the freelancer, and requires explicit approval of the final amount before creating a payable order.

A second challenge is making the PayPal integration meaningful, not decorative. We designed the core outcome around payment: project agreement → AI analysis and negotiation options → freelancer publication → client acceptance or counteroffer → agreed change order → PayPal Sandbox checkout → verified payment status. The backend creates and captures the PayPal order, instead of trusting a client-side 'success' flag.

## What we're proud of

The flow is easy to understand for non-technical freelancers and is backed by actual payment API integration code. Sandbox money and real money are clearly separated, and sample AI output is not misrepresented as a live response. A full local setup does not require a database installation or npm package downloads.

## What's next

Add client/freelancer identity verification and authentication, database-backed tenant isolation, legally robust electronic signatures, webhook-based reconciliation, a more rigorous historical estimation model, and support for other currencies. Later, ScopePay could become a full independent-work contract assistant with versioned agreements and invoice exports.

## Suggested categories / award alignment

Most Impactful, Best Use of PayPal + AI, and potentially Best Use of Agentic Commerce — but don't claim autonomous payments: the human explicitly approves the amount and the buyer approves checkout.

## Links to fill before submission

- **Public GitHub:** `https://github.com/<your-username>/scopepay-ai`
- **YouTube demo:** `https://www.youtube.com/watch?v=<your-video-id>`
- **Hosted demo:** Optional. The repository run instructions are sufficient under the published hackathon rules.
- **Code license:** MIT.
- **Tools used:** Google Gemini API, PayPal Sandbox Orders v2, PayPal JS SDK, Node.js, HTML, CSS, JavaScript.

## Accuracy checklist

The developer has separately exercised Gemini and PayPal Sandbox with this project; **this packaged build was only automatically tested using local APIs and mocks**. Recheck live third-party calls with your own keys before claiming the final demo is fully verified. The sample-mode preview is static; it is not a trained model inference. This repository provides a working local prototype plus real integration code ready for credentials.

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

The app also includes a freelancer dashboard, project library, evidence-backed scope review, client negotiation portal, activity history, client checkout view, and integration panel. Visitors open the public site without a ScopePay account and connect their own Gemini API key and PayPal Sandbox merchant credentials. Visitor projects, analyses, negotiations, activity, and payment records are stored in a shared Supabase PostgreSQL database with server-enforced workspace ownership. A visibly labeled static preview demonstrates the UI if no Gemini key is configured.

## How we built it

- **Google Gemini REST API**: structured scope analysis, quote-backed evidence, itemized effort estimate, three negotiation alternatives, and a client response draft. The server verifies evidence is actually excerpted from the original agreement and computes prices independently.
- **PayPal Sandbox Orders v2 + JavaScript SDK**: server-side OAuth2, order creation, client authorization in PayPal Checkout, capture and server-side verification.
- **Node.js**: built-in HTTP server, anonymous session handling, visitor-scoped JSON development storage, and Supabase PostgreSQL persistence for the hosted application.
- **HTML, CSS and JavaScript**: responsive freelancer negotiation studio, shareable client offer portal, and checkout page.
- **Node test runner**: 22 tests covering visitor isolation, optional owner access, client capability links, credential encryption, pricing math, quote checks, negotiation decisions, counteroffers, payment verification, persistence, and UI rendering.

## Challenges we designed around

The biggest design question was where AI should stop and financial authority should begin. Language models are useful for reasoning about change requests, but they should not be allowed to charge clients. ScopePay therefore uses AI to recommend *hours*, applies the hourly rate saved by the freelancer, and requires explicit approval of the final amount before creating a payable order.

A second challenge is making the PayPal integration meaningful, not decorative. We designed the core outcome around payment: project agreement → AI analysis and negotiation options → freelancer publication → client acceptance or counteroffer → agreed change order → PayPal Sandbox checkout → verified payment status. The backend creates and captures the PayPal order, instead of trusting a client-side 'success' flag.

## What we're proud of

The flow is easy to understand for non-technical freelancers and is backed by actual payment API integration code. Sandbox money and real money are clearly separated, and sample AI output is not misrepresented as a live response. Local development can run without a database service, while the hosted multi-visitor deployment uses Supabase PostgreSQL. npm dependencies are installed with `npm install`.

## What's next

Add registered client/freelancer accounts, MFA and account recovery, independent security review, legally robust electronic signatures, webhook-based reconciliation, a more rigorous historical estimation model, and support for other currencies. Later, ScopePay could become a full independent-work contract assistant with versioned agreements and invoice exports.

## Suggested categories / award alignment

Most Impactful, Best Use of PayPal + AI, and potentially Best Use of Agentic Commerce — but don't claim autonomous payments: the human explicitly approves the amount and the buyer approves checkout.

## Links to fill before submission

- **Public GitHub:** `https://github.com/<your-username>/scopepay-ai`
- **YouTube demo:** `https://www.youtube.com/watch?v=<your-video-id>`
- **Hosted demo:** Optional. The repository run instructions are sufficient under the published hackathon rules.
- **Code license:** MIT.
- **Tools used:** Google Gemini API, PayPal Sandbox Orders v2, PayPal JS SDK, Node.js, HTML, CSS, JavaScript.

## Accuracy checklist

This packaged build was automatically tested with local API tests and mocked third-party services. **Live Gemini, Supabase, and PayPal Sandbox calls still need to be tested with the deployer’s own credentials.** Recheck live third-party calls with your own keys before claiming the final demo is fully verified. The sample-mode preview is static; it is not a trained model inference. This repository provides a working local prototype plus real integration code ready for credentials.

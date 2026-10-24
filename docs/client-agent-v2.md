# Client Agent v2

Entry point: `atelier-v2/clients.html`. The former setup URL redirects to its three-step wizard.

The profile stores Day 1/2 answers, a portfolio link, optional Upwork link, up to three described projects, and an explicitly approved offer. Existing profile data becomes an editable draft; existing prospects remain available. Neither a link nor its description is presented as evidence that Fuse watched a video.

`POST /api/client-agent` owns profile import, approval, research start/status and prospect updates. Every request validates the Supabase user; every query restricts ownership. The browser never gets provider credentials. The existing research and contract endpoints are retained for compatibility but are not used by the rebuilt page.

`client_agent_jobs` is a durable queue with an immutable profile snapshot. A dedicated server-only worker token and a Supabase Cron job dispatch work every 15 seconds while jobs are due. Each worker claims a bounded stage with a lease. Discovery retrieves original source text through Firecrawl before OpenAI background responses extract candidates and draft pitches. OpenAI web search is the fallback when that retrieval is unavailable. Verification opens the actual source pages between those steps. Research continues after the browser closes. Jobs time out after 25 minutes and settle with a refund. No emails or DMs are sent automatically.

The start and finish RPCs are service-role-only, security-invoker functions. Reservation and settlement are transactional: 30 credits reserved for up to five results, six credits retained per delivered result, and the remainder refunded. Repeating a request key, starting while an active job exists or finishing twice cannot duplicate a charge/refund. Rows, evidence and drafts settle together.

Evidence checks reject unsupported source quotes, stale/future activity, generic promotional text and unpublished contact values. Dated activity needs a date visible on its source; specific undated offers are labelled ongoing. A missing named founder is permitted. Phone and WhatsApp remain distinct. Unreadable sources can result in fewer than five prospects; the interface explains the shortfall.

Run `npm ci` and `npm run test:client-agent`. Tests cover scope/price preservation, SSRF address restrictions, stale and invented evidence, contact validation, sample-first proof, the three-step approval flow, research state, navigation and tracking. DOM tests do not replace a real-device visual review. Live database reservation, idempotency and partial/full refund checks were run in rolled-back transactions.

Environment: existing `OPENAI_API_KEY` and optional `FIRECRAWL_API_KEY`. Optional overrides: `OPENAI_CLIENT_RESEARCH_MODEL`, `OPENAI_CLIENT_PROFILE_MODEL`. The default remains the project's existing GPT-4.1 mini integration. No API keys belong in browser code or committed files.

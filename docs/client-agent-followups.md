# Client Agent research and follow-ups

Uses the existing OPENAI_API_KEY with gpt-6.1-sol and Responses web_search. Firecrawl is no longer called by the Client Agent; the shared integration is retained for unrelated tools. Research and refreshed pitches follow Coach Ria's supplied Days 8–14 rules. Existing prospect drafts stay editable and have a refresh action.

Users explicitly record sent messages. First reminder: three business days later at 10:00 Africa/Lagos. Recording a follow-up schedules one final reminder five business days later. No more than two silent follow-ups. Explicit future dates extracted from a saved brand reply delay reminders; review the displayed date. Recording a reply pauses reminders, saves the conversation and drafts the next reply. No inbox integration and no automatic messages to brands.

Supabase migration: client_agent_automatic_followups and client_agent_respect_requested_followup; canonical SQL in supabase/client-agent-followups.sql. Existing pg_cron dispatcher calls the authenticated worker only when jobs or reminders are due. Reminders use existing RESEND_API_KEY and FUSE_EMAIL_FROM, account-owner email only, deterministic Resend idempotency keys, row leases and bounded retries. Existing leads are not automatically enrolled.

Checks: npm run test:client-agent; node --test tests/client-agent-followups.test.js; node tests/client-agent-conversation-ui.cjs. Database transaction checks cover scheduling, duplicate clicks, cancellation, the two-followup cap and weekend calculations, then roll back fixtures.

# Auth email delivery activation

The password signup client calls Supabase Auth. The legacy public-auth function's Resend key does not configure Supabase Auth automatically.

1. Keep existing Vercel server-only RESEND_API_KEY and FUSE_EMAIL_FROM values. Confirm the sender domain is verified in Resend.
2. Create a Supabase Authentication → Hooks → Send Email HTTP hook for https://fuseatelier.com/api/auth-email. Generate its signing secret and save that exact secret as SEND_EMAIL_HOOK_SECRET in Vercel production. Do not commit or paste secrets into chat.
3. Deploy this commit to Vercel before enabling the hook. Keep the Email provider and email confirmation enabled. Enable the Send Email hook only once its endpoint and secret are deployed.
4. Test a fresh signup with a controlled inbox: confirm Resend accepted/delivered the message, then enter the code or follow the link. Test resend, password login, password recovery, and checkout return. Provider acceptance alone is not inbox delivery.
5. If activation fails, disable the hook to restore the previous mail transport while diagnosing. Do not bulk-confirm accounts or disable verification.

Endpoint verifies the exact raw request signature, enforces a five-minute timestamp window and payload size limit, sanitizes email HTML, restricts redirects to the canonical signup page, and uses Resend idempotency keys. It never logs tokens, payloads, or provider credentials. Unsigned calls fail closed. Secrets or sender misconfiguration returns an error rather than success.

Run: node --test tests/auth-email.test.cjs

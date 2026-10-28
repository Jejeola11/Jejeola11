# Credit pricing v2 — staged, not production-ready

Do not enable FUSE_PRICING_V2 or apply install.sql yet. No deployment or production data changes are part of this branch.

## Pack catalogue

| Nestuge product key | Price NGN | Credits |
| --- | ---: | ---: |
| credits-v2-trial | 1000 | 4 |
| credits-v2-mini | 5000 | 45 |
| credits-v2-creator | 10000 | 100 |
| credits-v2-studio | 20000 | 200 |
| credits-v2-pro | 50000 | 500 |
| credits-v2-agency | 100000 | 1000 |

Create one Nestuge credit product per row. Keep courses separate. Set FUSE_NESTUGE_CREDIT_LINKS to a JSON object mapping those exact keys to real HTTPS Nestuge checkout links. No products or checkout links have been created. The page disables checkout without both an active flag and a validated link.

## Built in this branch

- Responsive black-teal/chrome pricing page, central six-pack catalogue, no outdated discount or fixed generation-count claims.
- Server-side pricing formula: provider USD cost × budget FX1700 ×1.10 retry reserve, divided by credit unit value ×0.35. Integer round up, minimum2credits. This reserves15% revenue for fees,10% operations and targets40% contribution. It is not net profit or a guarantee.
- Small-pack allowances cover a provisional fixed checkout reserve; actual Nestuge settlement fees, VAT, payout charges and FX must be reconciled before activation. These assumptions are not verified account-specific charges.
- WaveSpeed pricing lookup uses the full captured model payload and list price; it fails closed when a reliable quote is unavailable.
- Draft authenticated expiring quotes, idempotent reservation, conservative legacy wallet value, per-attempt refunds, and ambiguous submission review state.
- Draft owner-only Nestuge payment reconciliation using exact successful-payment amount and unique reference. This is not a Nestuge webhook; customers cannot claim payment by returning from checkout.
- Existing balances are not reduced. SQL is an unexecuted install script, not a completed migration.

## Release blockers / remaining engineering

1. Integrate quote confirmation into every generation UI and block legacy direct submissions. The existing UI still uses legacy routes. Do not activate this branch's billing handlers yet.
2. Route v2 jobs through an atomic refund-aware status handler before existing job-status code. Existing legacy refunds are not safe for these new attempts. Add idempotent generation archival and actual cost logging.
3. Add recovery/reconciliation for executions interrupted between reservation, provider submission and job persistence. Never automatically resubmit a provider request with an uncertain outcome.
4. Finish exact cost adapters for remaining tools: multi-step avatar/model sheets, flyer workflows, websites, Agent research and auxiliary AI calls. Confirm course entitlements and cap tokens, steps, retries and external tool costs. Current quote recipes cover only seven simple WaveSpeed action types; that is not complete app coverage.
5. Preserve existing paid receipts and course fulfilment while preventing new sale of legacy discounted packs. Reflect manually verified Nestuge payments in purchase entitlements where appropriate.
6. Run SQL against a disposable Supabase database; test concurrent reservation, insufficient balance, duplicate payment/reference, ownership, refund replay, interrupted workers, RLS and service-only execution. Supabase CLI was unavailable locally. No production SQL was executed.
7. Test live WaveSpeed price responses with the existing server-side secret. Sensitive Vercel key metadata could be read, but not the plaintext credential; live price calls were not tested.
8. Validate all recipe field mappings against current browser payloads, duration-based media prices and model-specific restrictions. Test every supported model/resolution/reference combination, not just the formula.
9. Create Nestuge products and verify end-to-end settlement/reconciliation. Build an owner-facing review queue before enabling manual payment operations for real purchases.
10. Browser/mobile visual check, authenticated staging purchase/generation/refund test, then a separately authorized deployment.

## Checks completed

`node --test tests/credit-policy-v2.test.js`: six tests passed. These cover pack amounts, rounding/margin at both new and conservative legacy values, invalid costs, checkout host validation, concurrent capture isolation, and price response/request validation. They do not prove database concurrency or production integration.

References: https://wavespeed.ai/docs/pricing-api and https://nestuge.com/pricing. Provider/payout prices must be rechecked at activation.

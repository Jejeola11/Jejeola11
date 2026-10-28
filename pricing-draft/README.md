# Fuse pricing draft — not live

Target 40% contribution after reserves; not guaranteed net profit. FX budgeting assumption NGN1700/USD is not a current exchange-rate quotation. Refresh against actual provider funding cost.

Packs: NGN10000/100 credits, 20000/200, 50000/500, 100000/1000. No bonus credits. Smaller packs need separately calculated fixed-payment fees. Existing balances remain unchanged; legacy discounted credits require their own realized-value margin check before activation.

Pricing: ceil((provider USD * 1700 * 1.10)/(1-.15-.10-.40)/100), minimum 2 credits. 15% payment reserve, 10% revenue operating reserve, 10% provider-cost retry reserve. These are assumptions, not actual invoices or tax advice. Profit after reserve is not after tax.

CSV uses repository provider-cost assumptions, NOT verified current quotes. Video base rows do not imply all durations/resolutions cost the same. Setting rows exclude extra reference-media charges. Do not activate until exact request quotes are verified.

Release requirements:
- WaveSpeed authenticated price endpoint with full model inputs; reject missing/stale quotes.
- Verify actual Nestuge fee schedule, VAT, fixed fee and payout deductions.
- Never silently route to a more expensive fallback beyond approved quote.
- Reserve credits before provider submission; idempotent charging and refunds.
- Cap LLM tokens, web calls, retry count, video duration and media storage.
- Meter all components of avatar/flyer/research workflows, not only final output.
- Audit legacy course credit unlocks and all generation endpoints for bypasses.
- Prevent old cheaper packs/bonuses undermining the credit revenue floor.
- Do not promise unlimited permanent hosting within a generation price.
- Measure actual cost and contribution for each job, payment and credit cohort.

Sources: https://nestuge.com/pricing ; https://wavespeed.ai/docs/pricing-api ; https://developers.openai.com/api/docs/models/gpt-6.1-sol

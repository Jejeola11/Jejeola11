# GPT credit policy — 3 November 2026

Pricing lives in `functions/_gpt-pricing.js`. OpenAI generation routes must use it instead of WaveSpeed dollar estimates. Credit pack prices, existing balances and affiliate rewards are unchanged.

## Target

Image quotes target twice their buffered generation-and-operating budget after modeled discounts, commission and fees: a 50% contribution margin against that budget. GPT chat keeps its existing 3× policy. These are budgeting targets, not guaranteed business profit.

Verified commerce assumptions:

- New referred buyers: 25% first-credit-purchase discount.
- Credit affiliate commission: 5%; Academy commission remains 50% and is not altered.
- Payment allowance: 4% plus ₦100 per purchase, conservatively charged even where the fixed fee may be waived.
- Current pack net revenue floor and the older ₦50,000/650-credit pack are both considered. Current floor is about ₦69.85 per credit under these assumptions.

Budget assumptions, not claims about current exchange rates:

- ₦1,750/USD conversion allowance.
- 25% allowance above the provider token-cost estimate.
- ₦5 operating allowance per submitted image or chat response.
- Always round the final credit requirement upward.

## Provider budgets

- Image output tokens: OpenAI's published GPT Image 2 / 2.5 calculator, using the actual dimensions and quality. GPT Image 1.5 uses the published older-model token table.
- Text input: conservative UTF-8 byte count; prompts over 12,000 bytes are rejected.
- Images: at most 14 references, normalized server-side to at most 1,536 pixels on the longest edge, at most 2 MB encoded per reference. Image edits budget 8,192 image-input tokens per reference and 4,096 helper-input tokens per reference. These are explicit estimates, not documented fixed token counts or provider spending caps; compare with returned usage and invoices. Chat retains its previous reference allowance.
- The GPT-5.2 image helper is included in the quote, with `reasoning: none`, a 2,048-output-token ceiling and at most one image tool call.
- GPT chat: selected model's input/output rates, at most one normalized image, `reasoning: none`, and at most 4,096 output tokens.
- Useful text returned at the output limit is delivered with a length-limit label, not discarded and refunded as an empty failure.
- Unsupported models, qualities and sizes fail before a provider request.

References:

- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/docs/models/gpt-5.2
- https://developers.openai.com/api/docs/models/gpt-5.5
- https://developers.openai.com/api/docs/models/gpt-image-1.5

## Charging and verification

Create keeps its server quote/accepted-credit check. Legacy GPT tools now quote before spending; their UI asks users to confirm the revised amount. Batch image costs are the sum of independent quoted image requests.

Jobs retain pricing version, quoted provider budget and returned usage where available. Exact chat cost is calculated only when the required usage and cached-token fields are returned. Image tool usage is retained separately; an unknown image invoice cost is never recorded as zero or misrepresented as verified.

Examples for short English prompts, with no references:

| Request | Credits |
| --- | ---: |
| GPT Image 2.5, 1K medium | 3–4 |
| GPT Image 2.5, 2K high | 9 |
| GPT-5.2 chat | 6 |
| GPT-5.5 chat | 13 |

Longer prompts, image references, different quality, size and batch count can increase these figures. The API quote is authoritative.

## Limits

Token calculators provide estimates, not spending guarantees. Provider failures/refunds, storage and hosting beyond the modeled allowance, exchange-rate changes, taxes, chargebacks and abuse can reduce realized profit. Compare usage with provider invoices and adjust the budget constants if the observed costs exceed the allowance. Do not claim every request is loss-proof.

No paid generation was used to test this change. Run `node server/test-gpt-pricing.cjs`; external services are mocked.

For a short prompt and two references, GPT Image 2.5 1K medium now quotes about 13 credits. Higher settings, longer prompts and batches cost more. The previous per-reference allowance plus 3× image markup made edits unnecessarily expensive.

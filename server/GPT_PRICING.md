# Unified generation credit pricing — 3 November 2026
Customer pricing uses exactly `max(1, ceil(WaveSpeed USD × 1400 × 2 / 85))`. It does not depend on the provider executing the task or the purchase pack, discount, affiliate rate or payment fee. Provider routing is unchanged. This replaces all previous GPT retail-margin calculations.

- Live WaveSpeed catalogue models evaluate their selected-setting price formula before conversion.
- GPT image routes and legacy GPT tools use WaveSpeed's published quality/resolution/edit-reference tables. GPT Image 2.5 references add $0.015 each; GPT Image 2 edit includes the first reference and adds $0.012 for each further reference.
- Higgsfield Seedance quotes use the matching WaveSpeed version's published output/reference duration rates, including edit and extend input duration.
- Text messages use WaveSpeed LLM catalogue `pricing.prompt` and `pricing.completion` USD/token rates, an estimated prompt allowance and a 4096-output-token ceiling. Quotes fail before spending if the matching rates are unavailable.
- Existing legacy image/video/audio/tool USD schedules convert through the same shared function. Model versions and settings must match their benchmark; estimates in historical schedules still need reconciliation with current WaveSpeed invoices. There is no substitution of a cheaper model as a price reference.
- Whole-credit rounding happens after the USD cost has been calculated. Independent batch requests sum their individual quotes.
- These are retail reference prices, not verified OpenAI/Higgsfield invoice costs and not a profit guarantee. Unknown actual provider usage cost remains null.
- No paid generations are used in pricing tests.

Examples: $0.024 → 1 credit; $0.054 → 2 credits; $0.10 → 4 credits; $1.80 → 60 credits.

Sources: https://wavespeed.ai/docs/supported-llm-models ; https://wavespeed.ai/docs/docs-api/openai/openai-gpt-image-2.5-sunburst-text-to-image ; https://wavespeed.ai/docs/docs-api/openai/openai-gpt-image-2.5-sunburst-edit ; https://wavespeed.ai/docs/docs-api/openai/openai-gpt-image-2-edit ; https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.5-text-to-video ; https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.5-video-edit ; https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.5-video-extend ; https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-text-to-video

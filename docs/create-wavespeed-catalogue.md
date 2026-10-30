# Schema-driven Create composer

The composer imports current image/video generation and editing models from WaveSpeed's authenticated model catalogue. It uses provider model IDs without relabelling old Seedance v1 Lite endpoints as 2.0. Seedance 2.0 Mini Turbo supports 4–15 seconds and 720p/1080p. Its text/reference and image/frame routes remain distinct.

The settings sheet renders each model's schema, including integer duration sliders, resolution and audio switches. Names truncate visually; full IDs remain accessible in the model menu. The selected quote is recalculated on the server before spend. Current pricing uses the existing safeCreditsFor formula: provider cost × NGN 1400/USD × 2.2 / (NGN 9500/120 net per credit), rounded up. This is an API contribution floor under those FX and fee assumptions, not net business profit. Pack prices have not changed.

Pricing is loaded from the model's official public page and evaluated as JSONata in a data-only context. No eval of JavaScript. Base price is never used in place of a failing dynamic formula. Models needing provider-specific media-duration or other unsupported pricing helpers stay blocked with a quote-unavailable error; full-catalogue visibility does not mean every specialised configuration has been generation-tested. Temporary provider discounts are not assumed.

The asset picker supports up to 14 selected files across uploads, saved AI characters and generated elements. Presets are empty until saved; no stock identities are supplied. Individual model schemas enforce lower limits. Extra assets are rejected before upload rather than silently ignored. Mini image-to-video supports a start image and optional end frame; Mini text-to-video has separate image/video/audio arrays.

Generation uses the existing authenticated Supabase account, credit spend/refund RPCs, avatars bucket and ws-prefixed job/library polling. No database schema changes. API keys remain server-side. Existing specialised image/video pages are retained; Mini has also been added to the older Video workspace.

Verification: node --test tests/wavespeed-catalogue.test.js; node tests/create-composer-ui.cjs; node --test tests/video-model-requests.test.js; node tests/credit-reprice.test.cjs. Public live Mini pricing was checked at both resolutions for 4,5,10,15 seconds without paid generation.

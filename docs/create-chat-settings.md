# Create settings and inline generation

Create uses compact, thumbnail-based attachments above the prompt. Settings use icon rows, a nested ratio/quality picker, a duration slider and sound switch. The picker shows the seven requested aspect ratios; unsupported provider ratios are disabled rather than sent as invalid input. Batch size remains one when the model has no batch parameter. Every supported model setting remains schema-driven and server quotes remain authoritative.

Submitting posts the exact prompt, selected settings and uploaded references to wavespeed-run. The page stays open, records a user-scoped chat turn, then polls the authenticated job-status endpoint. Existing Library storage and credit handling are reused. Browser chat history stores up to forty turns and resumes pending polling on reload; it is device-local. Failed submissions do not retry automatically.

The provider status endpoint currently exposes processing/completed/failed, not a measured percentage. The interface labels its 2–95% animation as estimated progress; only a real completed response with a usable HTTPS output reaches 100%. Finished media displays inline with a bottom-right download button. File downloads use a blob so cross-origin browser navigation does not replace Create.

Validation: node tests/create-composer-ui.cjs; node tests/create-chat-ui.cjs; node --test tests/wavespeed-catalogue.test.js. The chat test covers two uploaded references, schema input mapping, ratio selection, submission without navigation, scoped persistence, polling, completion, and download control. No paid provider generation is performed by tests.

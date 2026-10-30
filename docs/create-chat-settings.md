# Create settings and inline generation

Create uses compact, thumbnail-based attachments above the prompt. Settings use icon rows, a nested ratio/quality picker, a duration slider and sound switch. The picker shows the seven requested aspect ratios; unsupported provider ratios are disabled rather than sent as invalid input. Batch size remains one when the model has no batch parameter. Every supported model setting remains schema-driven and server quotes remain authoritative.

Submitting posts the exact prompt, selected settings and uploaded references to wavespeed-run. The page stays open, records a user-scoped chat turn, then polls the authenticated job-status endpoint. Existing Library storage and credit handling are reused. Browser chat history stores up to forty turns and resumes pending polling on reload; it is device-local. Failed submissions do not retry automatically.

The provider status endpoint currently exposes processing/completed/failed, not a measured percentage. The interface labels its 2–95% animation as estimated progress; only a real completed response with a usable HTTPS output reaches 100%. Finished media displays inline with a bottom-right download button. File downloads use a blob so cross-origin browser navigation does not replace Create.

Validation: node tests/create-composer-ui.cjs; node tests/create-chat-ui.cjs; node --test tests/wavespeed-catalogue.test.js. The chat test covers two uploaded references, schema input mapping, ratio selection, submission without navigation, scoped persistence, polling, completion, and download control. No paid provider generation is performed by tests.

## Account chats and downloads

Create now replaces its menu navigation links with New chat and a growing list of conversations. The first prompt supplies a short title; users can rename it inline. Existing device history migrates into one conversation. Chats sync to the account-owned create_chats table, protected by SELECT/INSERT/UPDATE owner RLS; new chats and renames do not affect generations stored in Library. The active conversation's composer stays below its turns. Pending jobs across conversations keep polling while the page is open.

A shared media-download helper powers Create and Library. It shows streamed byte/percentage progress, Saving, then Download started after handing the complete blob to the browser. Errors clear the disabled state and allow retry. All generated filenames start with fuseatelier-. Web browsers cannot confirm Gallery indexing or OS save completion, so the UI does not falsely claim a file has appeared in Gallery.

Database verification confirmed the completed Seedance Mini job already has its generations row for Library. A rolled-back transaction verified chat owner read/rename and cross-account read/update isolation. No paid generation or user email was sent during validation.

// PitchPilot config — its OWN Supabase project, fully separate from Fuse
// Studio. Create a free project at supabase.com, run supabase-pitchpilot.sql
// in its SQL Editor, then paste that project's Settings → API values below.
// The anon key is safe to expose client-side (same as any Supabase frontend).
window.PP_CONFIG = {
  SUPABASE_URL: 'PASTE_YOUR_NEW_SUPABASE_PROJECT_URL_HERE',
  SUPABASE_ANON_KEY: 'PASTE_YOUR_NEW_SUPABASE_ANON_KEY_HERE',
  // Emails allowed to see the Admin box (cosmetic only — the real check is
  // server-side in pp-grant.js via the PP_ADMIN_EMAILS Netlify env var, so
  // this list alone can't grant anyone real admin power).
  ADMIN_EMAILS: ['riadigitals0@gmail.com'],
};

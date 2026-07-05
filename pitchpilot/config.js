// PitchPilot config — its OWN Supabase project, fully separate from Fuse
// Studio. Create a free project at supabase.com, run supabase-pitchpilot.sql
// in its SQL Editor, then paste that project's Settings → API values below.
// The anon key is safe to expose client-side (same as any Supabase frontend).
window.PP_CONFIG = {
  SUPABASE_URL: 'https://omqsyebfypuzvsgfpnad.supabase.co/rest/v1/',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tcXN5ZWJmeXB1enZzZ2ZwbmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxOTY5NjMsImV4cCI6MjA5ODc3Mjk2M30.nYryIRmstdsjHtrKm6rwHqextwgVg5oblYBH3d-heOE',
  // Emails allowed to see the Admin box (cosmetic only — the real check is
  // server-side in pp-grant.js via the PP_ADMIN_EMAILS Netlify env var, so
  // this list alone can't grant anyone real admin power).
  ADMIN_EMAILS: ['riadigitals0@gmail.com'],
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const allowedOrigins = new Set([
  "https://fuseatelier.com",
  "https://www.fuseatelier.com",
  "https://fuse-atelier-studio.netlify.app",
  "https://deploy-fuse-atelier-netlify--fuse-atelier-studio.netlify.app",
  "https://fuse-atelier-studio.vercel.app",
  "https://fuse-atelier.vercel.app",
  "https://fuse-atelier-studio-ria-d6b9.vercel.app",
  "https://fuse-atelier-studio-ak2fochcl-ria-d6b9.vercel.app",
]);

function originAllowed(origin: string) {
  if (allowedOrigins.has(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+--fuse-atelier-studio\.netlify\.app$/i.test(origin)) return true;
  if (/^https:\/\/fuse-atelier-studio-[a-z0-9-]+-ria-d6b9\.vercel\.app$/i.test(origin)) return true;
  return false;
}

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = originAllowed(origin) ? origin : "https://fuse-atelier-studio.vercel.app";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors(req) });
}

function normalizeYouTubeUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return { ok: false as const, error: "Video URL is required." };
  let u: URL;
  try { u = new URL(raw); } catch { return { ok: false as const, error: "Enter a valid YouTube URL." }; }
  if (u.protocol !== "https:") return { ok: false as const, error: "Video URL must use HTTPS." };
  const host = u.hostname.replace(/^www\./i, "").toLowerCase();
  let id = "";
  if (host === "youtu.be") {
    id = u.pathname.split("/").filter(Boolean)[0] || "";
  } else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
    const parts = u.pathname.split("/").filter(Boolean);
    if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
    else if (["shorts", "embed", "live"].includes(parts[0] || "")) id = parts[1] || "";
  } else {
    return { ok: false as const, error: "Use a youtube.com or youtu.be link." };
  }
  id = id.trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return { ok: false as const, error: "Could not read the YouTube video ID." };
  return {
    ok: true as const,
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    embed_url: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
  };
}

function cleanLessonKey(value: unknown) {
  const key = String(value ?? "").trim();
  return /^[a-z0-9][a-z0-9_-]{1,100}$/i.test(key) ? key : "";
}

function cleanDuration(value: unknown) {
  if (value === null || value === undefined || value === "") return { ok: true as const, value: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 86400) return { ok: false as const, error: "Duration must be between 0 and 86400 seconds." };
  return { ok: true as const, value: Math.round(n) };
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return { ok: false as const, response: json(req, { error: "Authentication required." }, 401) };
  const token = authHeader.slice(7).trim();
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return { ok: false as const, response: json(req, { error: "Your session is invalid or expired." }, 401) };

  const service = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[academy-admin] profile lookup failed", profileError.message);
    return { ok: false as const, response: json(req, { error: "Could not verify admin access." }, 500) };
  }
  if (!profile?.is_admin) return { ok: false as const, response: json(req, { error: "Admin access required." }, 403) };
  return { ok: true as const, user, service };
}

async function listVideos(service: ReturnType<typeof createClient>) {
  const { data, error } = await service
    .from("course_videos")
    .select("lesson_key,url,updated_at,duration_sec,has_video")
    .order("lesson_key", { ascending: true });
  if (error) throw error;
  return data || [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE) return json(req, { error: "Admin backend is not configured." }, 500);

  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { user, service } = gate;

  try {
    if (req.method === "GET") {
      const rows = await listVideos(service);
      return json(req, { ok: true, admin: true, user: { id: user.id, email: user.email || null }, rows });
    }

    if (req.method !== "POST") return json(req, { error: "Method not allowed." }, 405);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json(req, { error: "Invalid JSON body." }, 400); }
    const action = String(body.action || "").trim();

    if (action === "upsert") {
      const lesson_key = cleanLessonKey(body.lesson_key);
      if (!lesson_key) return json(req, { error: "Invalid lesson key." }, 400);
      const video = normalizeYouTubeUrl(body.url);
      if (!video.ok) return json(req, { error: video.error }, 400);
      const duration = cleanDuration(body.duration_sec);
      if (!duration.ok) return json(req, { error: duration.error }, 400);
      const now = new Date().toISOString();
      const { data, error } = await service.from("course_videos").upsert({
        lesson_key,
        url: video.url,
        duration_sec: duration.value,
        has_video: true,
        updated_at: now,
      }, { onConflict: "lesson_key" }).select("lesson_key,url,updated_at,duration_sec,has_video").single();
      if (error) throw error;
      console.log("[academy-admin] upsert", { user_id: user.id, lesson_key });
      return json(req, { ok: true, row: data, embed_url: video.embed_url });
    }

    if (action === "clear") {
      const lesson_key = cleanLessonKey(body.lesson_key);
      if (!lesson_key) return json(req, { error: "Invalid lesson key." }, 400);
      const now = new Date().toISOString();
      const { data, error } = await service.from("course_videos").upsert({
        lesson_key,
        url: null,
        duration_sec: null,
        has_video: false,
        updated_at: now,
      }, { onConflict: "lesson_key" }).select("lesson_key,url,updated_at,duration_sec,has_video").single();
      if (error) throw error;
      console.log("[academy-admin] clear", { user_id: user.id, lesson_key });
      return json(req, { ok: true, row: data });
    }

    if (action === "bulk_upsert") {
      const input = Array.isArray(body.items) ? body.items : [];
      if (!input.length) return json(req, { error: "No videos to save." }, 400);
      if (input.length > 250) return json(req, { error: "Bulk save is limited to 250 videos at once." }, 400);
      const now = new Date().toISOString();
      const rows: Array<Record<string, unknown>> = [];
      for (const raw of input) {
        if (!raw || typeof raw !== "object") return json(req, { error: "Invalid bulk item." }, 400);
        const item = raw as Record<string, unknown>;
        const lesson_key = cleanLessonKey(item.lesson_key);
        if (!lesson_key) return json(req, { error: "One bulk item has an invalid lesson key." }, 400);
        const video = normalizeYouTubeUrl(item.url);
        if (!video.ok) return json(req, { error: `${lesson_key}: ${video.error}` }, 400);
        const duration = cleanDuration(item.duration_sec);
        if (!duration.ok) return json(req, { error: `${lesson_key}: ${duration.error}` }, 400);
        rows.push({ lesson_key, url: video.url, duration_sec: duration.value, has_video: true, updated_at: now });
      }
      const { data, error } = await service.from("course_videos").upsert(rows, { onConflict: "lesson_key" }).select("lesson_key,url,updated_at,duration_sec,has_video");
      if (error) throw error;
      console.log("[academy-admin] bulk_upsert", { user_id: user.id, count: rows.length });
      return json(req, { ok: true, rows: data || [], count: rows.length });
    }

    return json(req, { error: "Unknown action." }, 400);
  } catch (error) {
    console.error("[academy-admin] request failed", error);
    return json(req, { error: error instanceof Error ? error.message : "Admin request failed." }, 500);
  }
});

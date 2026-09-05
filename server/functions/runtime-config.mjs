export default async () => {
  const sourceUrl = 'https://raw.githubusercontent.com/Jejeola11/Jejeola11/claude/product-scaling-landing-page-241hei/app/config.js';

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    return new Response(`// Failed to load Fuse Atelier config: ${response.status}`, {
      status: 502,
      headers: { 'content-type': 'application/javascript; charset=utf-8' },
    });
  }

  let source = await response.text();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response('// Fuse Atelier Supabase environment variables are missing.', {
      status: 500,
      headers: { 'content-type': 'application/javascript; charset=utf-8' },
    });
  }

  source = source
    .replace(/SUPABASE_URL:\s*'[^']*'/, `SUPABASE_URL: '${supabaseUrl}'`)
    .replace(/SUPABASE_ANON_KEY:\s*'[^']*'/, `SUPABASE_ANON_KEY: '${supabaseAnonKey}'`);

  return new Response(source, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};

export const config = {
  path: '/app/config.js',
  preferStatic: false,
};

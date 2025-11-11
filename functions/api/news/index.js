// functions/api/news/index.js

// --- helpers comunes ---
function parseCookies(request) {
  const raw = request.headers.get('cookie') || '';
  const map = {};
  raw.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > -1) {
      const k = p.slice(0, i).trim();
      const v = decodeURIComponent(p.slice(i + 1).trim());
      if (k) map[k] = v;
    }
  });
  return map;
}
function headerToken(request) {
  const h = request.headers;
  return h.get('x-csrf') || h.get('x-csrf-token') || h.get('csrf-token') || '';
}
function sameOriginOK(request) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = new URL(request.url).origin;
  return (origin && origin === host) || (referer && referer.startsWith(host));
}
function csrfPasses(request) {
  const token = headerToken(request);
  if (!token) return false;
  const ck = parseCookies(request);
  const cookieToken = ck['csrf'] || ck['x-csrf'] || ck['XSRF-TOKEN'];
  // 1) header==cookie
  if (cookieToken && cookieToken === token) return true;
  // 2) same-origin fuerte (Origin/Referer) + header presente
  if (sameOriginOK(request)) return true;
  return false;
}

// --- GET: listado público (publicadas) ---
export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB?.prepare) throw new Error('D1 binding "DB" ausente');

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '12', 10), 50);

    const rows = await env.DB.prepare(
      `select id, date, title, url, tag, published, created_at
       from news
       where published = 1
       order by date desc, id desc
       limit ?`
    ).bind(limit).all();

    return new Response(JSON.stringify(rows.results || []), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// --- POST: crear (admin) ---
export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB?.prepare) throw new Error('D1 binding "DB" ausente');

    const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
    const { verifyCsrf } = await import('../../_lib/csrf.js');

    const user = await getSessionUser(env, request);
    requireAdmin(user);

    // CSRF: intentá verificación original, si falla aplicamos fallbacks same-origin
    try {
      await verifyCsrf(request);
    } catch {
      if (!csrfPasses(request)) {
        return new Response(JSON.stringify({ ok: false, error: 'CSRF inválido' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    let payload;
    try { payload = await request.json(); }
    catch { return new Response(JSON.stringify({ ok: false, error: 'JSON inválido' }), { status: 400 }); }

    const { date, title, url, tag = 'release', published = true } = payload || {};
    if (!title) return new Response(JSON.stringify({ ok: false, error: 'title required' }), { status: 400 });

    const d = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : new Date().toISOString().slice(0, 10);

    await env.DB.prepare(
      'insert into news(date,title,url,tag,published) values(?,?,?,?,?)'
    ).bind(d, title, url || null, tag, published ? 1 : 0).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

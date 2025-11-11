// functions/api/news/index.js
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

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB?.prepare) throw new Error('D1 binding "DB" ausente');

    const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
    const { verifyCsrf } = await import('../../_lib/csrf.js');

    const user = await getSessionUser(env, request);
    requireAdmin(user);

    try { verifyCsrf(request); }
    catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'CSRF inválido', details: String(e?.message || e) }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
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

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

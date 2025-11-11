// functions/api/news/[id].js

// --- helpers CSRF & same-origin ---
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
  if (cookieToken && cookieToken === token) return true;
  if (sameOriginOK(request)) return true;
  return false;
}

// GET /api/news/:id (admin)
export async function onRequestGet({ request, env, params }) {
  try {
    if (!env.DB?.prepare) throw new Error('D1 binding "DB" ausente');
    const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
    const user = await getSessionUser(env, request);
    requireAdmin(user);

    const id = params.id; // NO castear
    const row = await env.DB
      .prepare('select id, date, title, url, tag, published, created_at from news where id = ?')
      .bind(id)
      .first();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, data: row }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT /api/news/:id (editar)
export async function onRequestPut({ request, env, params }) {
  try {
    if (!env.DB?.prepare) throw new Error('D1 binding "DB" ausente');
    const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
    const { verifyCsrf } = await import('../../_lib/csrf.js');

    const user = await getSessionUser(env, request);
    requireAdmin(user);

    try {
      await verifyCsrf(request);
    } catch {
      if (!csrfPasses(request)) {
        return new Response(JSON.stringify({ ok: false, error: 'CSRF inválido' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    let body;
    try { body = await request.json(); }
    catch {
      return new Response(JSON.stringify({ ok: false, error: 'JSON inválido' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const allowed = ['date', 'title', 'url', 'tag', 'published'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        sets.push(`${k} = ?`);
        vals.push(k === 'published' ? (body[k] ? 1 : 0) : (body[k] ?? null));
      }
    }
    if (!sets.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No changes' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = params.id; // NO castear
    const sql = `update news set ${sets.join(', ')} where id = ?`;
    vals.push(id);

    const res = await env.DB.prepare(sql).bind(...vals).run();
    const changes = res?.meta?.changes ?? res?.changes ?? 0;
    if (!res?.success || changes === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Update failed' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    const row = await env.DB
      .prepare('select id, date, title, url, tag, published, created_at from news where id = ?')
      .bind(id)
      .first();

    return new Response(JSON.stringify({ ok: true, data: row }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE /api/news/:id
export async function onRequestDelete({ request, env, params }) {
  try {
    if (!env.DB?.prepare) throw new Error('D1 binding "DB" ausente');
    const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
    const { verifyCsrf } = await import('../../_lib/csrf.js');

    const user = await getSessionUser(env, request);
    requireAdmin(user);

    try {
      await verifyCsrf(request);
    } catch {
      if (!csrfPasses(request)) {
        return new Response(JSON.stringify({ ok: false, error: 'CSRF inválido' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const id = params.id;
    const res = await env.DB.prepare('delete from news where id = ?').bind(id).run();
    if (!res?.success) {
      return new Response(JSON.stringify({ ok: false, error: 'Delete failed' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}

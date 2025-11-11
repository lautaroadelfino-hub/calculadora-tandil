// functions/api/news/admin.js
export async function onRequestGet({ request, env }) {
  // ⬇️ subo dos niveles: functions/api/news -> functions/api -> functions
  const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');

  const user = await getSessionUser(env, request);
  requireAdmin(user);

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 500);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

  let sql = `select id, date, title, url, tag, published, created_at from news`;
  const params = [];
  if (q) {
    sql += ` where title like ? or tag like ? or url like ?`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ` order by date desc, id desc limit ? offset ?`;
  params.push(limit, offset);

  const rows = await env.DB.prepare(sql).bind(...params).all();
  return new Response(JSON.stringify({ ok: true, data: rows.results || [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

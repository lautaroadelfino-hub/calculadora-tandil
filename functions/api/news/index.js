// ============================
// functions/api/news/index.js
// ============================
/* filename=functions/api/news/index.js */
export async function onRequestGet({ request, env }){
const url = new URL(request.url);
const limit = Math.min(parseInt(url.searchParams.get('limit')||'12',10), 50);
const rows = await env.DB.prepare('select id, date, title, url, tag from news where published = 1 order by date desc, id desc limit ?').bind(limit).all();
return new Response(JSON.stringify(rows.results||[]), { headers: { 'Content-Type': 'application/json' }});
}


export async function onRequestPost({ request, env }){
const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
const { verifyCsrf } = await import('../../_lib/csrf.js');
const user = await getSessionUser(env, request);
requireAdmin(user); // 401 si no es admin
verifyCsrf(request);
const { date, title, url, tag='release', published=true } = await request.json();
if(!title) return new Response('title required', { status: 400 });
const d = date || new Date().toISOString().slice(0,10);
await env.DB.prepare('insert into news(date,title,url,tag,published) values(?,?,?,?,?)')
.bind(d, title, url||null, tag, published?1:0).run();
return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' }});
}
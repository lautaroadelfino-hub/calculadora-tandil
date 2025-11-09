// ===============================
// functions/api/news/[id].js
// ===============================
/* filename=functions/api/news/[id].js */
export async function onRequestPut({ request, env, params }){
const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
const { verifyCsrf } = await import('../../_lib/csrf.js');
const user = await getSessionUser(env, request);
requireAdmin(user);
verifyCsrf(request);
const id = Number(params.id);
const body = await request.json();
const fields = ['date','title','url','tag','published'];
const sets = []; const vals = [];
for(const k of fields){ if(k in body){ sets.push(`${k} = ?`); vals.push(k==='published' ? (body[k]?1:0) : body[k]); } }
if(!sets.length) return new Response('No changes', { status: 400 });
vals.push(id);
await env.DB.prepare(`update news set ${sets.join(', ')} where id = ?`).bind(...vals).run();
return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' }});
}


export async function onRequestDelete({ request, env, params }){
const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
const { verifyCsrf } = await import('../../_lib/csrf.js');
const user = await getSessionUser(env, request);
requireAdmin(user);
verifyCsrf(request);
const id = Number(params.id);
await env.DB.prepare('delete from news where id = ?').bind(id).run();
return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' }});
}
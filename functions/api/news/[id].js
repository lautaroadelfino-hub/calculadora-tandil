// filename: functions/api/news/[id].js
export async function onRequestGet({ request, env, params }) {
const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
const user = await getSessionUser(env, request);
requireAdmin(user);


const id = params.id; // soporta entero o uuid
const row = await env.DB
.prepare('select id, date, title, url, tag, published, created_at from news where id = ?')
.bind(id)
.first();
if (!row) {
return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
status: 404,
headers: { 'Content-Type': 'application/json' },
});
}
return new Response(JSON.stringify({ ok: true, data: row }), {
headers: { 'Content-Type': 'application/json' },
});
}


export async function onRequestPut({ request, env, params }) {
const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
const { verifyCsrf } = await import('../../_lib/csrf.js');
const user = await getSessionUser(env, request);
requireAdmin(user);
verifyCsrf(request); // acepta cookie+header según tu implementación


const id = params.id; // no forzamos Number()


let body;
try {
body = await request.json();
} catch (e) {
return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
status: 400,
headers: { 'Content-Type': 'application/json' },
});
}


const allowed = ['date', 'title', 'url', 'tag', 'published'];
const sets = [];
const vals = [];
for (const k of allowed) {
if (Object.prototype.hasOwnProperty.call(body, k)) {
sets.push(`${k} = ?`);
if (k === 'published') {
vals.push(body[k] ? 1 : 0);
} else {
vals.push(body[k] ?? null);
}
}
}


if (!sets.length) {
return new Response(JSON.stringify({ ok: false, error: 'No changes' }), {
status: 400,
headers: { 'Content-Type': 'application/json' },
});
}


const sql = `update news set ${sets.join(', ')} where id = ?`;
vals.push(id);


const res = await env.DB.prepare(sql).bind(...vals).run();
if (!res?.success) {
return new Response(
JSON.stringify({ ok: false, error: 'Update failed', details: res?.error || null }),
{ status: 500, headers: { 'Content-Type': 'application/json' } }
);
}


const row = await env.DB
.prepare('select id, date, title, url, tag, published, created_at from news where id = ?')
.bind(id)
.first();
return new Response(JSON.stringify({ ok: true, data: row }), {
headers: { 'Content-Type': 'application/json' },
});
}


export async function onRequestDelete({ request, env, params }) {
const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
const { verifyCsrf } = await import('../../_lib/csrf.js');
const user = await getSessionUser(env, request);
requireAdmin(user);
verifyCsrf(request);


const id = params.id; // string/num
const res = await env.DB.prepare('delete from news where id = ?').bind(id).run();
if (!res?.success) {
return new Response(JSON.stringify({ ok: false, error: 'Delete failed' }), {
status: 500,
headers: { 'Content-Type': 'application/json' },
});
}
return new Response(JSON.stringify({ ok: true }), {
headers: { 'Content-Type': 'application/json' },
});
}
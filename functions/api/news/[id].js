// filename: functions/api/news/[id].js
}


let body;
try { body = await request.json(); }
catch { return new Response(JSON.stringify({ ok: false, error: 'JSON inválido' }), { status: 400 }); }


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
status: 400,
headers: { 'Content-Type': 'application/json' },
});
}


const id = params.id;
const sql = `update news set ${sets.join(', ')} where id = ?`;
vals.push(id);


const res = await env.DB.prepare(sql).bind(...vals).run();
if (!res?.success || res.changes === 0) {
return new Response(JSON.stringify({ ok: false, error: 'Update failed' }), {
status: 500,
headers: { 'Content-Type': 'application/json' },
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
status: 500,
headers: { 'Content-Type': 'application/json' },
});
}
}


export async function onRequestDelete({ request, env, params }) {
try {
const { getSessionUser, requireAdmin } = await import('../../_lib/auth.js');
const { verifyCsrf } = await import('../../_lib/csrf.js');


const user = await getSessionUser(env, request);
requireAdmin(user);


try {
await verifyCsrf(request);
} catch (e) {
if (csrfHeaderMatchesCookie2(request)) {
// ok
} else if (e instanceof Response) {
return new Response(JSON.stringify({ ok: false, error: 'CSRF inválido' }), {
status: e.status || 403,
headers: { 'Content-Type': 'application/json' },
});
} else {
return new Response(JSON.stringify({ ok: false, error: 'CSRF inválido' }), {
status: 403,
headers: { 'Content-Type': 'application/json' },
});
}
}


const id = params.id;
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
} catch (err) {
return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
status: 500,
headers: { 'Content-Type': 'application/json' },
});
}
}
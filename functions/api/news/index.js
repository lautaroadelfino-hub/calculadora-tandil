// filename: functions/api/news/index.js
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


function csrfHeaderMatchesCookie(request) {
const h = request.headers;
const token = h.get('x-csrf') || h.get('x-csrf-token') || h.get('csrf-token');
if (!token) return false;
const ck = parseCookies(request);
const cookieToken = ck['csrf'] || ck['x-csrf'] || ck['XSRF-TOKEN'];
return !!cookieToken && cookieToken === token;
}


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


try {
await verifyCsrf(request);
} catch (e) {
// Fallback: si header coincide con cookie, permitimos
if (csrfHeaderMatchesCookie(request)) {
// ok, seguimos
} else if (e instanceof Response) {
return new Response(JSON.stringify({ ok: false, error: 'CSRF inválido' }), {
}
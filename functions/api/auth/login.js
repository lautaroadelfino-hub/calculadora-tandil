// ===============================
// functions/api/auth/login.js
// ===============================
/* filename=functions/api/auth/login.js */
export async function onRequestPost({ request, env }){
const { verifyPassword, signJWT, setCookie } = await import('../../_lib/auth.js');
const { email, password } = await request.json();
if(!email || !password) return new Response('Missing', { status: 400 });
const user = await env.DB.prepare('select * from users where email = ?').bind(email).first();
if(!user) return new Response('Unauthorized', { status: 401 });
const ok = await verifyPassword(password, user.password_hash);
if(!ok) return new Response('Unauthorized', { status: 401 });
const jwt = await signJWT({ sub: user.id, email: user.email, role: user.role }, env.SESSION_SECRET);
const headers = new Headers({ 'Content-Type': 'application/json' });
setCookie(headers, 'session', jwt, { secure: env.ENV === 'production' });
return new Response(JSON.stringify({ ok: true }), { headers });
}
// ================================
// functions/api/auth/logout.js
// ================================
/* filename=functions/api/auth/logout.js */
export async function onRequestPost({ env }){
const { clearCookie } = await import('../../_lib/auth.js');
const headers = new Headers({ 'Content-Type': 'application/json' });
clearCookie(headers, 'session');
return new Response(JSON.stringify({ ok: true }), { headers });
}
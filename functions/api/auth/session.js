// =================================
// functions/api/auth/session.js
// =================================
/* filename=functions/api/auth/session.js */
export async function onRequestGet({ request, env }){
const { getSessionUser } = await import('../../_lib/auth.js');
const { issueCsrf } = await import('../../_lib/csrf.js');
const headers = new Headers({ 'Content-Type': 'application/json' });
const token = issueCsrf(headers);
const user = await getSessionUser(env, request);
return new Response(JSON.stringify({ user, csrfToken: token }), { headers });
}
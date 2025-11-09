// ==========================
// functions/_lib/csrf.js
// ==========================
/* filename=functions/_lib/csrf.js */
export function issueCsrf(headers){
const token = crypto.randomUUID();
// Cookie HttpOnly + token se devuelve por JSON para header x-csrf
headers.append('Set-Cookie', `csrf=${token}; Path=/; HttpOnly; SameSite=Strict; Secure`);
return token;
}


export function verifyCsrf(request){
const cookie = request.headers.get('Cookie') || '';
const m = /csrf=([^;]+)/.exec(cookie);
const tokenCookie = m?.[1];
const tokenHeader = request.headers.get('x-csrf');
if(!tokenCookie || !tokenHeader || tokenCookie !== tokenHeader) throw new Response('Bad CSRF', { status: 403 });
}
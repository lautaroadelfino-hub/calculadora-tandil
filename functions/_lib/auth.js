// ==========================
// functions/_lib/auth.js
// ==========================
/* filename=functions/_lib/auth.js */
import bcrypt from 'bcryptjs';


const enc = new TextEncoder();


const b64u = (str) => btoa(str).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const abToB64u = (ab) => b64u(String.fromCharCode(...new Uint8Array(ab)));


function b64uToUint8(s){
s = s.replace(/-/g,'+').replace(/_/g,'/');
const pad = s.length % 4; if (pad) s += '='.repeat(4 - pad);
const bin = atob(s); const u8 = new Uint8Array(bin.length);
for(let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
return u8;
}


async function getKey(secret){
return crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign','verify']);
}


export async function signJWT(payload, secret, expSec = 60*60*24*7){
const header = { alg:'HS256', typ:'JWT' };
const now = Math.floor(Date.now()/1000);
const body = { iat: now, exp: now + expSec, ...payload };
const h = b64u(JSON.stringify(header));
const p = b64u(JSON.stringify(body));
const data = `${h}.${p}`;
const key = await getKey(secret);
const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
return `${data}.${abToB64u(sig)}`;
}


export async function verifyJWT(token, secret){
const [h,p,s] = token.split('.');
if(!h||!p||!s) return null;
const key = await getKey(secret);
const ok = await crypto.subtle.verify('HMAC', key, b64uToUint8(s), enc.encode(`${h}.${p}`));
if(!ok) return null;
const json = atob(p.replaceAll('-','+').replaceAll('_','/'));
const payload = JSON.parse(json);
if(!payload.exp || payload.exp < Math.floor(Date.now()/1000)) return null;
return payload;
}


export const hashPassword = async (pw) => bcrypt.hash(pw, 12);
export const verifyPassword = async (pw, hash) => bcrypt.compare(pw, hash);


export function setCookie(headers, name, value, { maxAge=60*60*24*7, secure=true }={}){
const parts = [ `${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict' ];
if(secure) parts.push('Secure');
if(maxAge) parts.push(`Max-Age=${maxAge}`);
headers.append('Set-Cookie', parts.join('; '));
}


export function clearCookie(headers, name){
headers.append('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}


export async function getSessionUser(env, request){
const cookie = request.headers.get('Cookie') || '';
const m = /session=([^;]+)/.exec(cookie);
if(!m) return null;
const payload = await verifyJWT(m[1], env.SESSION_SECRET);
if(!payload) return null;
return { id: payload.sub, email: payload.email, role: payload.role };
}


export function requireAdmin(user){
if(!user || user.role !== 'admin') throw new Response('Unauthorized', { status: 401 });
}
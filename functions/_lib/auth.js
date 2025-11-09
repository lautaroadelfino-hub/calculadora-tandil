// functions/_lib/auth.js
// JWT + cookies + auth (sin dependencias externas)
// Hash de contraseñas con WebCrypto PBKDF2 (SHA-256)

const enc = new TextEncoder();

// --- helpers base64 url-safe ---
const toB64u = (u8) =>
  btoa(String.fromCharCode(...u8)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
const fromB64u = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/"); const pad = s.length % 4; if (pad) s += "=".repeat(4-pad);
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out;
};

const b64uJSON = (obj) => btoa(JSON.stringify(obj)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
const abToU8 = (ab) => new Uint8Array(ab);

// --- JWT HS256 ---
async function getKey(secret){
  return crypto.subtle.importKey("raw", enc.encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign","verify"]);
}
export async function signJWT(payload, secret, expSec = 60*60*24*7){
  const header = { alg:"HS256", typ:"JWT" };
  const now = Math.floor(Date.now()/1000);
  const body = { iat: now, exp: now + expSec, ...payload };
  const h = b64uJSON(header);
  const p = b64uJSON(body);
  const data = `${h}.${p}`;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${toB64u(abToU8(sig))}`;
}
export async function verifyJWT(token, secret){
  const [h,p,s] = token.split(".");
  if(!h||!p||!s) return null;
  const key = await getKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, fromB64u(s), enc.encode(`${h}.${p}`));
  if(!ok) return null;
  const json = atob(p.replaceAll("-","+").replaceAll("_","/"));
  const payload = JSON.parse(json);
  if(!payload.exp || payload.exp < Math.floor(Date.now()/1000)) return null;
  return payload;
}

// --- Cookies ---
export function setCookie(headers, name, value, { maxAge=60*60*24*7, secure=true }={}){
  const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Strict"];
  if (secure) parts.push("Secure");
  if (maxAge) parts.push(`Max-Age=${maxAge}`);
  headers.append("Set-Cookie", parts.join("; "));
}
export function clearCookie(headers, name){
  headers.append("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

// --- Session helpers ---
export async function getSessionUser(env, request){
  const cookie = request.headers.get("Cookie") || "";
  const m = /session=([^;]+)/.exec(cookie);
  if(!m) return null;
  const payload = await verifyJWT(m[1], env.SESSION_SECRET);
  if(!payload) return null;
  return { id: payload.sub, email: payload.email, role: payload.role };
}
export function requireAdmin(user){
  if(!user || user.role !== "admin") throw new Response("Unauthorized", { status: 401 });
}

// --- Password hashing: PBKDF2(SHA-256) ---
const PBKDF2_ITER = 150_000; // costo (subilo si querés más dureza)

export async function hashPassword(password){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name:"PBKDF2", salt, iterations: PBKDF2_ITER, hash:"SHA-256" },
    keyMaterial,
    256
  );
  const hash = new Uint8Array(bits);
  // Formato almacenado: pbkdf2$<iter>$<saltB64u>$<hashB64u>
  return `pbkdf2$${PBKDF2_ITER}$${toB64u(salt)}$${toB64u(hash)}`;
}

export async function verifyPassword(password, stored){
  try{
    const [scheme, iterStr, saltB64, hashB64] = String(stored).split("$");
    if (scheme !== "pbkdf2") return false;
    const iterations = parseInt(iterStr, 10) || PBKDF2_ITER;
    const salt = fromB64u(saltB64);
    const expected = fromB64u(hashB64);

    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name:"PBKDF2", salt, iterations, hash:"SHA-256" },
      keyMaterial,
      256
    );
    const calc = new Uint8Array(bits);
    if (calc.length !== expected.length) return false;
    // comparación en tiempo constante
    let diff = 0; for (let i=0;i<calc.length;i++) diff |= (calc[i] ^ expected[i]);
    return diff === 0;
  }catch{ return false; }
}

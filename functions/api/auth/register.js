// functions/api/auth/register.js
export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) {
      return new Response('D1 binding "DB" no configurado', { status: 500 });
    }

    // Auto-schema mínimo (solo usuarios) para evitar "no such table"
    await env.DB
      .prepare(
        `CREATE TABLE IF NOT EXISTS users (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           email TEXT NOT NULL UNIQUE,
           password_hash TEXT NOT NULL,
           role TEXT NOT NULL DEFAULT 'admin',
           created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
         )`
      )
      .run();

    // Si ya hay algún usuario, cerrar endpoint
    const row = await env.DB.prepare('SELECT COUNT(*) AS c FROM users').first();
    if (row && Number(row.c) > 0) {
      return new Response('Closed', { status: 403 });
    }

    // Body opcional; si no viene, usamos el seed pedido
    const body = await request.json().catch(() => ({}));
    const email = body.email || 'admin@csueldos.com';
    const password = body.password || '1234';

    if (!email || !password) {
      return new Response('Missing email/password', { status: 400 });
    }

    // Hash con WebCrypto PBKDF2 (definido en _lib/auth.js)
    const { hashPassword } = await import('../../_lib/auth.js');
    const hash = await hashPassword(password);

    await env.DB
      .prepare('INSERT INTO users (email, password_hash, role) VALUES (?,?,?)')
      .bind(email, hash, 'admin')
      .run();

    return new Response(JSON.stringify({ ok: true, email }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(`ERR ${e?.message || e}`, { status: 500 });
  }
}

// functions/api/auth/register.js
export async function onRequestPost({ request, env }) {
  // Crea el PRIMER usuario solamente (si la tabla está vacía).
  // Si el body trae { email, password } los usa; si no, usa el seed por defecto.
  const body = await request.json().catch(() => ({}));
  const emailFromBody = body?.email;
  const passwordFromBody = body?.password;

  const count = await env.DB.prepare('select count(*) as c from users').first();
  if (count.c > 0) {
    // Ya existe al menos 1 usuario → endpoint cerrado
    return new Response('Closed', { status: 403 });
  }

  const email = emailFromBody || 'admin@csueldos.com';
  const password = passwordFromBody || '1234';

  const { hashPassword } = await import('../../_lib/auth.js');
  const hash = await hashPassword(password);

  await env.DB
    .prepare('insert into users(email, password_hash, role) values(?,?,?)')
    .bind(email, hash, 'admin')
    .run();

  return new Response(JSON.stringify({ ok: true, email }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
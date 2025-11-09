export async function onRequestPost({ env }) {
  if (!env.DB) return new Response('D1 binding "DB" no configurado', { status: 500 });
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      tag TEXT NOT NULL DEFAULT 'release',
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
    );
  `).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS news_date_idx ON news(date DESC);`).run();
  const c = await env.DB.prepare(`SELECT COUNT(*) AS c FROM news`).first();
  if (!c || Number(c.c) === 0) {
    await env.DB.prepare(`
      INSERT INTO news (date,title,url,tag,published) VALUES
      ('2025-11-08','Cargamos escalas OS 10/2025 y ajustes de título universitario','/novedades#2025-11-08','release',1),
      ('2025-11-05','Acuerdo paritario Obras Sanitarias – Octubre 2025','/acuerdos/os-2025-10','acuerdo',1),
      ('2025-11-02','Aviso: mantenimiento en planilla de datos (02:00–03:00)','/novedades#mantenimiento-2025-11-02','aviso',1);
    `).run();
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

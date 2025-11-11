// functions/api/news/health.js
export async function onRequestGet({ env }) {
  const out = { ok: true, d1_bound: !!env.DB, table_exists: false, row_count: null, error: null };
  try {
    if (!env.DB?.prepare) throw new Error('D1 binding "DB" ausente');

    const t = await env.DB.prepare(
      "select name from sqlite_master where type='table' and name='news'"
    ).first();

    out.table_exists = !!t;

    if (out.table_exists) {
      const c = await env.DB.prepare('select count(*) as c from news').first();
      out.row_count = c?.c ?? 0;
    }
  } catch (e) {
    out.ok = false;
    out.error = String(e?.message || e);
  }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
}

// app/admin/page.jsx
"use client";
import React from "react";

const EMPTY = { date: "", title: "", url: "", tag: "release", published: true };

export default function Admin() {
  const [user, setUser] = React.useState(null);
  const [csrf, setCsrf] = React.useState("");
  const [form, setForm] = React.useState(EMPTY);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/session", { credentials: "include" });
        const d = await r.json();
        if (!d.user) {
          window.location.href = "/login";
          return;
        }
        setUser(d.user);
        setCsrf(d.csrfToken);
      } catch {
        window.location.href = "/login";
      }
    })();
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/news?limit=50", { cache: "no-store" });
      setItems(await r.json());
    } finally {
      setLoading(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf": csrf },
      body: JSON.stringify({ ...form, date: form.date || undefined }),
      credentials: "include",
    });
    if (r.ok) {
      setForm(EMPTY);
      load();
    } else {
      setMsg("No se pudo guardar. Revisá datos/CSRF.");
    }
  }

  async function del(id) {
    if (!confirm("¿Eliminar la novedad?")) return;
    const r = await fetch(`/api/news/${id}`, {
      method: "DELETE",
      headers: { "x-csrf": csrf },
      credentials: "include",
    });
    if (r.ok) load();
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Encabezado: sin botón de salir (queda en AuthNavFloating) */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Panel de noticias</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:block">
            {user?.email}
          </span>
        </div>
      </header>

      {/* Formulario de alta */}
      <form
        onSubmit={save}
        className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 border rounded-xl bg-white/80"
      >
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="md:col-span-2 border rounded px-3 py-2"
        />
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Título"
          className="md:col-span-3 border rounded px-3 py-2"
          required
        />
        <select
          value={form.tag}
          onChange={(e) => setForm({ ...form, tag: e.target.value })}
          className="border rounded px-3 py-2"
        >
          <option value="release">release</option>
          <option value="acuerdo">acuerdo</option>
          <option value="aviso">aviso</option>
        </select>
        <input
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="URL (opcional)"
          className="md:col-span-4 border rounded px-3 py-2"
        />
        <label className="flex items-center gap-2 text-sm md:col-span-1">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          Publicada
        </label>
        <button className="md:col-span-1 bg-slate-800 text-white rounded py-2">
          Guardar
        </button>
        {msg && (
          <div className="md:col-span-6 text-sm text-rose-700">{msg}</div>
        )}
      </form>

      {/* Listado */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Últimas cargadas</h2>
        {loading ? (
          <div className="h-6 bg-slate-100 animate-pulse rounded" />
        ) : (
          <ul className="divide-y">
            {(items || []).map((n) => (
              <li key={n.id} className="py-2 flex items-center gap-3">
                <span className="text-[11px] text-slate-500 w-24">
                  {new Date(n.date + "T00:00:00").toLocaleDateString("es-AR")}
                </span>
                <span className="flex-1">{n.title}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100">
                  {n.tag}
                </span>
                <button
                  onClick={() => del(n.id)}
                  className="text-rose-700 text-sm"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

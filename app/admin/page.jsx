'use client'

import React from 'react'

const EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  title: '',
  url: '',
  tag: 'release',
  published: true,
}

export default function AdminPage() {
  const [user, setUser] = React.useState(null)
  const [csrf, setCsrf] = React.useState('')
  const [form, setForm] = React.useState(EMPTY)
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [msg, setMsg] = React.useState('')
  const [editing, setEditing] = React.useState({}) // id -> partial
  const [savingId, setSavingId] = React.useState(null)
  const [q, setQ] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/auth/session', { credentials: 'include' })
        const d = await r.json()
        if (!d.user) {
          window.location.href = '/login'
          return
        }
        setUser(d.user)
        setCsrf(d.csrfToken || '')
        await load()
      } catch {
        window.location.href = '/login'
      }
    })()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/news/admin?limit=200', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!r.ok) {
        if (r.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(await r.text())
      }
      const j = await r.json()
      setItems(j.data || [])
    } finally {
      setLoading(false)
    }
  }

  const filtered = React.useMemo(() => {
    if (!q) return items
    const s = q.toLowerCase()
    return items.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(s) ||
        (n.tag || '').toLowerCase().includes(s) ||
        (n.url || '').toLowerCase().includes(s)
    )
  }, [items, q])

  async function save(e) {
    e.preventDefault()
    setMsg('')
    try {
      if (!form.title?.trim()) throw new Error('El título es obligatorio')
      const r = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf': csrf },
        body: JSON.stringify({ ...form, date: form.date || undefined }),
        credentials: 'include',
      })
      if (!r.ok) throw new Error(await r.text())
      setForm(EMPTY)
      await load()
    } catch (err) {
      setMsg(String(err?.message || err))
    }
  }

  function startEdit(id) {
    const base = items.find((x) => x.id === id)
    if (!base) return
    setEditing((prev) => ({ ...prev, [id]: { ...base } }))
  }
  function cancelEdit(id) {
    setEditing(({ [id]: _omit, ...rest }) => rest)
  }
  function changeEdit(id, field, value) {
    setEditing((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }))
  }

  async function saveEdit(id) {
    const patch = editing[id]
    if (!patch) return
    const original = items.find((x) => x.id === id)
    if (!original) return
    const body = {}
    for (const k of ['date', 'title', 'url', 'tag']) {
      if (patch[k] !== undefined && patch[k] !== original[k]) body[k] = patch[k]
    }
    if (patch.published !== undefined && patch.published !== original.published) {
      body.published = !!patch.published
    }
    if (Object.keys(body).length === 0) {
      cancelEdit(id)
      return
    }
    try {
      setSavingId(id)
      const r = await fetch(`/api/news/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf': csrf },
        body: JSON.stringify(body),
        credentials: 'include',
      })
      if (!r.ok) throw new Error(await r.text())
      const j = await r.json()
      setItems((prev) => prev.map((x) => (x.id === id ? j.data : x)))
      cancelEdit(id)
    } catch (err) {
      alert(String(err?.message || err))
    } finally {
      setSavingId(null)
    }
  }

  async function delItem(id) {
    if (!confirm('¿Eliminar la novedad?')) return
    const r = await fetch(`/api/news/${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf': csrf },
      credentials: 'include',
    })
    if (r.ok) {
      setItems((prev) => prev.filter((x) => x.id !== id))
      cancelEdit(id)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Panel de noticias</h1>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="w-64 rounded-xl border px-3 py-2"
          />
          <span className="text-xs text-slate-500 hidden sm:block">{user?.email}</span>
        </div>
      </header>

      {/* Crear */}
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
        {msg && <div className="md:col-span-6 text-sm text-rose-700">{msg}</div>}
      </form>

      {/* Listado + edición */}
      <section className="rounded-2xl border overflow-hidden">
        {loading && <div className="p-6 animate-pulse">Cargando…</div>}
        {!loading && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Título</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Tag</th>
                <th className="px-4 py-3 text-left">Publicado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => {
                const isEditing = !!editing[n.id]
                const model = isEditing ? editing[n.id] : n
                return (
                  <tr key={n.id} className="border-t align-top">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <>
                          <input
                            className="w-full rounded-xl border px-3 py-2 mb-2"
                            value={model.title || ''}
                            onChange={(e) => changeEdit(n.id, 'title', e.target.value)}
                          />
                          <input
                            className="w-full rounded-xl border px-3 py-2"
                            value={model.url || ''}
                            onChange={(e) => changeEdit(n.id, 'url', e.target.value)}
                            placeholder="URL opcional"
                          />
                        </>
                      ) : (
                        <div>
                          <div className="font-medium">{n.title}</div>
                          {n.url && (
                            <a href={n.url} className="text-xs text-blue-600 underline break-all">
                              {n.url}
                            </a>
                          )}
                          <div className="text-[11px] text-gray-400 mt-1">
                            id {n.id} · creado {new Date(n.created_at).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="date"
                          className="rounded-xl border px-3 py-2"
                          value={(model.date || '').slice(0, 10)}
                          onChange={(e) => changeEdit(n.id, 'date', e.target.value)}
                        />
                      ) : (
                        <span>{n.date}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          className="rounded-xl border px-3 py-2"
                          value={model.tag || ''}
                          onChange={(e) => changeEdit(n.id, 'tag', e.target.value)}
                        />
                      ) : (
                        <span className="rounded-full border px-2 py-0.5 text-xs">{n.tag}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!model.published}
                            onChange={(e) => changeEdit(n.id, 'published', e.target.checked ? 1 : 0)}
                          />
                          <span>Visible</span>
                        </label>
                      ) : (
                        <span className={n.published ? 'text-green-600' : 'text-gray-400'}>
                          {n.published ? 'Sí' : 'No'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={savingId === n.id}
                            onClick={() => saveEdit(n.id)}
                            className="rounded-xl bg-slate-900 text-white px-3 py-2 disabled:opacity-50"
                          >
                            {savingId === n.id ? 'Guardando…' : 'Guardar'}
                          </button>
                          <button onClick={() => cancelEdit(n.id)} className="rounded-xl border px-3 py-2">
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(n.id)} className="rounded-xl border px-3 py-2">
                            Editar
                          </button>
                          <button
                            onClick={() => delItem(n.id)}
                            className="rounded-xl border px-3 py-2 text-rose-700 hover:bg-rose-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-xs text-gray-400">
        Tip: creás arriba; abajo editás inline → Guardar (sin borrar nada).
      </p>
    </div>
  )
}

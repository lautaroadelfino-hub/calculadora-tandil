// components/AuthNavFloating.jsx
"use client";
import React from "react";

export default function AuthNavFloating() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [signingOut, setSigningOut] = React.useState(false);

  React.useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || "";
    fetch(`${base}/api/auth/session`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : { user: null }))
      .then(d => setUser(d.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = React.useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "";
      await fetch(`${base}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      // ignoramos errores de red
    } finally {
      // redirige sí o sí a inicio y evita volver con "Atrás"
      if (typeof window !== "undefined") window.location.replace("/");
    }
  }, [signingOut]);

  if (loading) return null;

  return (
    <div className="fixed top-2 right-2 sm:top-3 sm:right-3 z-50">
      {user ? (
        <div className="flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border px-2 py-1 shadow-sm">
          <a
            href="/admin"
            className="text-xs rounded-full bg-slate-800 text-white px-3 py-1 hover:bg-slate-900"
          >
            Admin
          </a>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="text-xs rounded-full border px-3 py-1 hover:bg-slate-50 disabled:opacity-60"
          >
            {signingOut ? "Saliendo…" : "Salir"}
          </button>
        </div>
      ) : (
        <a
          href="/login"
          className="text-xs rounded-full bg-slate-800 text-white px-4 py-1.5 shadow-sm hover:bg-slate-900"
        >
          Ingresar
        </a>
      )}
    </div>
  );
}

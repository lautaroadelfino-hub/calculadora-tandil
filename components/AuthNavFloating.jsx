// components/AuthNavFloating.jsx
"use client";
import React from "react";

export default function AuthNavFloating() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || "";
    fetch(`${base}/api/auth/session`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : { user: null }))
      .then(d => setUser(d.user || null))
      .catch(() => setUser(null));
  }, []);

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
          <form method="post" action="/api/auth/logout">
            <button className="text-xs rounded-full border px-3 py-1 hover:bg-slate-50">
              Salir
            </button>
          </form>
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

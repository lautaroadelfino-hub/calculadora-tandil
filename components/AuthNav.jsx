// components/AuthNav.jsx
"use client";
import React from "react";

export default function AuthNav() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || "";
    fetch(`${base}/api/auth/session`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-8 w-24 rounded bg-slate-100 animate-pulse" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-xs text-slate-600 max-w-[160px] truncate">
          {user.email}
        </span>
        <a
          href="/admin"
          className="text-sm rounded-lg bg-slate-800 text-white px-3 py-1 hover:bg-slate-900"
        >
          Admin
        </a>
        <form method="post" action="/api/auth/logout">
          <button className="text-sm rounded-lg border px-3 py-1 hover:bg-slate-50">
            Salir
          </button>
        </form>
      </div>
    );
  }

  return (
    <a
      href="/login"
      className="text-sm rounded-lg bg-slate-800 text-white px-3 py-1 hover:bg-slate-900"
    >
      Ingresar
    </a>
  );
}

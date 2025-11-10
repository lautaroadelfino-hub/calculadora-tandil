// components/AuthNavFloating.jsx
"use client";
import React from "react";
import { useSearchParams } from "next/navigation";

export default function AuthNavFloating() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [signingOut, setSigningOut] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const params = useSearchParams();

  // Cargar sesión (igual que antes)
  React.useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || "";
    fetch(`${base}/api/auth/session`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Abrir con query secreta (?admin=1 o ?panel=auth)
  React.useEffect(() => {
    if (params.get("admin") === "1" || params.get("panel") === "auth") setOpen(true);
  }, [params]);

  // Atajo de teclado: Ctrl/⌘ + Alt + L
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "l") {
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    } catch (_) {
      // ignore
    } finally {
      if (typeof window !== "undefined") window.location.replace("/");
    }
  }, [signingOut]);

  if (loading) return null;

  // Oculto por defecto: sin pointer-events y con opacidad 0
  return (
    <div
      className={`fixed bottom-3 right-3 z-[9999] transition-all duration-200
        ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div className="rounded-2xl bg-gray-900/90 text-white ring-1 ring-white/10 shadow-xl p-2 flex gap-2">
        {user ? (
          <>
            <a href="/admin" className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm">
              Admin
            </a>
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm disabled:opacity-60"
            >
              {signingOut ? "Saliendo…" : "Salir"}
            </button>
          </>
        ) : (
          <a href="/login" className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
            Ingresar
          </a>
        )}
      </div>
    </div>
  );
}

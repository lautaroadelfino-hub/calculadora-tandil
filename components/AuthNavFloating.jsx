// components/AuthNavFloating.jsx
"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthNavFloating() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [signingOut, setSigningOut] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const params = useSearchParams();

  // Sesión de Firebase (la misma que usa /admin y /login)
  React.useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return () => unsubscribe();
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
      await signOut(auth);
    } catch (_) {
      // ignore
    } finally {
      if (typeof window !== "undefined") window.location.replace("/");
    }
  }, [signingOut]);

  if (loading) return null;

  // Cerrada, no se dibuja. Antes quedaba con opacidad 0 y pointer-events none,
  // pero sus botones seguían en el orden de tabulación: las dos primeras
  // paradas del Tab en todo el sitio eran un "Admin" y un "Salir" invisibles
  // (lo encontraron cuatro de las seis personas de la auditoría del 13/9/2026).
  // Se abre igual con Ctrl/⌘ + Alt + L o con ?admin=1.
  if (!open) return null;

  return (
    <div className="fixed bottom-3 right-3 z-[9999] transition-all duration-200">
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

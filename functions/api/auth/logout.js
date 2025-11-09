// lib/doLogout.js
export async function doLogout() {
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
}

"use client";
import { useEffect, useState } from "react";

export default function ParitariasPage() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetch("/api/news") // ajustá si tu endpoint difiere
      .then(r => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Paritarias y Novedades</h1>

      {!items && <div className="animate-pulse h-24 bg-gray-100 rounded-xl" />}

      {items?.length === 0 && (
        <p className="text-gray-600">Todavía no hay novedades publicadas.</p>
      )}

      <ul className="space-y-4">
        {items?.map((n) => (
          <li key={n.id || n._id || n.slug} className="p-4 rounded-xl border bg-white">
            <h2 className="font-semibold text-lg">
              {n.title || n.titulo || "Novedad"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {(n.date || n.createdAt || "").toString().slice(0,10)}
            </p>
            <p className="text-gray-700 mt-2">
              {n.summary || n.descripcion || n.excerpt || "Sin descripción."}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}

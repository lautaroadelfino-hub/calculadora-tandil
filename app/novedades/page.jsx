// app/novedades/page.jsx
import NovedadesList from "../../components/NovedadesList";

export const metadata = { title: "Novedades" };

export default function NovedadesPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 min-h-[calc(100svh-var(--h-header))]">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Novedades</h1>
      {/* Trae hasta 20 (cambiá el número si querés) */}
      <NovedadesList limit={20} endpoint="/api/news" />
    </main>
  );
}

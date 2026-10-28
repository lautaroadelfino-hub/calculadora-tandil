"use client";
// components/admin/Bandeja.jsx
// La Bandeja de /admin, sin Firebase: recibe los borradores que dejó el vigía,
// su estado y las últimas corridas, y los pinta. BandejaTab.jsx es el que lee
// la base. Así se prueba en jsdom (test/ui/bandeja.test.jsx).
//
// Un borrador se publica desde la pestaña que le corresponde ("Abrir" la
// precarga y el dueño usa el botón de publicar de siempre); acá sólo se mira,
// se abre o se descarta.
import { estaAbierto, controlesEnFalso } from "@/lib/vigia/borradores";
import { estadoDelVigia, textoHace } from "@/lib/vigia/bandeja";
import { tituloDePeriodo, periodoActual } from "@/lib/periodos";

const NOMBRE_TIPO = { escala: "Escala", contribuciones: "Contribuciones", ganancias: "Ganancias", acuerdo: "Acuerdo" };
const AMBAR = "text-amber-700 bg-amber-50 border-amber-200";
const ROJO = "text-rose-700 bg-rose-50 border-rose-200";
const Etiqueta = ({ texto, color }) => <span className={`text-[11px] font-bold uppercase rounded px-1.5 border ${color}`}>{texto}</span>;
const Link = ({ href, texto }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline">{texto}</a>
);

export default function Bandeja({
  borradores = [], estado = null, corridas = [], convenios = [], ahora = new Date(), cargando = false, onAbrir, onDescartar,
}) {
  const nombreConvenio = (id) => (convenios.find((c) => c.id === id) || {}).nombre || id;
  const abiertos = borradores.filter(estaAbierto);
  const cerrados = borradores.filter((b) => !estaAbierto(b));
  const mesActual = periodoActual(ahora);
  const vigia = estadoDelVigia(estado, ahora);
  const franja = vigia.nivel === "ok"
    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
    : vigia.nivel === "alerta" ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-slate-50 border-slate-200 text-slate-700";
  const linksDePartes = (b) => Object.entries(b.partes || {})
    .filter(([, p]) => p && p.avisoUrl && p.avisoUrl !== (b.fuente && b.fuente.url))
    .map(([clave, p]) => ({ href: p.avisoUrl, texto: p.norma || clave }));

  return (
    <div className="space-y-6">
      <div role="status" className={`p-4 rounded-xl border text-sm ${franja}`}>
        <b>{abiertos.length} pendiente{abiertos.length === 1 ? "" : "s"}</b> · {vigia.texto}
      </div>

      {cargando ? (
        <p className="text-sm text-gray-400 animate-pulse">Cargando…</p>
      ) : abiertos.length === 0 ? (
        <p className="text-sm text-slate-500">Nada pendiente.</p>
      ) : (
        <ul className="space-y-3">
          {abiertos.map((b) => {
            const malos = controlesEnFalso(b.controles);
            const rojo = Boolean(b.revisa) || b.estado === "requiere_revision";
            return (
              <li key={b.id} className={`border rounded-xl p-4 bg-white ${rojo ? "border-rose-300" : "border-slate-200"}`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-bold text-slate-800">
                    {NOMBRE_TIPO[b.tipo] || b.tipo}{b.convenioId ? ` · ${nombreConvenio(b.convenioId)}` : ""}
                  </span>
                  {b.periodo && <span className="font-mono text-indigo-700">{tituloDePeriodo(b.periodo)}</span>}
                  {b.tipo === "acuerdo" && b.fecha && <span className="font-mono text-indigo-700">{b.fecha}</span>}
                  {b.periodo && b.periodo > mesActual && <Etiqueta texto="mes futuro" color={AMBAR} />}
                  {b.revisa && <Etiqueta texto="revisión de un mes publicado" color={ROJO} />}
                  {!b.revisa && b.estado === "requiere_revision" && <Etiqueta texto="requiere revisión" color={ROJO} />}
                  {b.provisorio && <Etiqueta texto="provisorio" color={AMBAR} />}
                </div>
                <p className="text-sm text-slate-700 mt-1">{b.resumen}</p>
                {b.advertencias && b.advertencias.length > 0 && (
                  <ul className="mt-2 text-xs text-amber-800 list-disc pl-5 space-y-0.5">
                    {b.advertencias.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                )}
                {malos.length > 0 && <p className="text-xs text-rose-700 mt-1">Controles en falso: {malos.join(", ")}</p>}
                <div className="flex flex-wrap gap-3 mt-2 text-xs">
                  {b.fuente && b.fuente.url && <Link href={b.fuente.url} texto={b.fuente.titulo || "Fuente"} />}
                  {linksDePartes(b).map((l) => <Link key={l.href} href={l.href} texto={l.texto} />)}
                  {(b.archivos || []).map((a) => <Link key={a.ruta || a.url} href={a.url} texto={a.nombre || "archivo"} />)}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button type="button" onClick={() => onAbrir(b)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs">
                    Abrir
                  </button>
                  <button type="button" onClick={() => onDescartar(b)} className="text-xs font-bold text-rose-600 hover:text-rose-800">
                    Descartar
                  </button>
                  <span className="text-[11px] text-slate-400 ml-auto">
                    preparado {textoHace(b.creadoEl, ahora)}
                    {b.actualizadoEl && b.actualizadoEl !== b.creadoEl ? `, actualizado ${textoHace(b.actualizadoEl, ahora)}` : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {cerrados.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-slate-600">Historial ({cerrados.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {cerrados.slice(0, 30).map((b) => (
              <li key={b.id}>
                <span className="font-mono">{b.id}</span> · {b.estado}
                {b.publicadoEl ? ` el ${String(b.publicadoEl).slice(0, 10)}` : b.descartadoEl ? ` el ${String(b.descartadoEl).slice(0, 10)}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}

      {corridas.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-slate-600">Últimas corridas ({corridas.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {corridas.map((c) => (
              <li key={c.id}>
                <span className="font-mono">{c.id}</span> · {c.modo}
                {" · "}
                {Object.entries(c.fuentes || {}).map(([n, f]) => `${n}: ${f.estado}${f.error ? ` (${f.error})` : ""}`).join(", ") || "sin fuentes"}
                {" · "}{(c.borradores || []).length} borrador(es)
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

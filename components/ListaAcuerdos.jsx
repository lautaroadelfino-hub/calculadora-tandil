// components/ListaAcuerdos.jsx
// La lista de acuerdos de un convenio: fecha, tipo, título, vigencia y los
// links para bajar el archivo y ver la fuente. Componente de servidor; la
// usan /acuerdos y /acuerdos/<convenio>.
import { fechaLarga } from "@/lib/fechas";
import { etiquetaDeTipo, etiquetaDeFormato } from "@/lib/acuerdosPublicados";

const CHIP_DE_TIPO = {
  escala: "bg-emerald-50 text-emerald-800",
  acuerdo: "bg-sky-50 text-sky-800",
  homologacion: "bg-violet-50 text-violet-800",
  otro: "bg-slate-100 text-slate-700",
};

export default function ListaAcuerdos({ acuerdos }) {
  return (
    <ul className="space-y-3">
      {acuerdos.map((a) => {
        const formato = etiquetaDeFormato(a.archivoTipo);
        return (
          <li key={a.id} className="rounded-xl border border-slate-200 bg-white/80 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{fechaLarga(a.fecha)}</span>
              <span className={`rounded-md px-2 py-0.5 font-medium ${CHIP_DE_TIPO[a.tipo] || CHIP_DE_TIPO.otro}`}>
                {etiquetaDeTipo(a.tipo)}
              </span>
              {a.vigencia ? <span className="[overflow-wrap:anywhere]">Vigencia: {a.vigencia}</span> : null}
            </div>
            <h3 className="mt-1 text-base font-semibold text-slate-900 [overflow-wrap:anywhere]">{a.titulo}</h3>
            {a.archivoUrl || a.fuenteUrl ? (
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {a.archivoUrl ? (
                  // Abre en otra pestaña y el navegador decide si muestra o
                  // guarda: el atributo `download` no funciona con un archivo
                  // de otro dominio (Storage).
                  <a
                    href={a.archivoUrl}
                    target="_blank"
                    rel="noopener"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  >
                    Descargar{formato ? ` ${formato}` : ""}
                  </a>
                ) : null}
                {a.fuenteUrl ? (
                  <a
                    href={a.fuenteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  >
                    Fuente
                  </a>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

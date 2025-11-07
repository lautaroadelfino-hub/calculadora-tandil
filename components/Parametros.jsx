"use client";
import React from "react";

export default function Parametros({
  sector, setSector,
  subRegimen, setSubRegimen,
  categoria, setCategoria,
  mes, setMes,
  mesesDisponibles, categoriasDisponibles,
  aniosAntiguedad, setAniosAntiguedad,
  regimen, setRegimen,
  titulo, setTitulo,
  funcion, setFuncion,
  horas50, setHoras50,
  horas100, setHoras100,
  descuentosExtras, setDescuentosExtras,
  noRemunerativo, setNoRemunerativo,
}) {
  const Btn = ({ active, children, onClick }) => (
    <button
      onClick={onClick}
      type="button"
      className={[
        "px-3 py-1.5 rounded-full text-sm border transition",
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
          : "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-700"
      ].join(" ")}
    >
      {children}
    </button>
  );

  const Field = ({ label, children }) => (
    <label className="block">
      <span className="block text-sm font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );

  const Input = (props) => (
    <input
      {...props}
      className={
        "w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 " +
        "bg-white/80 backdrop-blur placeholder-slate-400 border px-3 py-2 outline-none transition"
      }
    />
  );

  const Select = (props) => (
    <select
      {...props}
      className={
        "w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 " +
        "bg-white/80 backdrop-blur border px-3 py-2 outline-none transition"
      }
    />
  );

  const reset = () => {
    setCategoria(categoriasDisponibles?.[0] ?? "");
    setAniosAntiguedad(0);
    setRegimen(sector === "publico" ? "35" : "48");
    setTitulo("ninguno");
    setFuncion(0);
    setHoras50(0);
    setHoras100(0);
    setDescuentosExtras(0);
    setNoRemunerativo(0);
  };

  return (
    <section className="glass-card p-5 rounded-2xl shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Parámetros</h2>

      {/* Sector */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Sector</span>
        </div>
        <div className="flex gap-2">
          <Btn active={sector === "publico"} onClick={() => setSector("publico")}>Público</Btn>
          <Btn active={sector === "privado"} onClick={() => setSector("privado")}>Privado</Btn>
        </div>
      </div>

      {/* Sub-régimen (solo público) */}
      {sector === "publico" && (
        <div className="mb-4">
          <span className="block text-sm font-medium text-slate-600 mb-2">Sub-régimen</span>
          <div className="flex flex-wrap gap-2">
            <Btn active={subRegimen === "administracion"} onClick={() => setSubRegimen("administracion")}>Administración</Btn>
            <Btn active={subRegimen === "sisp"} onClick={() => setSubRegimen("sisp")}>SISP</Btn>
            <Btn active={subRegimen === "obras"} onClick={() => setSubRegimen("obras")}>Obras Sanitarias</Btn>
          </div>
        </div>
      )}

      {/* Mes y Categoría */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Field label="Mes">
          <Select value={mes} onChange={(e) => setMes(e.target.value)}>
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>{formatMes(m)}</option>
            ))}
          </Select>
        </Field>

        <Field label="Categoría">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {categoriasDisponibles.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Antigüedad y Régimen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Field label="Años de antigüedad">
          <Input
            type="number"
            min={0}
            value={aniosAntiguedad}
            onChange={(e) => setAniosAntiguedad(Number(e.target.value || 0))}
            placeholder="0"
          />
        </Field>

        {sector === "publico" ? (
          <Field label="Régimen horario semanal">
            <div className="flex gap-2">
              <Btn active={regimen === "35"} onClick={() => setRegimen("35")}>35 hs</Btn>
              <Btn active={regimen === "40"} onClick={() => setRegimen("40")}>40 hs</Btn>
              <Btn active={regimen === "48"} onClick={() => setRegimen("48")}>48 hs</Btn>
            </div>
          </Field>
        ) : (
          <Field label="Régimen horario semanal">
            <Input disabled value="48 hs (fijo comercio)" />
          </Field>
        )}
      </div>

      {/* Título y Función */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Field label="Adicional por título">
          <Select value={titulo} onChange={(e) => setTitulo(e.target.value)}>
            <option value="ninguno">Sin título</option>
            <option value="terciario">Técnico/Terciario — 15%</option>
            <option value="universitario">Universitario/Posgrado — 20%</option>
          </Select>
        </Field>

        <Field label="Bonificación por función (%)">
          <Input
            type="number"
            min={0}
            value={funcion}
            onChange={(e) => setFuncion(Number(e.target.value || 0))}
            placeholder="0"
          />
        </Field>
      </div>

      {/* Horas extra */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Field label="Horas extras al 50%">
          <Input
            type="number"
            min={0}
            value={horas50}
            onChange={(e) => setHoras50(Number(e.target.value || 0))}
            placeholder="0"
          />
        </Field>
        <Field label="Horas extras al 100%">
          <Input
            type="number"
            min={0}
            value={horas100}
            onChange={(e) => setHoras100(Number(e.target.value || 0))}
            placeholder="0"
          />
        </Field>
      </div>

      {/* Otros campos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Descuentos adicionales ($)">
          <Input
            type="number"
            min={0}
            value={descuentosExtras}
            onChange={(e) => setDescuentosExtras(Number(e.target.value || 0))}
            placeholder="0"
          />
        </Field>

        <Field label="No remunerativo / productividad ($)">
          <Input
            type="number"
            min={0}
            value={noRemunerativo}
            onChange={(e) => setNoRemunerativo(Number(e.target.value || 0))}
            placeholder="0"
          />
        </Field>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="w-full py-2.5 rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition"
        >
          Limpiar formulario
        </button>
      </div>
    </section>
  );
}

function formatMes(key) {
  try {
    if (!key) return "";
    const [y, m] = String(key).split("-");
    const norm = `${String(y).padStart(4,"0")}-${String(m||"01").padStart(2,"0")}`;
    const d = new Date(`${norm}-01T00:00:00`);
    return isNaN(d.getTime())
      ? key
      : d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  } catch { return key; }
}

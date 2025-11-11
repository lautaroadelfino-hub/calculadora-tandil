"use client";
import React, { useEffect, useState, useCallback } from "react";

// Input numérico “suave”: no pierde foco mientras tipeás.
// Confirma al salir del campo o con Enter.
function NumericInput({ value, onCommit, placeholder = "0", min, step, ...rest }) {
  const [txt, setTxt] = useState(String(value ?? ""));

  useEffect(() => {
    setTxt(String(value ?? ""));
  }, [value]);

  const commit = useCallback(() => {
    const n = parseFloat(String(txt).replace(",", "."));
    const safe = Number.isFinite(n) ? n : 0;
    if (typeof min === "number" && safe < min) {
      onCommit(min);
      setTxt(String(min));
    } else {
      onCommit(safe);
      setTxt(String(safe));
    }
  }, [txt, onCommit, min]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={txt}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      placeholder={placeholder}
      {...rest}
      className={
        "w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 " +
        "bg-white/80 backdrop-blur placeholder-slate-400 border px-3 py-2 outline-none transition " +
        (rest.className || "")
      }
    />
  );
}

export default function Parametros({
  // nuevo orden y props extra
  sector, setSector,
  convenio, setConvenio,
  subRegimen, setSubRegimen,

  mes, setMes,
  mesesDisponibles,
  categoria, setCategoria,
  categoriasDisponibles,

  aniosAntiguedad, setAniosAntiguedad,
  regimen, setRegimen,
  titulo, setTitulo,
  funcion, setFuncion,
  horas50, setHoras50,
  horas100, setHoras100,
  descuentosExtras, setDescuentosExtras,
  noRemunerativo, setNoRemunerativo,

  // >>> Vacaciones (nuevas)
  vacacionesOn, setVacacionesOn,
  vacDiasTrabajados, setVacDiasTrabajados,
  vacDiasManual, setVacDiasManual,
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
    // >>> limpiar vacaciones
    setVacacionesOn(false);
    setVacDiasTrabajados(0);
    setVacDiasManual(0);
  };

  return (
    <section className="glass-card p-5 rounded-2xl shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Parámetros</h2>

      {/* 1) Sector */}
      <div className="mb-4">
        <span className="text-sm font-medium text-slate-600 mb-2 block">Sector</span>
        <div className="flex gap-2">
          <Btn active={sector === "publico"} onClick={() => setSector("publico")}>Público</Btn>
          <Btn active={sector === "privado"} onClick={() => setSector("privado")}>Privado</Btn>
        </div>
      </div>

      {/* 2) Convenio (depende del sector) */}
      <div className="mb-4">
        <Field label="Convenio">
          <Select
            value={convenio}
            onChange={(e) => setConvenio(e.target.value)}
          >
            {sector === "publico" ? (
              <option value="municipalidad">Municipalidad de Tandil</option>
            ) : (
              <option value="comercio">Empleados de Comercio (CCT 130/75)</option>
            )}
          </Select>
        </Field>
      </div>

      {/* 3) Sub-régimen (solo si Público + Municipalidad) */}
      {sector === "publico" && convenio === "municipalidad" && (
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
          <NumericInput value={aniosAntiguedad} onCommit={setAniosAntiguedad} placeholder="0" min={0} />
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
            {/* ✅ COMERCIO: desbloqueado, seleccionable */}
            <Select
              value={regimen}
              onChange={(e) => setRegimen(e.target.value)}
            >
              {[12, 18, 20, 24, 30, 36, 40, 44, 48].map((h) => (
                <option key={h} value={String(h)}>{h} hs</option>
              ))}
            </Select>
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
          <NumericInput value={funcion} onCommit={setFuncion} placeholder="0" min={0} />
        </Field>
      </div>

      {/* Horas extra */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Field label="Horas extras al 50%">
          <NumericInput value={horas50} onCommit={setHoras50} placeholder="0" min={0} />
        </Field>
        <Field label="Horas extras al 100%">
          <NumericInput value={horas100} onCommit={setHoras100} placeholder="0" min={0} />
        </Field>
      </div>

      {/* Otros campos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Descuentos adicionales ($)">
          <NumericInput value={descuentosExtras} onCommit={setDescuentosExtras} placeholder="0" min={0} />
        </Field>

        <Field label="No remunerativo / productividad ($)">
          <NumericInput value={noRemunerativo} onCommit={setNoRemunerativo} placeholder="0" min={0} />
        </Field>
      </div>

      {/* >>> Vacaciones (solo Comercio) */}
      {sector === "privado" && convenio === "comercio" && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-600"
              checked={!!vacacionesOn}
              onChange={(e) => setVacacionesOn(e.target.checked)}
            />
            <span className="text-sm font-medium text-emerald-900">
              Liquidar vacaciones (base 25)
            </span>
          </label>

          {vacacionesOn && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Si antigüedad < 6 meses → días trabajados */}
              {Number(aniosAntiguedad) < 0.5 && (
                <Field label="Días trabajados (1 cada 20)">
                  <NumericInput
                    value={vacDiasTrabajados}
                    onCommit={setVacDiasTrabajados}
                    placeholder="0"
                    min={0}
                    step={1}
                  />
                </Field>
              )}

              {/* Override opcional de días */}
              <Field label="Días de vacaciones (opcional)">
                <NumericInput
                  value={vacDiasManual}
                  onCommit={setVacDiasManual}
                  placeholder="0"
                  min={0}
                  step={1}
                />
                <span className="block mt-1 text-[11px] text-emerald-700/90">
                  Automático: 14 / 21 / 28 / 35 según antigüedad. Si cargás un valor &gt; 0, se usa ese.
                </span>
              </Field>
            </div>
          )}
        </div>
      )}

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

"use client";
import React from "react";

export default function Parametros({
  sector,
  setSector,
  convenio,
  setConvenio,
  subRegimen,
  setSubRegimen,
  categoria,
  setCategoria,
  mes,
  setMes,
  mesesDisponibles,
  categoriasDisponibles,
  aniosAntiguedad,
  setAniosAntiguedad,
  regimen,
  setRegimen,
  titulo,
  setTitulo,
  funcion,
  setFuncion,
  horas50,
  setHoras50,
  horas100,
  setHoras100,
  descuentosExtras,
  setDescuentosExtras,
  noRemunerativo,
  setNoRemunerativo
}) {
  const onFocusZero = (e) => e.target.value === "0" && (e.target.value = "");
  const onBlurZero = (e, setter) =>
    (e.target.value === "" || e.target.value === null) && setter(0);

  return (
    <section className="bg-white p-5 rounded-xl shadow">
      <h2 className="font-semibold mb-4 text-lg">Parámetros</h2>

      {/* SECTOR */}
      <label className="block text-sm font-medium">Sector</label>
      <select
        className="w-full p-2 border rounded mb-3"
        value={sector}
        onChange={(e) => setSector(e.target.value)}
      >
        <option value="publico">Público</option>
        <option value="privado">Privado</option>
      </select>

      {/* SUBRÉGIMEN (solo público) */}
      {sector === "publico" && (
        <>
          <label className="block text-sm font-medium">Sub-régimen</label>
          <select
            className="w-full p-2 border rounded mb-3"
            value={subRegimen}
            onChange={(e) => setSubRegimen(e.target.value)}
          >
            <option value="administracion">Administración Central</option>
            <option value="sisp">SISP</option>
            <option value="obras">Obras Sanitarias</option>
          </select>
        </>
      )}

      {/* MES */}
      {mesesDisponibles.length > 0 && (
        <>
          <label className="block text-sm font-medium">Mes</label>
          <select
            className="w-full p-2 border rounded mb-3"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          >
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </>
      )}

      {/* CATEGORÍA */}
      <label className="block text-sm font-medium">Categoría</label>
      <select
        className="w-full p-2 border rounded mb-3"
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
      >
        {categoriasDisponibles.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* ANTIGÜEDAD */}
      <label className="block text-sm font-medium">Años de antigüedad</label>
      <input
        type="number"
        className="w-full p-2 border rounded mb-3"
        value={aniosAntiguedad}
        onFocus={onFocusZero}
        onBlur={(e) => onBlurZero(e, setAniosAntiguedad)}
        onChange={(e) => setAniosAntiguedad(Number(e.target.value))}
      />

      {/* REGIMEN HORARIO (solo público) */}
      {sector === "publico" && (
        <>
          <label className="block text-sm font-medium">Régimen horario semanal</label>
          <select
            className="w-full p-2 border rounded mb-3"
            value={regimen}
            onChange={(e) => setRegimen(e.target.value)}
          >
            <option value="35">35 hs</option>
            <option value="40">40 hs</option>
            <option value="48">48 hs</option>
          </select>
        </>
      )}

      {/* TÍTULO */}
      <label className="block text-sm font-medium">Adicional por título</label>
      <select
        className="w-full p-2 border rounded mb-3"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      >
        <option value="ninguno">Sin título</option>
        <option value="terciario">Terciario / Técnico (15%)</option>
        <option value="universitario">Universitario / Posgrado (20%)</option>
      </select>

      {/* FUNCIÓN */}
      <label className="block text-sm font-medium">Bonificación por función (%)</label>
      <input
        type="number"
        className="w-full p-2 border rounded mb-3"
        value={funcion}
        onFocus={onFocusZero}
        onBlur={(e) => onBlurZero(e, setFuncion)}
        onChange={(e) => setFuncion(Number(e.target.value))}
      />

      {/* HORAS EXTRAS */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Horas 50%</label>
          <input
            type="number"
            className="w-full p-2 border rounded mb-3"
            value={horas50}
            onFocus={onFocusZero}
            onBlur={(e) => onBlurZero(e, setHoras50)}
            onChange={(e) => setHoras50(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Horas 100%</label>
          <input
            type="number"
            className="w-full p-2 border rounded mb-3"
            value={horas100}
            onFocus={onFocusZero}
            onBlur={(e) => onBlurZero(e, setHoras100)}
            onChange={(e) => setHoras100(Number(e.target.value))}
          />
        </div>
      </div>

      {/* DESCUENTOS + NR */}
      <label className="block text-sm font-medium">Descuentos adicionales ($)</label>
      <input
        type="number"
        className="w-full p-2 border rounded mb-3"
        value={descuentosExtras}
        onFocus={onFocusZero}
        onBlur={(e) => onBlurZero(e, setDescuentosExtras)}
        onChange={(e) => setDescuentosExtras(Number(e.target.value))}
      />

      <label className="block text-sm font-medium">No remunerativo / Productividad ($)</label>
      <input
        type="number"
        className="w-full p-2 border rounded mb-3"
        value={noRemunerativo}
        onFocus={onFocusZero}
        onBlur={(e) => onBlurZero(e, setNoRemunerativo)}
        onChange={(e) => setNoRemunerativo(Number(e.target.value))}
      />
    </section>
  );
}

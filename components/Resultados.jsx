"use client";
import React from "react";

export default function Resultados({
  r,
  money
}) {
  if (!r) return <p className="text-slate-700">Complete los parámetros para ver el resultado.</p>;

  return (
    <section className="bg-white p-5 rounded-xl shadow">
      <h2 className="font-semibold mb-4 text-lg">Resultado</h2>

      <div className="space-y-1">
        <p><b>Básico:</b> ${money(r.basico)}</p>
        <p><b>Antigüedad:</b> ${money(r.antiguedadPesos)}</p>
        <p><b>Presentismo:</b> ${money(r.presentismoPesos)}</p>
        <p><b>Título:</b> ${money(r.adicionalTitulo)}</p>
        <p><b>Función:</b> ${money(r.adicionalFuncion)}</p>
        <p><b>Horas 50%:</b> ${money(r.horasExtras50)}</p>
        <p><b>Horas 100%:</b> ${money(r.horasExtras100)}</p>

        <p className="font-semibold text-slate-800 mt-2">
          Total remunerativo: ${money(r.totalRemunerativo)}
        </p>
        <p className="font-semibold text-slate-800">
          Total no remunerativo: ${money(r.totalNoRemunerativo)}
        </p>
        <p className="font-semibold text-red-700">
          Total deducciones: ${money(r.totalDeducciones)}
        </p>

        <hr className="my-3" />
        <p className="text-xl font-bold text-green-700">
          Líquido a cobrar: ${money(r.liquido)}
        </p>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { procesarRecibo } from "@/lib/motorLiquidacion";
import { valoresIniciales } from "@/lib/inputsIniciales";
import { elegirPeriodo, nombreDePeriodo } from "@/lib/periodos";
import { TIPOS_DE_LINEA } from "@/lib/vocabularioConvenios";
import { regimenPredeterminado } from "@/lib/contribucionesForm";
import { normalizarEntradas, etiquetaDeCampo } from "@/lib/validacionEntradas";
import { explicarLinea } from "@/lib/explicarLinea";

export const runtime = 'edge';

/**
 * Trae, de una colección de tablas por período (parametros_ganancias,
 * parametros_contribuciones), la que corresponde al mes pedido: la exacta si
 * está, y si no la más reciente anterior. Devuelve también de qué período
 * salió, porque cuando no es el pedido hay que decirlo en pantalla.
 */
async function traerTablaDelPeriodo(coleccion, periodo) {
  const exacta = await getDoc(doc(db, coleccion, periodo));
  if (exacta.exists()) return { periodo, datos: exacta.data(), exacto: true };

  const todas = await getDocs(collection(db, coleccion));
  const porId = {};
  todas.forEach((d) => { porId[d.id] = d.data(); });
  const eleccion = elegirPeriodo(Object.keys(porId), periodo);
  return {
    periodo: eleccion.periodo,
    datos: eleccion.periodo ? porId[eleccion.periodo] : null,
    exacto: false,
  };
}

const money = (n) =>
  "$" + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 0.1077 -> "10,77%" */
const pct = (fraccion) =>
  (Number(fraccion || 0) * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";

/** 36.5 -> "36,5" */
const num = (n) => Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });

/** La frase de "de dónde sale" debajo de una línea del recibo, si la línea trae la cuenta. */
const Explicacion = ({ linea }) => {
  const texto = explicarLinea(linea);
  return texto ? <span className="block text-[11px] text-slate-500 font-normal">{texto}</span> : null;
};

export default function CalculadoraDinamica() {
  const { convenioId } = useParams();

  // Estados de datos
  const [convenio, setConvenio] = useState(null);
  const [periodosDisponibles, setPeriodosDisponibles] = useState([]);

  // Estados de interfaz
  const [cargando, setCargando] = useState(true);
  const [valoresUsuario, setValoresUsuario] = useState({});
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("");
  const [resultadoLiquidacion, setResultadoLiquidacion] = useState(null);
  // Con qué datos se armó el recibo que está en pantalla. Se guardan aparte
  // porque la persona puede seguir tocando el formulario después de calcular.
  const [entradasUsadas, setEntradasUsadas] = useState(null);
  const [periodoUsado, setPeriodoUsado] = useState("");
  // Errores de carga, por campo, y el error del cálculo si lo hubo. Antes eran
  // alert(): cuadros que congelaban la página y no decían qué campo era; y el
  // navegador frenaba solo, sin mensaje, un 36,5 en horas semanales.
  const [errores, setErrores] = useState({});
  const [errorCalculo, setErrorCalculo] = useState(null);
  const formRef = useRef(null);
  // De qué período salieron las tablas de Ganancias que se usaron. Si no
  // coincide con el mes liquidado hay que decirlo: la escala del impuesto
  // cambia por semestre, así que usar la de otro semestre da un número que
  // no es el que corresponde, y hasta ahora eso pasaba sin ningún aviso.
  const [periodoGanancias, setPeriodoGanancias] = useState(null);
  // La tabla de contribuciones patronales del período (art. 140 inc. j) LCT).
  // undefined = todavía no se buscó; null = se buscó y no hay.
  const [tablaContribuciones, setTablaContribuciones] = useState(undefined);
  const [periodoContribuciones, setPeriodoContribuciones] = useState(null);

  useEffect(() => {
    async function inicializarCalculadora() {
      if (!convenioId) return;
      try {
        // 1. Traemos las reglas del Convenio
        const docRef = doc(db, "convenios", convenioId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setConvenio(data);

          // Preparamos los inputs por defecto. valoresIniciales() se encarga de
          // que un select cuyo "default" no esté entre sus "opciones" arranque
          // en la primera opción (la que el navegador muestra elegida), en vez
          // de guardar un valor que el motor después no va a poder resolver.
          //
          // La ART arranca en la alícuota típica que el convenio declara (en
          // fracción; acá se muestra en %). Si no declara ninguna, queda vacía
          // y el recibo lo avisa: no se inventa un 3%.
          const artTipica = data.reglas_calculo?.art?.alicuota_tipica;
          setValoresUsuario({
            ...valoresIniciales(data.inputs_requeridos),
            art_alicuota: artTipica != null ? +(Number(artTipica) * 100).toFixed(4) : "",
            art_suma_fija: 0,
          });

          // 2. Traemos todos los períodos (escalas) cargados para este convenio
          const escalasRef = collection(db, "convenios", convenioId, "escalas");
          const escalasSnap = await getDocs(escalasRef);

          const periodos = [];
          escalasSnap.forEach(escala => {
            periodos.push({
              id: escala.id,
              nombre: escala.data().mes_vigencia
            });
          });

          // Ordenamos los períodos (los más nuevos arriba)
          periodos.sort((a, b) => b.id.localeCompare(a.id));
          setPeriodosDisponibles(periodos);

          // Seleccionamos el último período por defecto
          if (periodos.length > 0) {
            setPeriodoSeleccionado(periodos[0].id);
          }
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setCargando(false);
      }
    }
    inicializarCalculadora();
  }, [convenioId]);

  // La tabla de contribuciones se busca al elegir el período, y no al calcular,
  // porque el desplegable de régimen sale de ella.
  useEffect(() => {
    if (!periodoSeleccionado) return;
    let vigente = true;
    (async () => {
      try {
        const tabla = await traerTablaDelPeriodo("parametros_contribuciones", periodoSeleccionado);
        if (!vigente) return;
        setTablaContribuciones(tabla.datos);
        setPeriodoContribuciones(tabla.periodo);
        // El régimen por defecto es el que la tabla marca, salvo que la persona
        // ya haya elegido uno que siga existiendo.
        const predeterminado = tabla.datos ? regimenPredeterminado(tabla.datos) : null;
        setValoresUsuario((prev) => {
          const elegido = prev.regimen_contribuciones;
          const sigueExistiendo = elegido && tabla.datos?.regimenes?.[elegido];
          return { ...prev, regimen_contribuciones: sigueExistiendo ? elegido : predeterminado || "" };
        });
      } catch (err) {
        console.warn("No se pudo cargar la tabla de contribuciones:", err);
        if (vigente) {
          setTablaContribuciones(null);
          setPeriodoContribuciones(null);
        }
      }
    })();
    return () => { vigente = false; };
  }, [periodoSeleccionado]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Los numéricos se guardan tal como se escriben ("36,5") y se convierten
    // al calcular, con normalizarEntradas: así coma y punto valen igual y un
    // valor inválido se explica en vez de dejar el botón mudo. Un número
    // borrado queda vacío: para la ART, vacío significa "no la sé".
    setValoresUsuario((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrores((prev) => {
      if (!prev[name]) return prev;
      const sinEste = { ...prev };
      delete sinEste[name];
      return sinEste;
    });
  };

  const simularLiquidacion = async (e) => {
    e.preventDefault();
    setErrorCalculo(null);

    // Primero se revisa lo cargado. Si algo no sirve, se dice cuál campo y por
    // qué, y el foco va al primero: nunca más un botón que no hace nada.
    const revision = normalizarEntradas(convenio, valoresUsuario, periodoSeleccionado);
    setErrores(revision.errores);
    if (revision.hayErrores) {
      const primero = Object.keys(revision.errores)[0];
      document.getElementById(primero)?.focus();
      return;
    }

    try {
      // Buscamos los montos en pesos específicos del mes que eligió el usuario
      const escalaRef = doc(db, "convenios", convenioId, "escalas", periodoSeleccionado);
      const escalaSnap = await getDoc(escalaRef);

      if (!escalaSnap.exists()) {
        setErrorCalculo(`No están cargados los importes de ${nombreDePeriodo(periodoSeleccionado)} para este convenio. Elegí otro período.`);
        return;
      }

      // Los parámetros de Ganancias del período, o los del más reciente
      // anterior. Si no hay ninguno cargado, el motor no calcula el impuesto.
      // Los administra el dueño desde /admin.
      let paramsGanancias = null;
      try {
        const tabla = await traerTablaDelPeriodo("parametros_ganancias", periodoSeleccionado);
        paramsGanancias = tabla.datos;
        setPeriodoGanancias(tabla.periodo);
      } catch (err) {
        console.warn("No se pudieron cargar parámetros de Ganancias:", err);
      }

      // Enviamos las reglas, los montos y lo que cargó el usuario a nuestro Motor ciego
      const reciboArmado = procesarRecibo(convenio, escalaSnap.data(), revision.valores, paramsGanancias, {
        periodo: periodoSeleccionado,
        // null y no undefined: la pantalla la buscó. Si no hay, el motor avisa.
        tablaContribuciones: tablaContribuciones === undefined ? null : tablaContribuciones,
        periodoContribuciones,
      });
      setResultadoLiquidacion(reciboArmado);
      setEntradasUsadas({ ...valoresUsuario });
      setPeriodoUsado(periodoSeleccionado);

    } catch (error) {
      setErrorCalculo(error.message);
    }
  };

  if (cargando) return <div className="p-10 text-center mt-20 text-gray-500 font-medium animate-pulse">Cargando las escalas del convenio…</div>;
  if (!convenio) return <div className="p-10 text-center mt-20 text-red-500 font-bold">Convenio no encontrado.</div>;

  const inputBase =
    "border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors";

  // Agrupamos las líneas del recibo para mostrarlas como un recibo real.
  const lineas = resultadoLiquidacion?.detalle || [];
  const porTipo = (tipo) => lineas.filter((l) => l.tipo === tipo);
  const remunerativos = porTipo("remunerativo");
  const noRemunerativos = porTipo("no_remunerativo");
  const retenciones = porTipo("retencion");
  const contribuciones = porTipo("contribucion");
  // Lo que el motor produjo y esta pantalla no sabe dibujar. Antes se filtraba
  // por tres tipos sin `else` y una línea de otro tipo desaparecía en silencio.
  const desconocidas = lineas.filter((l) => !TIPOS_DE_LINEA.includes(l.tipo));
  const empleador = resultadoLiquidacion?.costoEmpleador || null;
  const metodo = resultadoLiquidacion?.metodo || null;
  const artTipicaDelConvenio = convenio.reglas_calculo?.art?.alicuota_tipica;
  // El recibo dice el período CON EL QUE SE CALCULÓ, no el que está elegido
  // ahora en el desplegable: antes el título cambiaba de mes y los importes no.
  const periodoUsadoNombre = periodosDisponibles.find((p) => p.id === periodoUsado)?.nombre || nombreDePeriodo(periodoUsado);
  // ¿La persona tocó algo después de calcular? Entonces el recibo en pantalla
  // ya no corresponde a lo que dice el formulario, y hay que decirlo.
  const desactualizado =
    Boolean(resultadoLiquidacion) &&
    (periodoUsado !== periodoSeleccionado ||
      Object.keys({ ...(entradasUsadas || {}), ...valoresUsuario }).some(
        (k) => String(entradasUsadas?.[k] ?? "") !== String(valoresUsuario[k] ?? "")
      ));
  const hayErrores = Object.keys(errores).length > 0;
  // Lo que quedó marcado en el formulario y suma plata (asistencia perfecta,
  // larga distancia): se lista entre los supuestos para que no pase callado.
  const supuestos = (convenio.inputs_requeridos || [])
    .filter((i) => i.tipo === "boolean" && (i.origen === "adicional" || i.origen === "por_unidad") && entradasUsadas?.[i.id])
    .map((i) => i.label.replace(/[¿?]/g, "").trim());
  const claseCampo = (id, extra = "") =>
    `${inputBase} ${extra} ${errores[id] ? "border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-100" : ""}`;
  const mensajeError = (id) =>
    errores[id] ? <span id={`${id}-error`} className="text-[11px] text-rose-700 mt-1">{errores[id]}</span> : null;
  // Un campo numérico es un campo de texto con teclado decimal: acepta "36,5"
  // y "36.5", y no deja que el navegador frene el envío sin explicar por qué.
  const campoNumero = (id, extra = "w-full") => (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      name={id}
      value={valoresUsuario[id] ?? ""}
      onChange={handleChange}
      aria-invalid={errores[id] ? "true" : undefined}
      aria-describedby={errores[id] ? `${id}-error` : undefined}
      className={claseCampo(id, extra)}
    />
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-100 via-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 mb-16">

        {/* ENCABEZADO DEL CONVENIO */}
        <header className="mb-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-[11px] font-semibold text-emerald-900 uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Calculadora de sueldos
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{convenio.nombre}</h1>
          <p className="text-sm text-slate-500 mt-1">Convenio Colectivo de Trabajo {convenio.cct}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-6 items-start">

          {/* PANEL IZQUIERDO: Formulario */}
          <form ref={formRef} onSubmit={simularLiquidacion} noValidate className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

            <div className="bg-emerald-50/60 border-b border-emerald-100 px-5 py-4">
              <label htmlFor="periodo" className="block text-xs font-bold uppercase tracking-wide text-emerald-900 mb-1.5">
                Período a liquidar
              </label>
              <select
                id="periodo"
                value={periodoSeleccionado}
                onChange={(e) => { setPeriodoSeleccionado(e.target.value); setErrores((prev) => { const { periodo, ...resto } = prev; return resto; }); }}
                className={claseCampo("periodo", "w-full font-semibold")}
              >
                {periodosDisponibles.map(per => (
                  <option key={per.id} value={per.id}>{per.nombre}</option>
                ))}
              </select>
              {mensajeError("periodo")}
            </div>

            <div className="p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Datos del puesto</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {convenio.inputs_requeridos.map((input) => (
                  <div key={input.id} className={`flex flex-col ${input.tipo === "select" ? "sm:col-span-2" : ""}`}>
                    <label htmlFor={input.id} className="text-sm font-medium text-slate-700 mb-1.5">{input.label}</label>

                    {/* Las opciones van en el orden en que las cargó el convenio (el
                        de la planilla), no alfabético: "de cuarta" antes que "de
                        primera" y 110 toneladas antes que 20 no ayudaban a nadie. */}
                    {input.tipo === "select" && (
                      <select id={input.id} name={input.id} value={valoresUsuario[input.id] ?? ""} onChange={handleChange} className={claseCampo(input.id, "w-full")}>
                        {input.opciones.map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                    )}
                    {input.tipo === "number" && campoNumero(input.id)}
                    {input.tipo === "boolean" && (
                      <span className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 hover:border-emerald-300 transition-colors">
                        <input id={input.id} type="checkbox" name={input.id} checked={valoresUsuario[input.id] ?? false} onChange={handleChange} className="h-4 w-4 accent-emerald-600 cursor-pointer" />
                        <label htmlFor={input.id} className="text-sm text-slate-700 cursor-pointer">Sí, aplicar</label>
                      </span>
                    )}
                    {mensajeError(input.id)}
                  </div>
                ))}
              </div>

              {/* OPCIONES DE SIMULACIÓN */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Opciones de simulación</h2>

                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="incluir_sac"
                    checked={valoresUsuario.incluir_sac ?? false}
                    onChange={handleChange}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span>
                    Incluir SAC (medio aguinaldo)
                    <span className="block text-[11px] text-slate-400">También sube las contribuciones del empleador.</span>
                  </span>
                </label>

                <div className="flex items-start justify-between gap-3">
                  <label htmlFor="dias_vacaciones" className="text-sm text-slate-700 pt-2">
                    Días de vacaciones (plus vacacional)
                    <span className="block text-[11px] text-slate-500">Si este mes no se tomó vacaciones, dejá 0.</span>
                  </label>
                  <div className="flex flex-col items-end">{campoNumero("dias_vacaciones", "w-24 text-center")}{mensajeError("dias_vacaciones")}</div>
                </div>

              </div>

              {/* LO QUE PAGA EL EMPLEADOR (art. 140 inc. j) LCT) */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-indigo-700">Lo que paga el empleador</h2>
                <p className="text-[11px] text-slate-500 -mt-1">
                  Desde el 01/06/2026 el recibo muestra las contribuciones del empleador. Se calculan solas
                  con la tabla del mes; acá van los dos datos que dependen de cada empleador.
                </p>

                {tablaContribuciones === null && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-2">
                    Para {nombreDePeriodo(periodoSeleccionado)} todavía no hay tabla de contribuciones cargada:
                    el recibo va a salir sin la sección del empleador.
                  </p>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="regimen_contribuciones" className="text-sm text-slate-700">Régimen de contribuciones</label>
                  <select
                    id="regimen_contribuciones"
                    name="regimen_contribuciones"
                    value={valoresUsuario.regimen_contribuciones ?? ""}
                    onChange={handleChange}
                    disabled={!tablaContribuciones}
                    className={`${inputBase} w-full disabled:opacity-60`}
                  >
                    {!tablaContribuciones && <option value="">Sin tabla para este período</option>}
                    {tablaContribuciones &&
                      Object.entries(tablaContribuciones.regimenes || {}).map(([id, r]) => (
                        <option key={id} value={id}>{r.label}{r.predeterminado ? " · el más común" : ""}</option>
                      ))}
                  </select>
                  <span className="text-[11px] text-slate-400">Si no sabés, dejá el que está: es el de la mayoría de los empleadores.</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <label htmlFor="art_alicuota" className="text-sm text-slate-700">
                    Alícuota de ART
                    <span className="block text-[11px] text-slate-400">
                      La de tu póliza, en %.{" "}
                      {artTipicaDelConvenio != null
                        ? `La típica de esta actividad es ${pct(artTipicaDelConvenio)}.`
                        : "El convenio no tiene una típica cargada."}
                    </span>
                  </label>
                  <div className="flex flex-col items-end">{campoNumero("art_alicuota", "w-24 text-center")}{mensajeError("art_alicuota")}</div>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <label htmlFor="art_suma_fija" className="text-sm text-slate-700">
                    Cuota fija de la ART
                    <span className="block text-[11px] text-slate-400">Por trabajador y por mes, si tu póliza la tiene.</span>
                  </label>
                  <div className="flex flex-col items-end">{campoNumero("art_suma_fija", "w-24 text-center")}{mensajeError("art_suma_fija")}</div>
                </div>
              </div>

              {/* SITUACIÓN FAMILIAR (afecta el Impuesto a las Ganancias) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Cargas de familia</h2>
                <p className="text-[11px] text-slate-500 -mt-1">
                  Solo influyen si el sueldo llega al Impuesto a las Ganancias. Si corresponde, se calcula solo.
                </p>

                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="conyuge"
                    checked={valoresUsuario.conyuge ?? false}
                    onChange={handleChange}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Cónyuge / conviviente a cargo
                </label>
                <div className="flex items-start justify-between gap-3">
                  <label htmlFor="hijos" className="text-sm text-slate-700 pt-2">Hijos a cargo</label>
                  <div className="flex flex-col items-end">{campoNumero("hijos", "w-24 text-center")}{mensajeError("hijos")}</div>
                </div>
                {/* El motor ya deducía los hijos con discapacidad (valen el doble en
                    Ganancias), pero la pantalla nunca los pedía: siempre valían 0. */}
                <div className="flex items-start justify-between gap-3">
                  <label htmlFor="hijos_incapacitados" className="text-sm text-slate-700">
                    Hijos con discapacidad
                    <span className="block text-[11px] text-slate-400">Deducen el doble</span>
                  </label>
                  <div className="flex flex-col items-end">{campoNumero("hijos_incapacitados", "w-24 text-center")}{mensajeError("hijos_incapacitados")}</div>
                </div>
              </div>

              {(hayErrores || errorCalculo) && (
                <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
                  {errorCalculo ? (
                    <p>{errorCalculo}</p>
                  ) : (
                    <>
                      <p className="font-semibold">Revisá estos datos antes de calcular:</p>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[13px]">
                        {Object.entries(errores).map(([id, mensaje]) => (
                          <li key={id}>
                            <button type="button" onClick={() => document.getElementById(id)?.focus()} className="font-medium underline underline-offset-2">
                              {etiquetaDeCampo(convenio, id)}
                            </button>
                            : {mensaje}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all text-base">
                Calcular liquidación
              </button>
            </div>
          </form>

          {/* PANEL DERECHO: El Recibo, en el orden que manda el Decreto 407/2026:
              datos · lo que paga el empleador · haberes y deducciones · neto ·
              composición del costo laboral. */}
          {resultadoLiquidacion ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden lg:sticky lg:top-6">

              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">Simulación de recibo</h2>
                  <p className="text-xs text-slate-300 mt-0.5">{convenio.nombre} · {periodoUsadoNombre}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 rounded-full px-3 py-1">Estimado</span>
              </div>

              {/* Si se tocó el formulario después de calcular, el recibo de abajo
                  es de los datos anteriores. Antes quedaba igual, sin ninguna
                  marca, y se leía como si correspondiera a lo que decían los
                  campos: el error más fácil de cometer en toda la pantalla. */}
              {desactualizado && (
                <div role="status" className="bg-amber-50 border-b border-amber-300 px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900">
                  <span><b>Cambiaste datos.</b> Este recibo es de los datos anteriores.</span>
                  <button
                    type="button"
                    onClick={() => formRef.current?.requestSubmit()}
                    className="rounded-lg bg-amber-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-amber-700"
                  >
                    Recalcular
                  </button>
                </div>
              )}

              <div className={`p-5 space-y-5 ${desactualizado ? "opacity-50" : ""}`}>

                {/* 1. Datos */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-[12px] text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  <span><span className="font-semibold text-slate-500">Convenio:</span> {convenio.nombre} · CCT {convenio.cct}</span>
                  <span><span className="font-semibold text-slate-500">Período:</span> {periodoUsadoNombre}</span>
                  <span>
                    <span className="font-semibold text-slate-500">Categoría:</span> {entradasUsadas?.categoria}
                    {entradasUsadas?.zona ? ` · ${entradasUsadas.zona}` : ""}
                  </span>
                  <span><span className="font-semibold text-slate-500">Antigüedad:</span> {Number(entradasUsadas?.antiguedad_años) || 0} años</span>
                  {metodo && (
                    <span><span className="font-semibold text-slate-500">Jornada:</span> {num(metodo.jornadaDelPuesto)} hs de {num(metodo.jornadaCompletaSemanal)} semanales</span>
                  )}
                  {empleador && (
                    <span><span className="font-semibold text-slate-500">Régimen:</span> {empleador.regimen.label}</span>
                  )}
                  <span className="sm:col-span-2 text-[11px] text-slate-400">
                    Un recibo real lleva además CUIT del empleador, CUIL, fecha de ingreso, y fecha y lugar de pago de las cargas sociales.
                  </span>
                </section>

                {/* 2. Lo que paga el empleador: antes del bruto, que es el punto de la norma */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-700 border-b border-slate-100 pb-1.5 mb-2">Contribuciones a cargo del empleador</h3>
                  {empleador ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="text-[10px] uppercase text-slate-400">
                              <th className="text-left font-semibold pb-1">Concepto</th>
                              <th className="text-right font-semibold pb-1">Base de cálculo</th>
                              <th className="text-right font-semibold pb-1">Unidad</th>
                              <th className="text-right font-semibold pb-1">Importe</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contribuciones.map((l, i) => (
                              <tr key={i} className={l.pendiente ? "text-amber-700" : "text-slate-700"}>
                                <td className="py-0.5 pr-2 align-top">{l.concepto}</td>
                                <td className="py-0.5 text-right tabular-nums whitespace-nowrap text-slate-500 align-top">
                                  {l.base != null ? money(l.base) : "—"}
                                  <span className="block text-[10px] text-slate-400">{l.baseLabel}</span>
                                </td>
                                <td className="py-0.5 pl-2 text-right whitespace-nowrap text-slate-500 align-top">
                                  {l.unidad === "porcentaje" ? (l.alicuota != null ? pct(l.alicuota) : "sin dato") : "suma fija"}
                                </td>
                                <td className="py-0.5 pl-2 text-right tabular-nums whitespace-nowrap align-top">{money(l.monto)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 space-y-1 text-sm">
                        <div className="flex justify-between text-indigo-900">
                          <span>Subtotal contribuciones</span>
                          <span className="tabular-nums">{money(empleador.totalContribuciones)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 text-[12px]">
                          <span>Remuneración bruta + no remunerativo</span>
                          <span className="tabular-nums">{money(resultadoLiquidacion.totales.bruto + resultadoLiquidacion.totales.noRemunerativo)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-indigo-900 border-t border-indigo-200 pt-1">
                          <span>Costo laboral total</span>
                          <span className="tabular-nums">{money(empleador.costoLaboral)}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        {empleador.detraccion
                          ? `Detracción Ley 27.541 aplicada: ${money(empleador.detraccion.prorrateada)}` +
                            (empleador.detraccion.prorrateaPorJornada && metodo.jornadaDelPuesto !== metodo.jornadaCompletaSemanal ? " (prorrateada por la jornada)" : "") +
                            ". "
                          : ""}
                        La ART es estimada: cada empleador negocia su alícuota.
                      </p>
                      {empleador.periodoTabla && empleador.periodoTabla !== metodo.periodo && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-2 mt-2">
                          <b>Ojo:</b> no hay tabla de contribuciones de {nombreDePeriodo(metodo.periodo)}. Se usó la de{" "}
                          {nombreDePeriodo(empleador.periodoTabla)}, que puede tener otras bases o alícuotas.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-2">
                      Para {nombreDePeriodo(metodo?.periodo)} todavía no hay tabla de contribuciones cargada, así que
                      este recibo no muestra la sección del empleador.
                    </p>
                  )}
                </section>

                {/* 3. Haberes y deducciones */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 pb-1.5 mb-2">Haberes remunerativos</h3>
                  <div className="space-y-1.5">
                    {remunerativos.map((l, i) => (
                      <div key={i} className="flex justify-between gap-3 text-sm">
                        <span className="text-slate-700 min-w-0">{l.concepto}<Explicacion linea={l} /></span>
                        <span className="text-slate-900 tabular-nums whitespace-nowrap">{money(l.monto)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {noRemunerativos.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-sky-600 border-b border-slate-100 pb-1.5 mb-2">Haberes no remunerativos</h3>
                    <div className="space-y-1.5">
                      {noRemunerativos.map((l, i) => (
                        <div key={i} className="flex justify-between gap-3 text-sm">
                          <span className="text-sky-800 min-w-0">
                            {l.concepto}
                            {l.sinIncidencia && <span className="ml-1 text-[10px] uppercase tracking-wide text-sky-600">sin incidencia</span>}
                            <Explicacion linea={l} />
                          </span>
                          <span className="text-sky-800 tabular-nums whitespace-nowrap">{money(l.monto)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-rose-500 border-b border-slate-100 pb-1.5 mb-2">Descuentos y retenciones</h3>
                  <div className="space-y-1.5">
                    {retenciones.map((l, i) => (
                      <div key={i} className="flex justify-between gap-3 text-sm">
                        <span className="text-slate-600 min-w-0">{l.concepto}<Explicacion linea={l} /></span>
                        <span className="text-rose-600 tabular-nums whitespace-nowrap">− {money(l.monto)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Ganancias siempre dice algo: que corresponde (arriba, como
                      línea), que no corresponde y por qué, o que no se calculó.
                      El silencio dejaba al contador sin saber cuál de las tres. */}
                  {resultadoLiquidacion.ganancias && !resultadoLiquidacion.ganancias.aplica && (
                    <p className="text-[11px] text-slate-500 mt-2">
                      Impuesto a las Ganancias:{" "}
                      {resultadoLiquidacion.ganancias.motivo
                        ? `no se calculó (${resultadoLiquidacion.ganancias.motivo.toLowerCase()}).`
                        : `no corresponde este mes. Ganancia neta ${money(resultadoLiquidacion.ganancias.gananciaNeta)} contra deducciones personales de ${money(resultadoLiquidacion.ganancias.deduccionesPersonales)}.`}
                    </p>
                  )}
                  {!resultadoLiquidacion.ganancias && (
                    <p className="text-[11px] text-slate-500 mt-2">Impuesto a las Ganancias: no se calculó porque no hay tabla cargada para este período.</p>
                  )}
                </section>

                {desconocidas.length > 0 && (
                  <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-300 rounded-lg px-2.5 py-2">
                    El recibo tiene {desconocidas.length} línea(s) de un tipo que esta pantalla no sabe mostrar:{" "}
                    {desconocidas.map((l) => `${l.concepto} (${l.tipo})`).join(", ")}. No están sumadas en ninguna sección de arriba.
                  </div>
                )}

                {/* 4. Totales y neto */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Total remunerativo</span>
                    <span className="tabular-nums">{money(resultadoLiquidacion.totales.bruto)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-sky-700">
                    <span>Total no remunerativo</span>
                    <span className="tabular-nums">+ {money(resultadoLiquidacion.totales.noRemunerativo)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-rose-600">
                    <span>Total retenciones</span>
                    <span className="tabular-nums">− {money(resultadoLiquidacion.totales.retenciones)}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-600 text-white px-5 py-4 flex items-center justify-between gap-3">
                  <span className="font-bold">Neto a cobrar</span>
                  <span className="text-2xl sm:text-3xl font-black tabular-nums whitespace-nowrap">
                    {money(resultadoLiquidacion.totales.neto)}
                  </span>
                </div>

                {/* 5. Composición del costo laboral: los siete rubros del decreto */}
                {empleador && (
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 pb-1.5 mb-2">Composición de las cargas sociales</h3>
                    {/* Los porcentajes son sobre el total de las cargas, no sobre el
                        costo laboral: antes el título decía "costo laboral" y el
                        contador leyó que la seguridad social era el 51% del costo.
                        Al lado va el peso real sobre el costo. Los rubros en cero
                        no se dibujan: un guion no informa nada. */}
                    <p className="text-[11px] text-slate-500 mb-2">
                      Lo que pagan el empleador y el trabajador, por rubro del Decreto 407/2026. El primer porcentaje es sobre
                      el total de las cargas; el segundo, sobre el costo laboral total.
                    </p>
                    <div className="space-y-2">
                      {Object.entries(empleador.rubros).filter(([, r]) => r.total > 0).map(([id, r]) => {
                        const parteEmpleador = (r.empleador / r.total) * 100;
                        const etiqueta = id === "art" && contribuciones.some((l) => /FFEP/.test(l.concepto)) ? `${r.label} + FFEP` : r.label;
                        return (
                          <div key={id} className="text-[12px]">
                            <div className="flex justify-between gap-2 text-slate-700">
                              <span>{etiqueta}</span>
                              <span className="tabular-nums whitespace-nowrap">
                                {money(r.total)} · {num(r.porcentaje)}% de las cargas
                                {r.porcentajeDelCosto != null ? ` · ${num(r.porcentajeDelCosto)}% del costo` : ""}
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-rose-200 overflow-hidden mt-0.5">
                              <div className="h-full bg-indigo-500" style={{ width: `${parteEmpleador}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Empleador {money(r.empleador)}</span>
                              <span>Trabajador {money(r.trabajador)}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between gap-2 text-[12px] font-semibold text-slate-800 border-t border-slate-200 pt-1.5">
                        <span>Total de cargas (empleador + trabajador)</span>
                        <span className="tabular-nums whitespace-nowrap">
                          {money(empleador.totalCargas)} · {num((empleador.totalCargas / empleador.costoLaboral) * 100)}% del costo laboral total
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      El Impuesto a las Ganancias no integra el costo laboral: es un impuesto del trabajador que el empleador sólo retiene.
                    </p>
                  </section>
                )}

                {resultadoLiquidacion.ganancias?.aplica && (
                  <p className="text-[11px] text-amber-700">
                    El Impuesto a las Ganancias es una <b>estimación mensual</b>, no reemplaza
                    la liquidación anual acumulada de ARCA.
                  </p>
                )}

                {resultadoLiquidacion.ganancias?.aplica &&
                  periodoGanancias &&
                  periodoGanancias !== periodoUsado && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-2">
                      <b>Ojo:</b> todavía no están cargadas las tablas de Ganancias de{" "}
                      {nombreDePeriodo(periodoUsado)}. Se usaron las de{" "}
                      {nombreDePeriodo(periodoGanancias)}, que pueden ser de otro semestre y dar
                      un impuesto distinto al que corresponde.
                    </p>
                  )}
                {/* Lo que el usuario cargó y el recibo no usó. Antes pasaba en
                    silencio: escribías 20 años de antigüedad en un convenio que no
                    tiene esa regla, el neto no se movía y no había ni un aviso. */}
                {resultadoLiquidacion.avisos?.length > 0 && (
                  <div className="space-y-1">
                    {resultadoLiquidacion.avisos.map((aviso, i) => (
                      <p key={i} className="text-[11px] text-slate-700 bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-2">
                        {aviso}
                      </p>
                    ))}
                  </div>
                )}

                {/* 6. Con qué supuestos se hizo la cuenta */}
                {metodo && (
                  <section className="rounded-xl border border-slate-200 p-3">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Cómo se hizo esta cuenta</h3>
                    <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc pl-4">
                      <li>
                        Jornada completa del convenio: {metodo.jornadaCompletaSemanal} hs semanales
                        {metodo.laDeclaraElConvenio ? " (la declara el convenio)" : " (valor por defecto)"}; el puesto: {num(metodo.jornadaDelPuesto)} hs.
                        {metodo.divisorHorasMensuales ? ` Valor hora sobre ${metodo.divisorHorasMensuales} hs mensuales.` : ""}
                      </li>
                      {metodo.antiguedad && (
                        <li>
                          Antigüedad: {metodo.antiguedad.modo === "tramos"
                            ? `por tramos del convenio (${(metodo.antiguedad.tramos || []).map((t) => `desde ${num(t.desde_años)} años: ${pct(t.porcentaje)}`).join("; ")}); con ${num(metodo.antiguedad.años)} años corresponde ${pct(metodo.antiguedad.porcentajeTotal)}`
                            : `${pct(metodo.antiguedad.porAño)} por año`}
                          , sobre {metodo.antiguedadSobre === "basico_mas_adicionales" ? "el básico más los adicionales remunerativos (los viáticos no)" : "el básico"}.
                        </li>
                      )}
                      {metodo.valorHora != null && (
                        <li>
                          Valor hora: (básico + antigüedad + presentismo + adicionales fijos) / {num(metodo.horasMensualesDelPuesto)} hs = {money(metodo.valorHora)}.
                          Los conceptos variables (kilómetros, SAC, vacaciones) no entran en el valor hora.
                        </li>
                      )}
                      {metodo.noRemunerativoConIncidencia > 0 && (
                        <li>
                          Las sumas no remunerativas de la escala {metodo.noRemunerativoGeneraAdicionales ? "generan" : "no generan"} antigüedad,
                          presentismo y adicionales, y pagan obra social, sindicales y contribuciones.
                        </li>
                      )}
                      {metodo.noRemunerativoSinIncidencia > 0 && (
                        <li>
                          Sin incidencia ({lineas.filter((l) => l.sinIncidencia).map((l) => l.concepto.replace(/\s*\([^)]*\)\s*$/, "")).join(", ")}): no generan
                          antigüedad ni adicionales, y no pagan aportes ni contribuciones. Van derecho al neto.
                        </li>
                      )}
                      {supuestos.length > 0 && <li>Marcado en el formulario: {supuestos.join("; ")}. Si no corresponde, destildalo y recalculá.</li>}
                      {periodoGanancias && (
                        <li>Ganancias: tabla cargada para {nombreDePeriodo(periodoGanancias)}{periodoGanancias !== periodoUsado ? " (las tablas cambian por semestre)" : ""}.</li>
                      )}
                      {empleador && (
                        <>
                          <li>Contribuciones: tabla de {nombreDePeriodo(empleador.periodoTabla)}, régimen "{empleador.regimen.label}".</li>
                          <li>
                            ART: {empleador.art.pendiente
                              ? "sin alícuota informada"
                              : `${pct(empleador.art.alicuota)} ${metodo.artLaInformoLaPersona ? "(la que informaste)" : "(la típica del convenio)"}`}, estimada.
                          </li>
                          <li>El SAC {empleador.sacIntegraBase ? "integra" : "no integra"} la base de contribuciones.</li>
                          <li>
                            Costo por hora: {empleador.costoPorHora != null ? money(empleador.costoPorHora) : "—"} · por día: {money(empleador.costoPorDia)} (costo laboral / 30).
                          </li>
                        </>
                      )}
                    </ul>
                  </section>
                )}

                <p className="text-[11px] text-slate-400">
                  Simulación orientativa según escalas vigentes cargadas. No reemplaza el recibo oficial emitido por el empleador.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-10 text-center lg:sticky lg:top-6">
              <div className="text-4xl mb-3">🧾</div>
              <h2 className="font-semibold text-slate-700">Tu recibo va a aparecer acá</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                Completá los datos del puesto y tocá <b>Calcular liquidación</b> para ver el detalle completo.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

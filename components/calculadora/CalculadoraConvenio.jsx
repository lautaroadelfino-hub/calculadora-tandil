"use client";
// components/calculadora/CalculadoraConvenio.jsx
// La calculadora de un convenio: formulario y recibo. Es un componente de
// cliente porque el formulario y el cálculo viven en el navegador, pero YA NO
// baja nada de Firestore al arrancar: el convenio, los períodos, la escala y
// las tablas del período inicial vienen en `inicial`, armadas en el servidor
// por lib/datosCalculadora.js (antes se veía "Cargando las escalas…" dos o
// tres segundos mientras el SDK de Firebase abría el canal). Lo que haga falta
// después, por ejemplo la escala de otro mes, se pide por REST con
// lib/firestoreRest.js y se guarda para no pedirlo dos veces.

import { useEffect, useRef, useState } from "react";
import { leerDocumento } from "@/lib/firestoreRest";
import { procesarRecibo } from "@/lib/motorLiquidacion";
import { nombreDePeriodo, periodoDeTabla } from "@/lib/periodos";
import { regimenPredeterminado } from "@/lib/contribucionesForm";
import { normalizarEntradas, etiquetaDeCampo } from "@/lib/validacionEntradas";
import ReportModal from "@/components/ReportModal";
import ReciboOficial from "@/components/calculadora/ReciboOficial";
import { paramsDesdeEntradas } from "@/lib/permalink";

const money = (n) =>
  "$" + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 0.1077 -> "10,77%" */
const pct = (fraccion) =>
  (Number(fraccion || 0) * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";

const MESES_DEL_AÑO = 12;

/** 36.5 -> "36,5" */
const num = (n) => Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });

export default function CalculadoraConvenio({ convenioId, inicial }) {

  // Estados de datos
  const [convenio] = useState(inicial.convenio);
  const [periodosDisponibles] = useState(inicial.periodos);

  // Estados de interfaz
  const [valoresUsuario, setValoresUsuario] = useState(inicial.valores);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(inicial.periodoInicial);
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
  // En el celular, los bloques del empleador y de Ganancias arrancan plegados:
  // son ocho campos con valores por defecto razonables que estaban entre la
  // persona y el botón de calcular (tres pantallas de scroll). En escritorio
  // quedan abiertos. El HTML del servidor no sabe el ancho de la pantalla, así
  // que los manda plegados y en escritorio se abren al hidratar: el salto de
  // contenido queda del lado donde sobra lugar, no en el celular.
  const [empleadorAbierto, setEmpleadorAbierto] = useState(false);
  const [familiaAbierta, setFamiliaAbierta] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 640) {
      setEmpleadorAbierto(true);
      setFamiliaAbierta(true);
    }
  }, []);
  // El reporte de errores también se puede abrir desde acá, con el cálculo a
  // mano: antes había que volver a la portada y ya se había perdido.
  const [showReport, setShowReport] = useState(false);
  const reportBtnRef = useRef(null);
  // Link para compartir e impresión.
  const [autoCalcular, setAutoCalcular] = useState(inicial.autoCalcular);
  const [copiado, setCopiado] = useState("");
  // Al calcular, el foco va al título del recibo y una región viva lo anuncia:
  // quien usa lector de pantalla pulsaba Enter y no oía nada.
  const tituloReciboRef = useRef(null);
  useEffect(() => {
    if (resultadoLiquidacion) tituloReciboRef.current?.focus?.();
  }, [resultadoLiquidacion]);
  // De qué período salieron las tablas de Ganancias que se usaron. Si no
  // coincide con el mes liquidado hay que decirlo: la escala del impuesto
  // cambia por semestre, así que usar la de otro semestre da un número que
  // no es el que corresponde, y hasta ahora eso pasaba sin ningún aviso.
  const [periodoGanancias, setPeriodoGanancias] = useState(null);
  // La tabla de contribuciones patronales del período (art. 140 inc. j) LCT).
  // undefined = todavía no se buscó; null = se buscó y no hay.
  const [tablaContribuciones, setTablaContribuciones] = useState(inicial.tablaContribuciones.datos);
  const [periodoContribuciones, setPeriodoContribuciones] = useState(inicial.tablaContribuciones.periodo);

  // Lo que ya vino en el HTML (la escala y las tablas del período inicial) y lo
  // que se fue trayendo después: nada se pide dos veces.
  const cache = useRef({
    escalas: { ...inicial.escalas },
    parametros_contribuciones: { ...inicial.contribuciones.tablas },
    parametros_ganancias: { ...inicial.ganancias.tablas },
  });
  const periodosDeTabla = {
    parametros_contribuciones: inicial.contribuciones.periodos,
    parametros_ganancias: inicial.ganancias.periodos,
  };

  /** Los importes del convenio para un mes, o null si ese mes no está cargado. */
  async function escalaDelPeriodo(periodo) {
    const guardadas = cache.current.escalas;
    if (!(periodo in guardadas)) guardadas[periodo] = await leerDocumento(`convenios/${convenioId}/escalas/${periodo}`);
    return guardadas[periodo];
  }

  /**
   * De una colección de tablas por período (parametros_ganancias,
   * parametros_contribuciones), la que corresponde al mes pedido: la exacta si
   * está, y si no la más reciente anterior. Devuelve también de qué período
   * salió, porque cuando no es el pedido hay que decirlo en pantalla.
   */
  async function traerTablaDelPeriodo(coleccion, periodo) {
    const eleccion = periodoDeTabla(periodosDeTabla[coleccion] || [], periodo);
    if (!eleccion.periodo) return { periodo: null, datos: null, exacto: false };
    const guardadas = cache.current[coleccion];
    if (!(eleccion.periodo in guardadas)) guardadas[eleccion.periodo] = await leerDocumento(`${coleccion}/${eleccion.periodo}`);
    return { periodo: eleccion.periodo, datos: guardadas[eleccion.periodo], exacto: eleccion.exacto };
  }

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

  useEffect(() => {
    if (autoCalcular && convenio && periodoSeleccionado && tablaContribuciones !== undefined) {
      setAutoCalcular(false);
      formRef.current?.requestSubmit();
    }
  }, [autoCalcular, convenio, periodoSeleccionado, tablaContribuciones]);

  const linkDeLaSimulacion = () => {
    if (typeof window === "undefined" || !periodoUsado) return "";
    return `${window.location.origin}${window.location.pathname}?${paramsDesdeEntradas(convenio, entradasUsadas || {}, periodoUsado)}`;
  };

  const copiarLink = async () => {
    const link = linkDeLaSimulacion();
    try {
      await navigator.clipboard.writeText(link);
      setCopiado("Link copiado. Pegalo donde quieras: abre esta misma simulación.");
    } catch {
      setCopiado(link);
    }
    setTimeout(() => setCopiado(""), 6000);
  };

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
      const escala = await escalaDelPeriodo(periodoSeleccionado);

      if (!escala) {
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
      const reciboArmado = procesarRecibo(convenio, escala, revision.valores, paramsGanancias, {
        periodo: periodoSeleccionado,
        // null y no undefined: la pantalla la buscó. Si no hay, el motor avisa.
        tablaContribuciones: tablaContribuciones === undefined ? null : tablaContribuciones,
        periodoContribuciones,
      });
      setResultadoLiquidacion(reciboArmado);
      setEntradasUsadas({ ...valoresUsuario });
      setPeriodoUsado(periodoSeleccionado);
      // La URL guarda la simulación: un F5 la vuelve a calcular, y se puede compartir.
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `?${paramsDesdeEntradas(convenio, valoresUsuario, periodoSeleccionado)}`);
      }

    } catch (error) {
      setErrorCalculo(error.message);
    }
  };

  const inputBase =
    "border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400 transition-colors";

  // Las líneas del recibo; el formato oficial las dibuja ReciboOficial.
  const lineas = resultadoLiquidacion?.detalle || [];
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
      {/* El layout ya pone 16 px de margen por lado en el celular: acá no se
          duplica. En escritorio el tope sube a 1280 px y en monitores grandes
          a 1600: antes, con 1152 px, un monitor de 1920 usaba el 57 % del
          ancho y uno de 2560 el 43 %. */}
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-0 sm:px-6 py-6 sm:py-8 mb-16">

        {/* ENCABEZADO DEL CONVENIO */}
        <header className="mb-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-[11px] font-semibold text-emerald-900 uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Calculadora de sueldos
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{convenio.nombre}</h1>
          <p className="text-sm text-slate-500 mt-1">Convenio Colectivo de Trabajo {convenio.cct}</p>
        </header>

        {/* Dos columnas desde 1024 px, con más lugar para el recibo (3/8 y 5/8;
            5/12 y 7/12 desde 1280): el formulario no gana nada con más ancho y
            el recibo oficial necesita 480 px para no desplazarse de costado. */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-start">

          {/* PANEL IZQUIERDO: Formulario */}
          <form ref={formRef} onSubmit={simularLiquidacion} noValidate className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-clip print:hidden">

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
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Datos del puesto</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(convenio.inputs_requeridos || []).map((input) => (
                  <div key={input.id} className={`flex flex-col ${input.tipo === "select" ? "sm:col-span-2" : ""}`}>
                    <label htmlFor={input.id} className="text-sm font-medium text-slate-700 mb-1.5">{input.label}</label>

                    {/* Las opciones van en el orden en que las cargó el convenio (el
                        de la planilla), no alfabético: "de cuarta" antes que "de
                        primera" y 110 toneladas antes que 20 no ayudaban a nadie. */}
                    {input.tipo === "select" && (
                      <>
                        <select id={input.id} name={input.id} value={valoresUsuario[input.id] ?? ""} onChange={handleChange} className={claseCampo(input.id, "w-full")}>
                          {input.opciones.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                        {String(valoresUsuario[input.id] || "").length > 28 && (
                          <span className="sm:hidden text-[11px] text-slate-500 mt-1">Elegida: {valoresUsuario[input.id]}</span>
                        )}
                        {input.id === "zona" && (
                          <span className="text-[11px] text-slate-500 mt-1">
                            Depende de la localidad del establecimiento; lo fija la escala del convenio. Si no sabés, consultá tu recibo o al empleador.
                          </span>
                        )}
                      </>
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
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Opciones de simulación</h2>

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
                    <span className="block text-[11px] text-slate-500">También sube las contribuciones del empleador.</span>
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
              <details open={empleadorAbierto} onToggle={(e) => setEmpleadorAbierto(e.currentTarget.open)} className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-indigo-700">Lo que paga el empleador</h2>
                  <span className="text-[11px] text-indigo-700">{empleadorAbierto ? "Ocultar" : "Ver · ya tiene valores por defecto"}</span>
                </summary>
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
                  <span className="text-[11px] text-slate-500">Si no sabés, dejá el que está: es el de la mayoría de los empleadores.</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <label htmlFor="art_alicuota" className="text-sm text-slate-700">
                    Alícuota de ART
                    <span className="block text-[11px] text-slate-500">
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
                    <span className="block text-[11px] text-slate-500">Por trabajador y por mes, si tu póliza la tiene.</span>
                  </label>
                  <div className="flex flex-col items-end">{campoNumero("art_suma_fija", "w-24 text-center")}{mensajeError("art_suma_fija")}</div>
                </div>
              </details>

              {/* SITUACIÓN FAMILIAR (afecta el Impuesto a las Ganancias) */}
              <details open={familiaAbierta} onToggle={(e) => setFamiliaAbierta(e.currentTarget.open)} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Cargas de familia</h2>
                  <span className="text-[11px] text-slate-500">{familiaAbierta ? "Ocultar" : "Ver · sólo para Ganancias"}</span>
                </summary>
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
                    <span className="block text-[11px] text-slate-500">Deducen el doble</span>
                  </label>
                  <div className="flex flex-col items-end">{campoNumero("hijos_incapacitados", "w-24 text-center")}{mensajeError("hijos_incapacitados")}</div>
                </div>
              </details>

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

              {/* En el celular el botón queda pegado abajo mientras se completa el
                  formulario: antes había que bajar tres pantallas para encontrarlo. */}
              <div data-flotante="" className="sticky bottom-2 sm:static z-10 -mx-1 px-1 py-1 sm:m-0 sm:p-0 rounded-xl bg-white/90 backdrop-blur">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all text-base">
                  Calcular liquidación
                </button>
              </div>
            </div>
          </form>

          {/* PANEL DERECHO: El Recibo, con el modelo del Anexo III del Decreto
              407/2026: datos · lo que paga el empleador · haberes y deducciones ·
              neto · composición del costo laboral. */}
          {resultadoLiquidacion ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden lg:sticky lg:top-6 print:shadow-none print:border-0 print:static">

              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <h2 ref={tituloReciboRef} tabIndex={-1} className="font-bold outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded">Simulación de recibo</h2>
                  <p className="text-xs text-slate-300 mt-0.5">{convenio.nombre} · {periodoUsadoNombre}</p>
                  <p role="status" aria-live="polite" className="sr-only">
                    Recibo calculado para {periodoUsadoNombre}. Neto a cobrar {money(resultadoLiquidacion.totales.neto)}.
                  </p>
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

                {/* 0. Resumen: los dos números que cada uno vino a buscar, arriba de
                    todo. El empleado tardaba tres pantallas en llegar al neto y el
                    primer número grande era el costo del empleador; el empleador,
                    al revés, no encontraba destacado el costo total. El detalle
                    sigue abajo, en el orden que manda el Decreto 407/2026. */}
                {/* Las tres tarjetas se ponen en fila según el ancho de la
                    tarjeta del recibo (consulta de contenedor), no de la
                    pantalla: en una columna de 470 px se apilaban mal y el neto
                    se cortaba. El importe del neto crece recién cuando entra. */}
                <div className="@container">
                <div className="grid grid-cols-1 @lg:grid-cols-3 gap-2">
                  <div className="rounded-xl bg-emerald-600 text-white px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100">Neto a cobrar</div>
                    <div className="text-xl @2xl:text-2xl font-black tabular-nums leading-tight">{money(resultadoLiquidacion.totales.neto)}</div>
                    <div className="text-[11px] text-emerald-100">Lo que recibe el trabajador</div>
                  </div>
                  <div className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bruto + no remunerativo</div>
                    <div className="text-lg font-bold tabular-nums text-slate-800 leading-tight">
                      {money(resultadoLiquidacion.totales.bruto + resultadoLiquidacion.totales.noRemunerativo)}
                    </div>
                    <div className="text-[11px] text-slate-500">Antes de los descuentos</div>
                  </div>
                  <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Costo laboral total</div>
                    <div className="text-lg font-bold tabular-nums text-indigo-900 leading-tight">{empleador ? money(empleador.costoLaboral) : "—"}</div>
                    <div className="text-[11px] text-indigo-700">
                      {empleador
                        ? `Lo que paga el empleador por mes. Al año, unos ${money(empleador.costoLaboral * (entradasUsadas?.incluir_sac ? MESES_DEL_AÑO : MESES_DEL_AÑO + 1))} (${entradasUsadas?.incluir_sac ? "12 meses como este" : "12 meses más el aguinaldo"}).`
                        : "Sin tabla de contribuciones para este período."}
                    </div>
                  </div>
                </div>
                </div>

                {/* 1 a 5. El recibo, con el formato del Anexo III del Decreto
                    407/2026 (docs/decreto-407-2026-anexo-III.pdf): casillas,
                    costo total empleador, bruto, haberes y aportes, neto,
                    detalle de la composición salarial y torta. Las celdas las
                    arma lib/reciboOficial.js. */}
                <p className="text-[11px] text-slate-500">
                  Las casillas en blanco (empresa, CUIT, nombre, legajo, CUIL, fecha de ingreso, lugar y fecha de pago) son
                  datos que la simulación no tiene.
                </p>
                <ReciboOficial resultado={resultadoLiquidacion} entradas={entradasUsadas} periodoId={periodoUsado} />

                {/* Notas al pie del recibo. Ganancias siempre dice algo: que
                    corresponde (arriba, como línea), que no corresponde y por
                    qué, o que no se calculó. El silencio dejaba al contador
                    sin saber cuál de las tres. */}
                {resultadoLiquidacion.ganancias && !resultadoLiquidacion.ganancias.aplica && (
                  <p className="text-[11px] text-slate-500">
                    Impuesto a las Ganancias:{" "}
                    {resultadoLiquidacion.ganancias.motivo
                      ? `no se calculó (${resultadoLiquidacion.ganancias.motivo.toLowerCase()}).`
                      : `no corresponde este mes. Ganancia neta ${money(resultadoLiquidacion.ganancias.gananciaNeta)} contra deducciones personales de ${money(resultadoLiquidacion.ganancias.deduccionesPersonales)}.`}
                  </p>
                )}
                {!resultadoLiquidacion.ganancias && (
                  <p className="text-[11px] text-slate-500">Impuesto a las Ganancias: no se calculó porque no hay tabla cargada para este período.</p>
                )}
                {empleador && (
                  <p className="text-[11px] text-slate-500">
                    {empleador.detraccion
                      ? `Detracción Ley 27.541 aplicada: ${money(empleador.detraccion.prorrateada)}` +
                        (empleador.detraccion.prorrateaPorJornada && metodo.jornadaDelPuesto !== metodo.jornadaCompletaSemanal ? " (prorrateada por la jornada)" : "") +
                        ". "
                      : ""}
                    La ART es estimada: cada empleador negocia su alícuota. El Impuesto a las Ganancias no integra el costo laboral:
                    es un impuesto del trabajador que el empleador sólo retiene.
                  </p>
                )}
                {empleador && empleador.periodoTabla && empleador.periodoTabla !== metodo.periodo && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-2">
                    <b>Ojo:</b> no hay tabla de contribuciones de {nombreDePeriodo(metodo.periodo)}. Se usó la de{" "}
                    {nombreDePeriodo(empleador.periodoTabla)}, que puede tener otras bases o alícuotas.
                  </p>
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
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Cómo se hizo esta cuenta</h3>
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

                {/* Glosario corto: las palabras que las personas dijeron no entender. */}
                <details className="rounded-xl border border-slate-200 p-3 text-[12px] text-slate-600 print:hidden">
                  <summary className="cursor-pointer font-semibold text-slate-700">Qué quiere decir cada cosa</summary>
                  <dl className="mt-2 space-y-1.5">
                    <div><dt className="inline font-semibold">Remunerativo:</dt> <dd className="inline">lo que paga aportes (jubilación, PAMI, obra social) y cuenta para el aguinaldo, las vacaciones y una indemnización.</dd></div>
                    <div><dt className="inline font-semibold">No remunerativo:</dt> <dd className="inline">sumas que el convenio paga aparte y no pagan jubilación ni PAMI. Las &quot;con incidencia&quot; sí pagan obra social y sindicales; las &quot;sin incidencia&quot; (comida, viáticos) no pagan nada y van derecho al neto.</dd></div>
                    <div><dt className="inline font-semibold">SAC:</dt> <dd className="inline">el aguinaldo. Medio sueldo en junio y medio en diciembre, sobre la mejor remuneración del semestre.</dd></div>
                    <div><dt className="inline font-semibold">Cuota sindical y aporte solidario:</dt> <dd className="inline">la cuota la pagan los afiliados al gremio; el solidario, por el convenio, quienes no están afiliados.</dd></div>
                    <div><dt className="inline font-semibold">Régimen de contribuciones:</dt> <dd className="inline">el porcentaje que paga el empleador según su tamaño y actividad. La mayoría está en el de MiPyME y resto de actividades.</dd></div>
                    <div><dt className="inline font-semibold">ART:</dt> <dd className="inline">el seguro de accidentes de trabajo. Cada empleador negocia su alícuota; acá va una típica de la actividad, y podés poner la tuya.</dd></div>
                  </dl>
                </details>

                <p className="text-[11px] text-slate-500">
                  Simulación orientativa según escalas vigentes cargadas. No reemplaza el recibo oficial emitido por el empleador.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
                  <button type="button" onClick={copiarLink} className="text-[12px] font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900">
                    Copiar link de esta simulación
                  </button>
                  <button type="button" onClick={() => window.print()} className="text-[12px] font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900">
                    Imprimir o guardar en PDF
                  </button>
                  <button
                    ref={reportBtnRef}
                    type="button"
                    onClick={() => setShowReport(true)}
                    className="text-[12px] font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
                  >
                    ¿Algo no cuadra? Reportá un error o una sugerencia
                  </button>
                </div>
                {copiado && <p role="status" className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2 [overflow-wrap:anywhere] print:hidden">{copiado}</p>}
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

        <ReportModal
          open={showReport}
          onClose={() => setShowReport(false)}
          triggerRef={reportBtnRef}
          context={{
            titulo: `Calculadora ${convenio.nombre}`,
            convenio: `${convenio.nombre} (CCT ${convenio.cct})`,
            mes: periodoUsado || periodoSeleccionado,
            categoria: entradasUsadas?.categoria,
            aniosAntiguedad: entradasUsadas?.antiguedad_años,
            horas50: entradasUsadas?.horas_extras_50,
            horas100: entradasUsadas?.horas_extras_100,
            r: resultadoLiquidacion ? { neto: resultadoLiquidacion.totales.neto, bruto: resultadoLiquidacion.totales.bruto } : undefined,
          }}
        />
      </div>
    </div>
  );
}

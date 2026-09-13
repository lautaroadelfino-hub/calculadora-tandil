"use client";
// Pestaña "Escalas paritarias": buscar un período, editarlo vía CSV y publicar.
// Lógica portada sin cambios desde la versión anterior de app/admin/page.jsx.
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { aNumero, formatearNumero } from "@/lib/numeros";
import {
  parsearCsvEscala, generarCsvEscala, plantillaEjemplo, tieneZonas, leerClave,
  validarPeriodo, revisarEscalaAntesDePublicar,
} from "@/lib/escalaCsv";
import { slug } from "@/lib/texto";

export default function EscalasTab({ convenios }) {
  const [convenioSeleccionado, setConvenioSeleccionado] = useState("");
  const [convenioCompleto, setConvenioCompleto] = useState(null);
  const [categoriasActuales, setCategoriasActuales] = useState([]);
  const [periodoID, setPeriodoID] = useState("");
  const [mesVigencia, setMesVigencia] = useState("");
  // El nombre de la segunda suma no remunerativa, sin incidencia, si la escala
  // la tiene. El monto viaja en el CSV; el nombre es del período.
  const [nombreSinIncidencia, setNombreSinIncidencia] = useState("");
  // Los importes por día, por km o por mes que fija la planilla (comida,
  // viático especial, pernoctada, km). Los usan los adicionales por unidad
  // del convenio, por su clave.
  const [valoresPeriodo, setValoresPeriodo] = useState([]);
  const [sueldos, setSueldos] = useState({});
  // Lo que ya estaba guardado en este periodo. Se usa para avisar que
  // publicar reemplaza el periodo entero y borra lo que no venga en el CSV.
  const [clavesPrevias, setClavesPrevias] = useState([]);

  useEffect(() => {
    if (convenios.length > 0 && !convenioSeleccionado) {
      setConvenioSeleccionado(convenios[0].id);
      setConvenioCompleto(convenios[0]);
      extraerCategorias(convenios[0]);
    }
  }, [convenios]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConvenioChange = (e) => {
    const id = e.target.value;
    setConvenioSeleccionado(id);
    const conv = convenios.find((c) => c.id === id);
    if (conv) {
      setConvenioCompleto(conv);
      extraerCategorias(conv);
    }
  };

  const extraerCategorias = (conv) => {
    const inputCat = conv.inputs_requeridos?.find((i) => i.id === "categoria");
    const cats = inputCat ? [...inputCat.opciones].sort((a, b) => a.localeCompare(b)) : [];
    setCategoriasActuales(cats);
    const estadoInicial = cats.reduce((acc, cat) => {
      acc[cat] = { basico: "", no_remunerativo: "" };
      return acc;
    }, {});
    setSueldos(estadoInicial);
    setPeriodoID("");
    setMesVigencia("");
    setNombreSinIncidencia("");
    setValoresPeriodo([]);
    setClavesPrevias([]);
  };

  const buscarPeriodo = async () => {
    const problemaPeriodo = validarPeriodo(periodoID);
    if (problemaPeriodo) return alert(problemaPeriodo);
    if (!convenioSeleccionado) return;

    try {
      const escalaRef = doc(db, "convenios", convenioSeleccionado, "escalas", periodoID);
      const escalaSnap = await getDoc(escalaRef);

      if (escalaSnap.exists()) {
        const data = escalaSnap.data();
        setMesVigencia(data.mes_vigencia);
        setNombreSinIncidencia(data.nombre_sin_incidencia || "");
        setValoresPeriodo(Object.entries(data.valores_del_periodo || {}).map(([clave, valor]) => ({ clave, valor })));

        const catsEscala = Object.keys(data.categorias || {});
        const listaCombinada = Array.from(new Set([...categoriasActuales, ...catsEscala])).sort((a, b) => a.localeCompare(b));
        setCategoriasActuales(listaCombinada);

        const sueldosCargados = {};
        listaCombinada.forEach((cat) => {
          sueldosCargados[cat] = {
            basico: data.categorias?.[cat]?.basico || "",
            no_remunerativo: data.categorias?.[cat]?.no_remunerativo || "",
            no_remunerativo_sin_incidencia: data.categorias?.[cat]?.no_remunerativo_sin_incidencia || "",
          };
        });
        setSueldos(sueldosCargados);
        setClavesPrevias(catsEscala);
        alert(`¡Período encontrado! Cargada la escala de: ${data.mes_vigencia}. Ya podés descargar el CSV para editarlo.`);
      } else {
        setClavesPrevias([]);
        setNombreSinIncidencia("");
        setValoresPeriodo([]);
        alert(
          "No hay una escala cargada para " + periodoID + "." + String.fromCharCode(10, 10) +
          "Descargá la plantilla CSV, completala con los sueldos del acuerdo y volvé a subirla."
        );
      }
    } catch (error) {
      console.error("Error al buscar período:", error);
    }
  };

  // El lector de números vive en lib/numeros.js. Esta función nació acá y era
  // la única de las tres del proyecto que estaba bien; se movió para que las
  // otras dos pestañas la usen y para poder testearla.
  const limpiarNumeroLatam = (valor) => aNumero(valor, 0);

  const descargarPlantilla = () => {
    // Para un convenio nuevo no hay categorías todavía: antes esto bajaba
    // sólo el encabezado y el formato de las columnas existía únicamente en
    // el código, así que había que adivinarlo.
    const hayCategorias = categoriasActuales.length > 0;
    const contenido = hayCategorias
      ? generarCsvEscala(categoriasActuales, sueldos)
      : plantillaEjemplo(!!convenioCompleto?.inputs_requeridos?.some((i) => i.id === "zona"));

    const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escala_${convenioSeleccionado || "convenio"}_${periodoID || "nuevo"}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    if (!hayCategorias) {
      alert(
        "Como este convenio todavía no tiene categorías, te bajé una plantilla con filas de EJEMPLO." + String.fromCharCode(10, 10) +
        "Reemplazá esas filas por las categorías reales del convenio y volvé a subir el archivo."
      );
    }
  };

  const cargarDesdeCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let contenido = String(event.target.result || "");
      // Excel guarda a veces en UTF-8 y otras en la codificación de Windows.
      // Si aparece el carácter de reemplazo, se reintenta con la otra.
      if (contenido.includes("\uFFFD")) {
        const otro = new TextDecoder("windows-1252").decode(new Uint8Array(event.target.resultBuffer || []));
        if (otro && !otro.includes("\uFFFD")) contenido = otro;
      }

      const { sueldos: leidos, claves, errores, advertencias } = parsearCsvEscala(contenido);

      if (errores.length) {
        alert(
          "El archivo tiene problemas y no se cargó nada:" + String.fromCharCode(10, 10) +
          errores.slice(0, 10).map((x) => "• " + x).join(String.fromCharCode(10)) +
          (errores.length > 10 ? String.fromCharCode(10) + "…y " + (errores.length - 10) + " más." : "")
        );
        e.target.value = null;
        return;
      }

      setCategoriasActuales(claves);
      setSueldos(leidos);

      const resumen = "Se leyeron " + claves.length + " categorías.";
      alert(
        advertencias.length
          ? resumen + String.fromCharCode(10, 10) + "Tené en cuenta:" + String.fromCharCode(10) + advertencias.map((x) => "• " + x).join(String.fromCharCode(10))
          : resumen + " Revisalos en la grilla y dale a Guardar."
      );
      e.target.value = null;
    };
    reader.readAsText(file, "utf-8");
  };

  const guardarEscalaParitaria = async (e) => {
    e.preventDefault();
    const problemaPeriodo = validarPeriodo(periodoID);
    if (problemaPeriodo) return alert(problemaPeriodo);
    if (!mesVigencia.trim()) return alert("Poné el nombre descriptivo del período. Por ejemplo: Septiembre 2026.");

    const { errores, advertencias } = revisarEscalaAntesDePublicar({
      claves: categoriasActuales,
      sueldos,
      clavesPrevias,
    });

    if (errores.length) {
      return alert("No se puede publicar:" + String.fromCharCode(10, 10) + errores.map((x) => "• " + x).join(String.fromCharCode(10)));
    }

    const aviso = advertencias.length
      ? "ATENCIÓN:" + String.fromCharCode(10) + advertencias.map((x) => "• " + x).join(String.fromCharCode(10)) + String.fromCharCode(10, 10) + "¿Publicar igual la paritaria de \"" + mesVigencia + "\"?"
      : "¿Confirmás publicar la paritaria de \"" + mesVigencia + "\"? Son " + categoriasActuales.length + " categorías.";
    if (!window.confirm(aviso)) return;

    try {
      const escalaRef = doc(db, "convenios", convenioSeleccionado, "escalas", periodoID);
      const categoriasLimpias = {};
      categoriasActuales.forEach((cat) => {
        categoriasLimpias[cat] = {
          basico: sueldos[cat]?.basico || 0,
          no_remunerativo: sueldos[cat]?.no_remunerativo || 0,
        };
        // La suma sin incidencia se escribe sólo si la hay, para no ensuciar
        // las escalas que no la usan con un campo en cero.
        const sinIncidencia = Number(sueldos[cat]?.no_remunerativo_sin_incidencia) || 0;
        if (sinIncidencia > 0) categoriasLimpias[cat].no_remunerativo_sin_incidencia = sinIncidencia;
      });

      const escalaDoc = { mes_vigencia: mesVigencia, categorias: categoriasLimpias };
      if (nombreSinIncidencia.trim()) escalaDoc.nombre_sin_incidencia = nombreSinIncidencia.trim();
      const valoresDelPeriodo = {};
      for (const v of valoresPeriodo) {
        const clave = slug(String(v.clave || "").trim(), "");
        if (!clave) continue;
        const numero = aNumero(v.valor, NaN);
        if (!Number.isFinite(numero)) return alert(`El valor del período "${clave}" no se entiende: ${v.valor}`);
        valoresDelPeriodo[clave] = numero;
      }
      if (Object.keys(valoresDelPeriodo).length) escalaDoc.valores_del_periodo = valoresDelPeriodo;
      await setDoc(escalaRef, escalaDoc);

      // Magia para crear las zonas y actualizar categorías automáticamente en el convenio
      const convenioRef = doc(db, "convenios", convenioSeleccionado);
      let inputsModificados = [...convenioCompleto.inputs_requeridos];

      const indexCategoria = inputsModificados.findIndex((i) => i.id === "categoria");
      if (indexCategoria !== -1) {
        const catPuras = Array.from(new Set(categoriasActuales.map((c) => leerClave(c).categoria)));
        const defaultActual = inputsModificados[indexCategoria].default;
        // Antes sólo se pisaban las opciones y nunca el default, así que todo
        // convenio nuevo quedaba con default "" y la calculadora tiraba
        // "La categoría no existe" a quien no tocara el desplegable.
        const defaultValido = catPuras.includes(defaultActual) ? defaultActual : catPuras[0] || "";
        inputsModificados[indexCategoria] = {
          ...inputsModificados[indexCategoria],
          opciones: catPuras,
          default: defaultValido,
        };
      }

      // Antes se miraba sólo categoriasActuales[0]: si el orden alfabético
      // ponía primero una fila sin zona, la columna se ignoraba entera.
      if (tieneZonas(categoriasActuales)) {
        const zonasPuras = Array.from(new Set(categoriasActuales.map((c) => leerClave(c).zona).filter(Boolean)));
        const indexZona = inputsModificados.findIndex((i) => i.id === "zona");

        if (indexZona !== -1) {
          const defZona = zonasPuras.includes(inputsModificados[indexZona].default)
            ? inputsModificados[indexZona].default
            : zonasPuras[0] || "";
          inputsModificados[indexZona] = { ...inputsModificados[indexZona], opciones: zonasPuras, default: defZona };
        } else {
          inputsModificados.unshift({
            id: "zona",
            tipo: "select",
            label: "Zona / Escala",
            default: zonasPuras[0],
            opciones: zonasPuras,
          });
        }
      }

      // Se anota hasta qué período llegan las escalas. La portada lo usa para
      // decir la verdad ("Escalas hasta septiembre 2026") en vez de afirmar que
      // están actualizadas, que es lo que venía diciendo incluso con dos meses
      // de atraso. Es un campo más en el setDoc que ya se hacía: cero consultas
      // nuevas en la portada.
      const periodoMasNuevo =
        !convenioCompleto.ultimo_periodo || periodoID > convenioCompleto.ultimo_periodo
          ? periodoID
          : convenioCompleto.ultimo_periodo;
      const nombreMasNuevo = periodoMasNuevo === periodoID ? mesVigencia : convenioCompleto.ultimo_periodo_nombre;

      const convenioActualizado = {
        ...convenioCompleto,
        inputs_requeridos: inputsModificados,
        ultimo_periodo: periodoMasNuevo,
        ultimo_periodo_nombre: nombreMasNuevo || mesVigencia,
      };
      await setDoc(convenioRef, convenioActualizado, { merge: true });
      setConvenioCompleto(convenioActualizado);

      setClavesPrevias([...categoriasActuales]);
      alert("Listo: se publicaron " + categoriasActuales.length + " categorías para " + mesVigencia + ".");
    } catch (error) {
      console.error(error);
      alert("Error al guardar.");
    }
  };

  return (
    <form onSubmit={guardarEscalaParitaria} className="space-y-6">
      <div className="flex flex-col bg-slate-50 p-4 rounded-xl border border-slate-200">
        <label className="text-sm font-bold text-slate-700 mb-2">Convenio</label>
        <select
          value={convenioSeleccionado}
          onChange={handleConvenioChange}
          className="w-full border border-slate-300 p-2.5 rounded-lg outline-none bg-white font-medium text-gray-700"
        >
          {convenios.map((conv) => (
            <option key={conv.id} value={conv.id}>
              {conv.nombre} (CCT {conv.cct}){conv.activo === false ? " — inactivo, no se ve en la web" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-blue-50/50 p-5 rounded-xl border border-blue-100 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-bold text-blue-900 mb-1">ID del Período (Ruta URL)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={periodoID}
              onChange={(e) => setPeriodoID(e.target.value)}
              placeholder="ej: 2026-08"
              className="w-full border border-blue-200 p-2.5 rounded-lg outline-none bg-white font-mono text-sm"
            />
            <button type="button" onClick={buscarPeriodo} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm text-sm">
              Buscar
            </button>
          </div>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-sm font-bold text-blue-900 mb-1">Nombre Descriptivo</label>
          <input
            type="text"
            value={mesVigencia}
            onChange={(e) => setMesVigencia(e.target.value)}
            placeholder="ej: Agosto 2026"
            className="w-full border border-blue-200 p-2.5 rounded-lg outline-none bg-white text-sm font-medium"
          />
        </div>
      </div>

      {/* Una segunda suma no remunerativa, sin incidencia (no genera antigüedad
          ni presentismo, no entra en ninguna base). El monto va en el CSV, en la
          columna no_remunerativo_sin_incidencia; acá sólo va su nombre. */}
      <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
        <label className="block text-sm font-bold text-blue-900 mb-1">Nombre de la suma no remunerativa sin incidencia (opcional)</label>
        <input
          type="text"
          value={nombreSinIncidencia}
          onChange={(e) => setNombreSinIncidencia(e.target.value)}
          placeholder="ej: Asignación Extraordinaria por Única Vez – Revisión 2026"
          className="w-full border border-blue-200 p-2.5 rounded-lg outline-none bg-white text-sm"
        />
        <p className="text-[11px] text-blue-800/70 mt-1">
          Es como aparece en el recibo. El monto va en el CSV, en la columna <code>no_remunerativo_sin_incidencia</code>:
          no genera antigüedad ni presentismo, y no paga aportes ni contribuciones. Si ninguna categoría la tiene, dejalo vacío.
        </p>
      </div>

      {/* Valores del período: los importes por día, por km o por mes que fija la
          planilla. Los usan los adicionales por unidad del convenio, por su clave. */}
      <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-bold text-blue-900">Valores del período (opcional)</label>
          <button type="button" onClick={() => setValoresPeriodo((v) => [...v, { clave: "", valor: "" }])} className="text-xs font-bold text-blue-700 hover:text-blue-900">+ Agregar valor</button>
        </div>
        <p className="text-[11px] text-blue-800/70 mb-2">
          Los importes por día, por kilómetro o por mes que fija la planilla (comida, viático especial, pernoctada, km).
          La clave tiene que ser la misma que usa el adicional en Convenios. Si el convenio no los usa, dejalo vacío.
        </p>
        {valoresPeriodo.length > 0 && (
          <div className="space-y-2">
            {valoresPeriodo.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input value={v.clave} onChange={(e) => setValoresPeriodo((xs) => xs.map((x, j) => (j === i ? { ...x, clave: e.target.value } : x)))} placeholder="clave (ej: comida)" className="border border-blue-200 p-2 rounded-lg outline-none bg-white text-sm font-mono" />
                <input value={v.valor} onChange={(e) => setValoresPeriodo((xs) => xs.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} placeholder="importe (ej: 16219,85)" inputMode="decimal" className="border border-blue-200 p-2 rounded-lg outline-none bg-white text-sm font-mono text-right" />
                <button type="button" onClick={() => setValoresPeriodo((xs) => xs.filter((_, j) => j !== i))} title="Quitar" className="text-rose-500 hover:text-rose-700 font-bold px-2">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-slate-100 p-4 rounded-xl border border-slate-200 items-center justify-center">
        <button type="button" onClick={descargarPlantilla} className="bg-white hover:bg-gray-50 text-slate-800 font-bold px-6 py-3 rounded-lg border border-slate-300 shadow-sm text-sm w-full sm:w-auto">
          📥 Descargar CSV de este mes
        </button>

        <label className="bg-slate-800 hover:bg-black text-white font-bold px-6 py-3 rounded-lg text-sm cursor-pointer shadow-sm w-full sm:w-auto text-center">
          📂 Subir archivo CSV editado
          <input type="file" accept=".csv" onChange={cargarDesdeCSV} className="hidden" />
        </label>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 bg-slate-800 text-white p-2.5 rounded-lg shadow-sm">
          Vista Previa de Datos a Publicar
        </h2>

        {categoriasActuales.length === 0 ? (
          <div className="text-gray-400 py-8 text-center border border-dashed rounded-xl bg-white text-sm">
            Ingresá un ID de período y dale a "Buscar", o subí un CSV directamente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2 bg-gray-50 border rounded-lg">
            {categoriasActuales.map((categoria) => {
              // Los números se muestran formateados en es-AR y el básico en cero
              // se marca en rojo. Es el control de calidad más barato que hay:
              // es lo que vuelve visible de un vistazo un 1,50 donde iba 1.500.
              const basico = Number(sueldos[categoria]?.basico) || 0;
              const noRem = Number(sueldos[categoria]?.no_remunerativo) || 0;
              const sinIncidencia = Number(sueldos[categoria]?.no_remunerativo_sin_incidencia) || 0;
              const sinBasico = basico <= 0;
              return (
                <div
                  key={categoria}
                  className={`bg-white p-3 border rounded-lg shadow-sm transition-colors ${
                    sinBasico ? "border-rose-300 bg-rose-50/50" : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <p className="font-bold text-slate-700 text-xs mb-2 border-b pb-1 text-blue-800">
                    {categoria.includes("|") ? categoria.replace("|", " - ") : categoria}
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-[9px] uppercase text-gray-400 font-bold mb-0.5">Básico</p>
                      <p className={`text-sm font-mono ${sinBasico ? "text-rose-600 font-bold" : "text-gray-800"}`}>
                        ${formatearNumero(basico)}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] uppercase text-gray-400 font-bold mb-0.5">No Rem.</p>
                      <p className="text-sm font-mono text-gray-800">${formatearNumero(noRem)}</p>
                    </div>
                    {sinIncidencia > 0 && (
                      <div className="flex-1">
                        <p className="text-[9px] uppercase text-gray-400 font-bold mb-0.5">Sin incid.</p>
                        <p className="text-sm font-mono text-gray-800">${formatearNumero(sinIncidencia)}</p>
                      </div>
                    )}
                  </div>
                  {sinBasico && (
                    <p className="text-[10px] text-rose-600 mt-1.5 font-medium">Sin sueldo básico cargado</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-md transition-all text-lg">
        Guardar y Publicar en Base de Datos
      </button>
    </form>
  );
}

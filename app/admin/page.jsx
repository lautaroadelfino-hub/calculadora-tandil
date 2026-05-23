"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, getDoc, setDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

export default function AdminPage() {
  const router = useRouter();

  const [verificando, setVerificando] = useState(true);
  const [accesoPermitido, setAccesoPermitido] = useState(false);
  const [convenios, setConvenios] = useState([]);
  const [convenioSeleccionado, setConvenioSeleccionado] = useState("");
  const [convenioCompleto, setConvenioCompleto] = useState(null); 
  const [categoriasActuales, setCategoriasActuales] = useState([]);
  
  const [periodoID, setPeriodoID] = useState("");
  const [mesVigencia, setMesVigencia] = useState("");
  const [sueldos, setSueldos] = useState({});

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAccesoPermitido(true);
        cargarConveniosActivos();
      } else {
        router.push("/login");
      }
      setVerificando(false);
    });
    return () => unsubscribe();
  }, [router]);

  const cargarConveniosActivos = async () => {
    try {
      const q = query(collection(db, "convenios"), where("activo", "==", true));
      const querySnapshot = await getDocs(q);
      const lista = [];
      querySnapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
      setConvenios(lista);
      if (lista.length > 0) {
        setConvenioSeleccionado(lista[0].id);
        setConvenioCompleto(lista[0]);
        extraerCategorias(lista[0]);
      }
    } catch (error) { console.error(error); }
  };

  const handleConvenioChange = (e) => {
    const id = e.target.value;
    setConvenioSeleccionado(id);
    const conv = convenios.find(c => c.id === id);
    if (conv) {
      setConvenioCompleto(conv);
      extraerCategorias(conv);
    }
  };

  const extraerCategorias = (conv) => {
    const inputCat = conv.inputs_requeridos?.find(i => i.id === "categoria");
    const cats = inputCat ? [...inputCat.opciones].sort((a, b) => a.localeCompare(b)) : [];
    setCategoriasActuales(cats);
    const estadoInicial = cats.reduce((acc, cat) => {
      acc[cat] = { basico: "", no_remunerativo: "" };
      return acc;
    }, {});
    setSueldos(estadoInicial);
    setPeriodoID("");
    setMesVigencia("");
  };

  // --- GESTIÓN DE CONVENIOS MADRE (JSON) ---
  const descargarConvenioJSON = () => {
    if (!convenioCompleto) return alert("Seleccioná un convenio primero.");
    
    const jsonString = JSON.stringify(convenioCompleto, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `convenio_${convenioCompleto.id}.json`;
    a.click();
  };

  const cargarConvenioJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const contenido = event.target.result;
        const nuevoConvenio = JSON.parse(contenido);

        if (!nuevoConvenio.id || !nuevoConvenio.nombre) {
          throw new Error("El archivo no tiene el formato correcto (falta ID o nombre).");
        }

        const seguro = window.confirm(`¿Estás seguro de subir y actualizar la configuración del convenio "${nuevoConvenio.nombre}"?`);
        if (!seguro) {
          e.target.value = null;
          return;
        }

        const convenioRef = doc(db, "convenios", nuevoConvenio.id);
        await setDoc(convenioRef, nuevoConvenio);
        
        alert(`¡Convenio "${nuevoConvenio.nombre}" guardado con éxito en la base de datos!`);
        cargarConveniosActivos(); 
      } catch (error) {
        console.error("Error procesando JSON:", error);
        alert("Error al procesar el archivo: " + error.message);
      }
      e.target.value = null; 
    };
    reader.readAsText(file, "windows-1252");
  };

  // --- RECUPERAMOS LA FUNCIÓN DE BÚSQUEDA ---
  const buscarPeriodo = async () => {
    if (!periodoID) return alert("Ingresá un ID de período para buscar (ej: 2026-04)");
    if (!convenioSeleccionado) return;

    try {
      const escalaRef = doc(db, "convenios", convenioSeleccionado, "escalas", periodoID);
      const escalaSnap = await getDoc(escalaRef);

      if (escalaSnap.exists()) {
        const data = escalaSnap.data();
        setMesVigencia(data.mes_vigencia);

        const catsEscala = Object.keys(data.categorias || {});
        const listaCombinada = Array.from(new Set([...categoriasActuales, ...catsEscala])).sort((a, b) => a.localeCompare(b));
        setCategoriasActuales(listaCombinada);

        const sueldosCargados = {};
        listaCombinada.forEach(cat => {
          sueldosCargados[cat] = {
            basico: data.categorias?.[cat]?.basico || "",
            no_remunerativo: data.categorias?.[cat]?.no_remunerativo || ""
          };
        });
        setSueldos(sueldosCargados);
        alert(`¡Período encontrado! Cargada la escala de: ${data.mes_vigencia}. Ya podés descargar el CSV para editarlo.`);
      } else {
        alert("No se encontró este mes. Podés crear uno nuevo usando la plantilla CSV.");
      }
    } catch (error) {
      console.error("Error al buscar período:", error);
    }
  };

  // --- FUNCIONES CSV ---
  const limpiarNumeroLatam = (valor) => {
    if (valor === undefined || valor === null) return 0;
    let s = String(valor).trim().replace(/[^0-9,.\-]/g, ""); 
    if (!s) return 0;
    const tieneComa = s.includes(",");
    const tienePunto = s.includes(".");
    if (tieneComa && tienePunto) {
      const posComa = s.lastIndexOf(",");
      const posPunto = s.lastIndexOf(".");
      s = posComa > posPunto ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    } else if (tieneComa) {
      s = s.replace(",", ".");
    } else if (tienePunto && (s.split('.').length > 2 || s.split('.')[1]?.length === 3)) {
      s = s.replace(/\./g, "");
    }
    const res = Number(s);
    return isFinite(res) ? res : 0;
  };

  const descargarPlantilla = () => {
    let cabecera = "categoria,basico,no_remunerativo\n";
    if (categoriasActuales[0]?.includes('|')) {
        cabecera = "zona,categoria,basico,no_remunerativo\n";
    }
    
    const filas = categoriasActuales.map(cat => {
        const filaBasico = sueldos[cat]?.basico || 0;
        const filaNr = sueldos[cat]?.no_remunerativo || 0;
        if (cat.includes('|')) {
            const [zona, categoria] = cat.split('|');
            return `${zona},${categoria},${filaBasico},${filaNr}`;
        }
        return `${cat},${filaBasico},${filaNr}`;
    }).join("\n");

    const blob = new Blob([cabecera + filas], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `escala_${periodoID || 'nuevo'}.csv`;
    a.click();
  };

  const cargarDesdeCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const contenido = event.target.result;
      const lineasTotales = contenido.replace(/\r/g, '').split('\n');
      if (lineasTotales.length < 2) return alert("El archivo está vacío.");

      const header = lineasTotales[0].toLowerCase();
      const separador = header.includes(';') ? ';' : ',';
      const tieneZona = header.includes('zona') || header.includes('escala');

      const lineas = lineasTotales.slice(1);
      
      const nuevosSueldos = {};
      const nuevasCategorias = [];
      
      lineas.forEach(linea => {
        if (!linea.trim()) return;
        const columnas = linea.split(separador);
        
        let claveCat, bas, nr;

        if (tieneZona && columnas.length >= 4) {
          claveCat = `${columnas[0].trim()}|${columnas[1].trim()}`;
          bas = columnas[2];
          nr = columnas[3];
        } else {
          claveCat = columnas[0]?.trim();
          bas = columnas[1];
          nr = columnas[2];
        }
        
        if (claveCat && claveCat !== "" && claveCat !== "|") {
          nuevasCategorias.push(claveCat);
          nuevosSueldos[claveCat] = { 
            basico: limpiarNumeroLatam(bas), 
            no_remunerativo: limpiarNumeroLatam(nr) 
          };
        }
      });
      
      setCategoriasActuales(nuevasCategorias.sort((a, b) => a.localeCompare(b)));
      setSueldos(nuevosSueldos);
      alert("¡Datos cargados del archivo exitosamente! Revisalos en la grilla y dale a Guardar.");
      e.target.value = null; 
    };
    reader.readAsText(file, "windows-1252");
  };

  const guardarEscalaParitaria = async (e) => {
    e.preventDefault();
    if (!periodoID || !mesVigencia) return alert("Completá el ID del período y el nombre descriptivo.");
    
    const seguro = window.confirm(`¿Confirmás guardar la paritaria de "${mesVigencia}"?`);
    if (!seguro) return;

    try {
      const escalaRef = doc(db, "convenios", convenioSeleccionado, "escalas", periodoID);
      const categoriasLimpias = {};
      categoriasActuales.forEach(cat => {
        categoriasLimpias[cat] = {
          basico: sueldos[cat]?.basico || 0,
          no_remunerativo: sueldos[cat]?.no_remunerativo || 0
        };
      });

      await setDoc(escalaRef, { mes_vigencia: mesVigencia, categorias: categoriasLimpias });

      // Magia para crear las zonas y actualizar categorías automáticamente en el convenio
      const convenioRef = doc(db, "convenios", convenioSeleccionado);
      let inputsModificados = [...convenioCompleto.inputs_requeridos];
      
      // Actualizamos opciones de categoría pura
      const indexCategoria = inputsModificados.findIndex(i => i.id === "categoria");
      if (indexCategoria !== -1) {
         const catPuras = Array.from(new Set(categoriasActuales.map(c => c.includes('|') ? c.split('|')[1] : c)));
         inputsModificados[indexCategoria] = { ...inputsModificados[indexCategoria], opciones: catPuras };
      }

      // Procesamos las zonas
      if (categoriasActuales[0]?.includes('|')) {
         const zonasPuras = Array.from(new Set(categoriasActuales.map(c => c.split('|')[0])));
         const indexZona = inputsModificados.findIndex(i => i.id === "zona");
         
         if (indexZona !== -1) {
            inputsModificados[indexZona] = { ...inputsModificados[indexZona], opciones: zonasPuras };
         } else {
            // Si no existía el input 'zona', lo inyectamos al principio de la calculadora
            inputsModificados.unshift({
               id: "zona",
               tipo: "select",
               label: "Zona / Escala",
               default: zonasPuras[0],
               opciones: zonasPuras
            });
         }
      }

      await setDoc(convenioRef, { ...convenioCompleto, inputs_requeridos: inputsModificados }, { merge: true });
      
      // Forzamos actualización visual inmediata
      setConvenioCompleto({ ...convenioCompleto, inputs_requeridos: inputsModificados });

      alert(`¡Éxito! Sueldos publicados y base de datos sincronizada.`);
    } catch (error) { console.error(error); alert("Error al guardar."); }
  };

  const cerrarSesion = async () => {
    try { await signOut(auth); router.push("/"); } 
    catch (error) { console.error(error); }
  };

  if (verificando) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500 font-medium animate-pulse text-lg">Verificando credenciales...</div></div>;
  if (!accesoPermitido) return null;

  return (
    <div className="max-w-5xl mx-auto p-8 mt-10 bg-white rounded-xl shadow-lg border border-gray-200 mb-20">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Panel de Administración</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión avanzada de escalas y reglas</p>
        </div>
        <button onClick={cerrarSesion} type="button" className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2 px-4 border border-red-200 rounded-lg text-sm">
          Cerrar Sesión
        </button>
      </div>

      <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
        <label className="block text-sm font-bold text-slate-700 mb-2">Gestión de Convenios Colectivos (Reglas Madre)</label>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <select value={convenioSeleccionado} onChange={handleConvenioChange} className="w-full md:flex-1 border border-slate-300 p-2.5 rounded-lg outline-none bg-white font-medium text-gray-700">
            {convenios.map(conv => <option key={conv.id} value={conv.id}>{conv.nombre} (CCT {conv.cct})</option>)}
          </select>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button type="button" onClick={descargarConvenioJSON} className="bg-white hover:bg-gray-100 text-slate-700 font-bold px-4 py-2.5 rounded-lg border border-slate-300 shadow-sm text-xs w-full sm:w-auto text-center transition-colors">
              ⚙️ Descargar Reglas (JSON)
            </button>
            <label className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer shadow-sm w-full sm:w-auto text-center transition-colors">
              🚀 Subir Convenio (JSON)
              <input type="file" accept=".json" onChange={cargarConvenioJSON} className="hidden" />
            </label>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">Para crear un gremio nuevo, descargá un JSON existente, cambiale el "id", editá las reglas, y subilo.</p>
      </div>

      <form onSubmit={guardarEscalaParitaria} className="space-y-6 border-t border-gray-100 pt-6">
        
        <div className="flex flex-col md:flex-row gap-4 bg-blue-50/50 p-5 rounded-xl border border-blue-100 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-blue-900 mb-1">ID del Período (Ruta URL)</label>
            <div className="flex gap-2">
              <input type="text" value={periodoID} onChange={(e) => setPeriodoID(e.target.value)} placeholder="ej: 2026-04" className="w-full border border-blue-200 p-2.5 rounded-lg outline-none bg-white font-mono text-sm" />
              <button type="button" onClick={buscarPeriodo} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm text-sm">
                Buscar
              </button>
            </div>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-blue-900 mb-1">Nombre Descriptivo</label>
            <input type="text" value={mesVigencia} onChange={(e) => setMesVigencia(e.target.value)} placeholder="ej: Abril 2026" className="w-full border border-blue-200 p-2.5 rounded-lg outline-none bg-white text-sm font-medium" />
          </div>
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
              {categoriasActuales.map(categoria => (
                <div key={categoria} className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 transition-colors">
                  <p className="font-bold text-slate-700 text-xs mb-2 border-b pb-1 text-blue-800">
                    {categoria.includes('|') ? categoria.replace('|', ' - ') : categoria}
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-[9px] uppercase text-gray-400 font-bold mb-0.5">Básico</p>
                      <p className="text-sm font-mono text-gray-800">${sueldos[categoria]?.basico || 0}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] uppercase text-gray-400 font-bold mb-0.5">No Rem.</p>
                      <p className="text-sm font-mono text-gray-800">${sueldos[categoria]?.no_remunerativo || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-md transition-all text-lg mt-6">
          Guardar y Publicar en Base de Datos
        </button>
      </form>
    </div>
  );
}
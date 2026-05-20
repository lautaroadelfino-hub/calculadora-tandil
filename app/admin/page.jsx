"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth"; // <-- Sumamos signOut
import { db, auth } from "@/lib/firebase"; // <-- Sumamos auth

// Definimos todas las categorías del CCT 130/75 en un array
const categoriasComercio = [
  "Maestranza A", "Maestranza B", "Maestranza C",
  "Administrativo A", "Administrativo B", "Administrativo C", "Administrativo D", "Administrativo E", "Administrativo F",
  "Cajero A", "Cajero B", "Cajero C",
  "Personal Auxiliar A", "Personal Auxiliar B", "Personal Auxiliar C",
  "Auxiliar Especializado A", "Auxiliar Especializado B",
  "Vendedor A", "Vendedor B", "Vendedor C", "Vendedor D"
];

export default function AdminPage() {
  const router = useRouter(); // <-- Iniciamos el router para poder redirigir

  // --- NUEVOS ESTADOS DE SEGURIDAD ---
  const [verificando, setVerificando] = useState(true);
  const [accesoPermitido, setAccesoPermitido] = useState(false);

  // --- ESTADOS DE TU FORMULARIO ---
  const [periodoID, setPeriodoID] = useState("2026-04");
  const [mesVigencia, setMesVigencia] = useState("Abril 2026");

  // Creamos el estado inicial dinámicamente leyendo el array
  const estadoInicialSueldos = categoriasComercio.reduce((acc, cat) => {
    acc[cat] = { basico: "", no_remunerativo: "" };
    return acc;
  }, {});

  const [sueldos, setSueldos] = useState(estadoInicialSueldos);

  // --- EFECTO DE SEGURIDAD (EL "PATOVICA") ---
  useEffect(() => {
    if (!auth) return; // Si auth no cargó, esperamos

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAccesoPermitido(true); // Está logueado, lo dejamos pasar
      } else {
        router.push("/login"); // No está logueado, lo mandamos al login
      }
      setVerificando(false);
    });

    return () => unsubscribe();
  }, [router]);

  // --- FUNCIÓN PARA CERRAR SESIÓN ---
  const cerrarSesion = async () => {
    try {
      await signOut(auth);
      router.push("/"); // Lo manda a la home después de salir
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const handleSueldoChange = (categoria, campo, valor) => {
    setSueldos(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        [campo]: valor === "" ? "" : Number(valor)
      }
    }));
  };

  const guardarEscalaParitaria = async (e) => {
    e.preventDefault();
    if (!periodoID || !mesVigencia) {
      alert("Completá el ID del período y el nombre.");
      return;
    }

    try {
      const escalaRef = doc(db, "convenios", "comercio-cct-130-75", "escalas", periodoID);
      
      // Limpiamos los datos para mandar a Firebase (convertimos vacíos en 0)
      const categoriasLimpias = {};
      categoriasComercio.forEach(cat => {
        categoriasLimpias[cat] = {
          basico: sueldos[cat].basico || 0,
          no_remunerativo: sueldos[cat].no_remunerativo || 0
        };
      });

      await setDoc(escalaRef, {
        mes_vigencia: mesVigencia,
        categorias: categoriasLimpias
      });

      alert(`¡La escala de ${mesVigencia} con todas las categorías se guardó con éxito!`);
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error de conexión.");
    }
  };

  // --- PANTALLAS DE CARGA Y BLOQUEO ---
  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 font-medium animate-pulse text-lg">Verificando credenciales de administrador...</div>
      </div>
    );
  }

  if (!accesoPermitido) return null; // Si no tiene permiso, la pantalla queda en blanco mientras lo patea

  // --- RENDER DEL PANEL (SI PASÓ LA SEGURIDAD) ---
  return (
    <div className="max-w-5xl mx-auto p-8 mt-10 bg-white rounded-xl shadow-lg border border-gray-200 mb-20">
      
      {/* HEADER CON TÍTULO Y BOTÓN DE CERRAR SESIÓN */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Carga de Paritarias Completa</h1>
        <button 
          onClick={cerrarSesion}
          type="button"
          className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2 px-4 border border-red-200 rounded-lg shadow-sm transition-colors text-sm"
        >
          Cerrar Sesión
        </button>
      </div>

      <p className="text-gray-500 mb-8 border-b pb-4">CCT 130/75 - Empleados de Comercio</p>

      <form onSubmit={guardarEscalaParitaria} className="space-y-8">
        <div className="flex gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-1">ID del Período (URL)</label>
            <input type="text" value={periodoID} onChange={(e) => setPeriodoID(e.target.value)} className="w-full border p-2 rounded outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre a Mostrar</label>
            <input type="text" value={mesVigencia} onChange={(e) => setMesVigencia(e.target.value)} className="w-full border p-2 rounded outline-none" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 bg-gray-800 text-white p-2 rounded">Grilla Salarial</h2>
          
          {/* Se dibuja automáticamente toda la lista de categorías */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {categoriasComercio.map((categoria) => (
              <div key={categoria} className="flex flex-col bg-gray-50 p-3 rounded border border-gray-200 hover:bg-blue-50 transition-colors">
                <div className="font-bold text-blue-800 text-sm mb-2 border-b pb-1">{categoria}</div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Básico ($)</label>
                    <input 
                      type="number" 
                      value={sueldos[categoria].basico} 
                      onChange={(e) => handleSueldoChange(categoria, 'basico', e.target.value)}
                      className="w-full border p-1 text-sm rounded outline-none" placeholder="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">No Remun. ($)</label>
                    <input 
                      type="number" 
                      value={sueldos[categoria].no_remunerativo} 
                      onChange={(e) => handleSueldoChange(categoria, 'no_remunerativo', e.target.value)}
                      className="w-full border p-1 text-sm rounded outline-none" placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg shadow-md transition-all text-lg">
          Guardar y Publicar Escala Completa
        </button>
      </form>
    </div>
  );
}
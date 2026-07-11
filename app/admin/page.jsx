"use client";
// Panel de administración con secciones:
//   Escalas paritarias · Convenios (reglas) · Ganancias · Novedades
// Cada sección vive en components/admin/*.jsx.
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

import EscalasTab from "@/components/admin/EscalasTab";
import ConveniosTab from "@/components/admin/ConveniosTab";
import GananciasTab from "@/components/admin/GananciasTab";
import NovedadesTab from "@/components/admin/NovedadesTab";

const TABS = [
  { id: "escalas", label: "Escalas paritarias", icon: "📊" },
  { id: "convenios", label: "Convenios", icon: "⚙️" },
  { id: "ganancias", label: "Ganancias", icon: "💰" },
  { id: "novedades", label: "Novedades", icon: "📰" },
];

export default function AdminPage() {
  const router = useRouter();

  const [verificando, setVerificando] = useState(true);
  const [accesoPermitido, setAccesoPermitido] = useState(false);
  const [convenios, setConvenios] = useState([]);
  const [tabActiva, setTabActiva] = useState("escalas");

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
    } catch (error) {
      console.error(error);
    }
  };

  const cerrarSesion = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error(error);
    }
  };

  if (verificando)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 font-medium animate-pulse text-lg">Verificando credenciales...</div>
      </div>
    );
  if (!accesoPermitido) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 mt-6 mb-20">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Panel de Administración</h1>
          <p className="text-gray-500 text-sm mt-1">Escalas, convenios, impuestos y novedades</p>
        </div>
        <button
          onClick={cerrarSesion}
          type="button"
          className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2 px-4 border border-red-200 rounded-lg text-sm self-start md:self-auto"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTabActiva(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tabActiva === tab.id
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/60"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
        {tabActiva === "escalas" && <EscalasTab convenios={convenios} />}
        {tabActiva === "convenios" && (
          <ConveniosTab convenios={convenios} onConveniosChanged={cargarConveniosActivos} />
        )}
        {tabActiva === "ganancias" && <GananciasTab />}
        {tabActiva === "novedades" && <NovedadesTab />}
      </div>
    </div>
  );
}

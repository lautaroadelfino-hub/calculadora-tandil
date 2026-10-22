"use client";
// components/admin/BandejaTab.jsx
// Pestaña "Bandeja": lo que el vigía (scripts/vigia.mjs) dejó preparado en la
// colección `borradores`, el estado de sus corridas y las últimas diez. Lee la
// colección entera y ordena en memoria (sin índices compuestos); la pintura
// está en Bandeja.jsx, que no sabe de Firebase.
//
// "Abrir" se lo pasa a app/admin/page.jsx, que cambia a la pestaña que publica
// ese tipo de borrador con todo precargado. "Descartar" lo cierra acá: el vigía
// no vuelve a crear un borrador descartado.
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, getDoc, doc, updateDoc, query, orderBy, limit, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ordenarBorradores } from "@/lib/vigia/bandeja";
import Bandeja from "./Bandeja";

export default function BandejaTab({ convenios = [], onAbrir }) {
  const [borradores, setBorradores] = useState(null);
  const [estado, setEstado] = useState(null);
  const [corridas, setCorridas] = useState([]);

  const cargar = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "borradores"));
      const lista = [];
      snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
      setBorradores(ordenarBorradores(lista));
    } catch (e) {
      console.error(e);
      setBorradores([]);
    }
    try {
      const s = await getDoc(doc(db, "vigia", "estado"));
      setEstado(s.exists() ? s.data() : null);
    } catch (e) {
      console.error(e);
    }
    try {
      const s = await getDocs(query(collection(db, "vigia_corridas"), orderBy(documentId(), "desc"), limit(10)));
      const lista = [];
      s.forEach((d) => lista.push({ id: d.id, ...d.data() }));
      setCorridas(lista);
    } catch (e) {
      console.error(e);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const descartar = async (b) => {
    if (!window.confirm(`¿Descartar "${b.resumen}"? El vigía no lo vuelve a preparar.`)) return;
    try {
      const ahora = new Date().toISOString();
      await updateDoc(doc(db, "borradores", b.id), { estado: "descartado", descartadoEl: ahora, actualizadoEl: ahora });
      cargar();
    } catch (e) {
      console.error(e);
      alert("No se pudo descartar: " + (e.message || e));
    }
  };

  return (
    <Bandeja
      borradores={borradores || []}
      cargando={borradores === null}
      estado={estado}
      corridas={corridas}
      convenios={convenios}
      onAbrir={onAbrir}
      onDescartar={descartar}
    />
  );
}

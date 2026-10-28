// test/vigia/ayudas/firestoreFalso.js
// Un Firestore de mentira con la misma interfaz que scripts/vigia/firestore.mjs:
// tablas publicadas y borradores en memoria, y el registro de cada escritura.
export function firestoreFalso({ tablas = {}, borradores = {} } = {}) {
  const docs = { ...borradores };
  return {
    escrituras: [],
    async listar(coleccion) {
      if (coleccion === "parametros_contribuciones") return Object.entries(tablas).map(([id, t]) => ({ id, ...t }));
      if (coleccion === "borradores") return Object.entries(docs).map(([id, b]) => ({ id, ...b, _updateTime: "u1" }));
      return [];
    },
    async leer(ruta) {
      const [coleccion, id] = ruta.split("/");
      if (coleccion === "parametros_contribuciones") return tablas[id] || null;
      if (coleccion === "borradores") return docs[id] || null;
      return null;
    },
    async leerCrudo(ruta) {
      const id = ruta.replace("borradores/", "");
      return docs[id] ? { campos: docs[id], updateTime: "u1" } : null;
    },
    async crear(ruta, datos) {
      const id = ruta.replace("borradores/", "");
      if (docs[id]) return { creado: false, existia: true };
      docs[id] = datos;
      this.escrituras.push(["crear", id]);
      return { creado: true };
    },
    async actualizar(ruta, cambios, opciones) {
      const id = ruta.replace("borradores/", "");
      docs[id] = { ...docs[id], ...cambios };
      this.escrituras.push(["actualizar", id, Object.keys(cambios), opciones]);
      return { actualizado: true };
    },
    async reemplazar(ruta, datos) {
      this.escrituras.push(["reemplazar", ruta]);
      return datos;
    },
    docs,
  };
}

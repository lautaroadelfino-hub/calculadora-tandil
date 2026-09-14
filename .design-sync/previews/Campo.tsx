import { Campo } from "liquidar-ui";

const select = "border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white outline-none w-full";

export const ConDesplegable = () => (
  <div style={{ width: 360 }}>
    <Campo label="Categoría" htmlFor="categoria">
      <select id="categoria" className={select} defaultValue="Conductor de primera categoría">
        <option>Conductor de primera categoría</option>
        <option>Conductor de segunda categoría</option>
        <option>Peón</option>
      </select>
    </Campo>
  </div>
);

export const ConAyuda = () => (
  <div style={{ width: 360 }}>
    <Campo label="Régimen de contribuciones" htmlFor="regimen" ayuda="Si no sabés, dejá el que está: es el de la mayoría de los empleadores.">
      <select id="regimen" className={select} defaultValue="mipyme">
        <option value="mipyme">Resto de actividades y MiPyME (18%) · el más común</option>
        <option value="grande">Servicios y comercio, empresas grandes (20,40%)</option>
      </select>
    </Campo>
  </div>
);

export const ConError = () => (
  <div style={{ width: 360 }}>
    <Campo label="Período a liquidar" htmlFor="periodo" error="Elegí el mes que querés liquidar.">
      <select id="periodo" className={`${select} border-rose-400 bg-rose-50`} defaultValue="">
        <option value="">—</option>
        <option>Agosto 2026</option>
      </select>
    </Campo>
  </div>
);

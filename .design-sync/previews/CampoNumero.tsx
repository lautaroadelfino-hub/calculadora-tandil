import { CampoNumero } from "liquidar-ui";

export const Completo = () => (
  <div style={{ width: 360, display: "grid", gap: 16 }}>
    <CampoNumero id="carga_horaria" label="Horas semanales (jornada completa del CCT: 44)" value="44" />
    <CampoNumero id="antiguedad" label="Años de antigüedad" value="7" />
  </div>
);

export const ConError = () => (
  <div style={{ width: 360, display: "grid", gap: 16 }}>
    <CampoNumero id="horas_vacias" label="Horas Semanales (Jornada)" value="" error="Cargá las horas semanales que trabaja. La jornada completa de este convenio es de 48 hs." />
    <CampoNumero id="pernoctes" label="Noches que pernoctó fuera de su residencia" value="999" error="999 días en un mes no es posible (máximo 31)." />
  </div>
);

export const Corto = () => (
  <div style={{ width: 360, display: "flex", justifyContent: "space-between", gap: 12 }}>
    <span className="text-sm text-slate-700 pt-2">
      Alícuota de ART
      <span className="block text-[11px] text-slate-500">La de tu póliza, en %. La típica de esta actividad es 5%.</span>
    </span>
    <CampoNumero id="art" label="" value="5" ancho="corto" />
  </div>
);

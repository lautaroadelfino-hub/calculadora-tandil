import { Plegable, CampoNumero, Casilla } from "liquidar-ui";

export const EmpleadorAbierto = () => (
  <div style={{ width: 420 }}>
    <Plegable titulo="Lo que paga el empleador" tono="indigo" textoPlegado="Ver · ya tiene valores por defecto" abierto>
      <p className="text-[11px] text-slate-500 -mt-1">
        Desde el 01/06/2026 el recibo muestra las contribuciones del empleador. Se calculan solas con la tabla del mes; acá van los dos datos que dependen de cada empleador.
      </p>
      <CampoNumero id="art_alicuota" label="Alícuota de ART" ayuda="La de tu póliza, en %. La típica de esta actividad es 5%." value="5" />
    </Plegable>
  </div>
);

export const FamiliaPlegado = () => (
  <div style={{ width: 420 }}>
    <Plegable titulo="Cargas de familia" tono="neutro" textoPlegado="Ver · sólo para Ganancias" abierto={false}>
      <Casilla id="conyuge_p" label="Cónyuge / conviviente a cargo" checked={false} />
    </Plegable>
  </div>
);

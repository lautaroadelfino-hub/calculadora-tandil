import { Aviso, Boton } from "liquidar-ui";

export const DatosCambiados = () => (
  <div style={{ width: 520 }}>
    <Aviso tono="atencion" titulo="Cambiaste datos." accion={<Boton tamano="sm">Recalcular</Boton>}>
      Este recibo es de los datos anteriores.
    </Aviso>
  </div>
);

export const TablaDeOtroMes = () => (
  <div style={{ width: 520 }}>
    <Aviso tono="atencion" titulo="Ojo:">
      no hay tabla de contribuciones de abril de 2026. Se usó la de septiembre de 2026, que puede tener otras bases o alícuotas.
    </Aviso>
  </div>
);

export const Supuesto = () => (
  <div style={{ width: 520 }}>
    <Aviso tono="info">
      Cargaste 60 hs semanales, más que la jornada completa de 48: el básico se calculó por jornada completa. Las horas que exceden la jornada se pagan como horas extras, no como más básico.
    </Aviso>
  </div>
);

export const Error = () => (
  <div style={{ width: 520 }}>
    <Aviso tono="error" titulo="Revisá estos datos antes de calcular:">
      Horas semanales: cargá las horas que trabaja. La jornada completa de este convenio es de 44 hs.
    </Aviso>
  </div>
);

export const Exito = () => (
  <div style={{ width: 520 }}>
    <Aviso tono="exito">Link copiado. Pegalo donde quieras: abre esta misma simulación.</Aviso>
  </div>
);

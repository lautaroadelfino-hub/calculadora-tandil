// test/motorLiquidacion.contribuciones.test.js
// La sección del empleador dentro del recibo (art. 140 inc. j) LCT, Decreto
// 407/2026), integrada al motor. Lo primero que se prueba es lo más importante:
// que con la sección puesta, el trabajador cobra exactamente lo mismo.

import { describe, it, expect } from "vitest";
import { procesarRecibo } from "../lib/motorLiquidacion.js";
import semilla from "../data/contribuciones.seed.json";
import convenioComercio from "./fixtures/comercio-cct-130-75.convenio.json";
import escalasComercio from "./fixtures/comercio-cct-130-75.escalas.json";

const money = (n) => Math.round(n * 100) / 100;
const escala = escalasComercio["2026-07"];
const entradas = (o = {}) => ({
  categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 5,
  horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false, ...o,
});
const opciones = (extra = {}) => ({
  periodo: "2026-07", tablaContribuciones: semilla, periodoContribuciones: "2026-07", ...extra,
});
const conReglas = (reglas) => ({
  ...convenioComercio,
  reglas_calculo: { ...convenioComercio.reglas_calculo, ...reglas },
});
// Comercio con la ART típica cargada, como va a quedar en /admin.
const comercioConArt = conReglas({ art: { alicuota_tipica: 0.03 } });
const linea = (r, texto) => r.detalle.find((l) => l.concepto.startsWith(texto));
const contribuciones = (r) => r.detalle.filter((l) => l.tipo === "contribucion");

describe("el canario, con la sección del empleador puesta", () => {
  const sin = procesarRecibo(convenioComercio, escala, entradas());
  const con = procesarRecibo(comercioConArt, escala, entradas(), null, opciones());

  it("el trabajador cobra exactamente lo mismo: $1.166.249,70", () => {
    expect(con.totales.neto).toBe(sin.totales.neto);
    expect(con.totales.bruto).toBe(sin.totales.bruto);
    expect(con.totales.retenciones).toBe(sin.totales.retenciones);
    expect(money(con.totales.neto)).toBe(1166249.7);
  });

  it("aparecen las contribuciones: cinco del régimen, dos universales y la ART, en ese orden", () => {
    expect(contribuciones(con).map((l) => l.concepto)).toEqual([
      "SIPA (jubilación)",
      "INSSJP (PAMI)",
      "Asignaciones familiares",
      "Fondo Nacional de Empleo",
      "Obra social (contribución 6%)",
      "FFEP (Fondo Fiduciario de Enfermedades Profesionales)",
      "Seguro Colectivo de Vida Obligatorio",
      "ART (estimada)",
    ]);
  });

  it("los números salen del bruto del recibo, con la detracción, en MiPyME", () => {
    const bruto = con.totales.bruto; // 1.448.881,62
    expect(money(linea(con, "SIPA").monto)).toBe(money((bruto - 7003.68) * 0.1077));
    expect(money(linea(con, "Obra social").monto)).toBe(money(bruto * 0.06));
    expect(money(linea(con, "ART").monto)).toBe(money(bruto * 0.03));
    expect(linea(con, "FFEP").monto).toBe(1624);
    expect(con.costoEmpleador.regimen.id).toBe("resto_mipyme");
    // El total, como número redondo para que quede escrito: $391.986,00.
    expect(con.totales.contribuciones).toBeCloseTo(391985.99, 1);
  });

  it("los totales y el bloque del empleador cierran entre sí", () => {
    const suma = contribuciones(con).reduce((a, l) => a + l.monto, 0);
    expect(con.totales.contribuciones).toBeCloseTo(suma, 6);
    expect(con.totales.costoEmpleador).toBeCloseTo(con.totales.bruto + con.totales.noRemunerativo + suma, 6);
    expect(con.costoEmpleador.costoLaboral).toBeCloseTo(con.totales.costoEmpleador, 6);
    expect(con.costoEmpleador.totalContribuciones).toBeCloseTo(suma, 6);
    expect(con.costoEmpleador.porcentajeSobreBruto).toBeCloseTo((suma / con.totales.bruto) * 100, 6);
  });

  it("costo por hora (divisor del convenio) y por día (30)", () => {
    expect(con.costoEmpleador.costoPorHora).toBeCloseTo(con.costoEmpleador.costoLaboral / 200, 6);
    expect(con.costoEmpleador.costoPorDia).toBeCloseTo(con.costoEmpleador.costoLaboral / 30, 6);
  });

  it("dice con qué supuestos se hizo la cuenta", () => {
    expect(con.metodo).toMatchObject({
      periodo: "2026-07",
      periodoTablaContribuciones: "2026-07",
      regimenContribuciones: "resto_mipyme",
      artAlicuota: 0.03,
      artLaInformoLaPersona: false,
      sacIntegraBaseContribuciones: true,
    });
    expect(con.costoEmpleador.periodoTabla).toBe("2026-07");
    expect(con.avisos).toEqual([]);
  });
});

describe("cuando no hay tabla", () => {
  it("si nadie pidió la sección (undefined), no pasa nada y no se avisa nada", () => {
    const r = procesarRecibo(comercioConArt, escala, entradas(), null, { periodo: "2026-07" });
    expect(contribuciones(r)).toEqual([]);
    expect(r.costoEmpleador).toBeNull();
    expect(r.totales.contribuciones).toBe(0);
    expect(r.totales.costoEmpleador).toBe(r.totales.bruto + r.totales.noRemunerativo);
    expect(r.avisos).toEqual([]);
  });

  it("si la pantalla la buscó y no hay (null), avisa que falta la tabla y no inventa", () => {
    const r = procesarRecibo(comercioConArt, escala, entradas(), null, opciones({ tablaContribuciones: null }));
    expect(contribuciones(r)).toEqual([]);
    expect(r.costoEmpleador).toBeNull();
    expect(r.totales.contribuciones).toBe(0);
    expect(r.avisos.join(" ")).toMatch(/Sin tabla de contribuciones/);
    expect(money(r.totales.neto)).toBe(1166249.7);
  });
});

describe("el régimen", () => {
  it("MiPyME si la persona no elige; el grande si lo elige, y cuesta más", () => {
    const mipyme = procesarRecibo(comercioConArt, escala, entradas(), null, opciones());
    const grande = procesarRecibo(comercioConArt, escala, entradas({ regimen_contribuciones: "servicios_comercio_grande" }), null, opciones());
    expect(grande.costoEmpleador.regimen.id).toBe("servicios_comercio_grande");
    expect(grande.totales.contribuciones).toBeGreaterThan(mipyme.totales.contribuciones);
    expect(grande.totales.neto).toBe(mipyme.totales.neto);
  });

  it("uno que no está en la tabla FRENA, con el nombre", () => {
    expect(() =>
      procesarRecibo(comercioConArt, escala, entradas({ regimen_contribuciones: "monotributo" }), null, opciones())
    ).toThrow(/"monotributo" no está en la tabla/);
  });
});

describe("la ART", () => {
  it("manda lo que escribe la persona, en porcentaje", () => {
    const r = procesarRecibo(comercioConArt, escala, entradas({ art_alicuota: 5 }), null, opciones());
    expect(money(linea(r, "ART").monto)).toBe(money(r.totales.bruto * 0.05));
    expect(r.metodo.artAlicuota).toBe(0.05);
    expect(r.metodo.artLaInformoLaPersona).toBe(true);
  });

  it("si no escribe nada, vale la típica del convenio", () => {
    const r = procesarRecibo(comercioConArt, escala, entradas({ art_alicuota: "" }), null, opciones());
    expect(r.metodo.artAlicuota).toBe(0.03);
    expect(r.metodo.artLaInformoLaPersona).toBe(false);
  });

  it("sin típica ni respuesta: la fila queda pendiente, se avisa, y no se inventa un 3%", () => {
    const r = procesarRecibo(convenioComercio, escala, entradas(), null, opciones());
    expect(linea(r, "ART").pendiente).toBe(true);
    expect(linea(r, "ART").monto).toBe(0);
    expect(r.costoEmpleador.art.pendiente).toBe(true);
    expect(r.avisos.join(" ")).toMatch(/alícuota de ART/);
  });

  it("la cuota fija de la póliza se suma", () => {
    const r = procesarRecibo(comercioConArt, escala, entradas({ art_suma_fija: 800 }), null, opciones());
    expect(money(linea(r, "ART").monto)).toBe(money(r.totales.bruto * 0.03 + 800));
  });
});

describe("el SAC en la base del empleador", () => {
  const conSac = entradas({ incluir_sac: true });
  const integra = procesarRecibo(comercioConArt, escala, conSac, null, opciones());
  const tablaSinSac = { ...semilla, criterios_contables: { ...semilla.criterios_contables, sac_integra_base_contribuciones: false } };
  const noIntegra = procesarRecibo(comercioConArt, escala, conSac, null, opciones({ tablaContribuciones: tablaSinSac }));

  it("por defecto el SAC paga contribuciones; apagado desde la tabla, no", () => {
    const sac = linea(integra, "SAC").monto;
    expect(integra.metodo.sacIntegraBaseContribuciones).toBe(true);
    expect(noIntegra.metodo.sacIntegraBaseContribuciones).toBe(false);
    expect(money(linea(integra, "SIPA").monto - linea(noIntegra, "SIPA").monto)).toBe(money(sac * 0.1077));
  });

  it("el interruptor no toca al trabajador", () => {
    expect(noIntegra.totales.neto).toBe(integra.totales.neto);
  });
});

describe("lo que el convenio manda pagar al empleador", () => {
  const conCamara = conReglas({
    art: { alicuota_tipica: 0.03 },
    contribuciones_convenio: {
      camara: { label: "Aporte a la cámara", porcentaje: 0.01, base: "remunerativo", rubro: "camaras" },
      fondo: { label: "Fondo convencional", valor_fijo: 1500, rubro: "sindical" },
    },
  });

  it("aparece en el recibo, con su rubro y su origen", () => {
    const r = procesarRecibo(conCamara, escala, entradas(), null, opciones());
    expect(money(linea(r, "Aporte a la cámara").monto)).toBe(money(r.totales.bruto * 0.01));
    expect(linea(r, "Aporte a la cámara").origen).toBe("convenio");
    expect(linea(r, "Fondo convencional").monto).toBe(1500);
    expect(r.costoEmpleador.rubros.camaras.empleador).toBeCloseTo(r.totales.bruto * 0.01, 6);
    expect(r.costoEmpleador.rubros.sindical.empleador).toBe(1500);
  });

  it("un rubro que no es de los siete frena, haya tabla o no", () => {
    const roto = conReglas({ contribuciones_convenio: { x: { label: "X", porcentaje: 0.01, base: "remunerativo", rubro: "impuestos" } } });
    expect(() => procesarRecibo(roto, escala, entradas(), null, opciones())).toThrow(/"impuestos", que el motor no conoce/);
    expect(() => procesarRecibo(roto, escala, entradas())).toThrow(/"impuestos", que el motor no conoce/);
  });
});

describe("la composición por rubro", () => {
  const r = procesarRecibo(comercioConArt, escala, entradas({ afiliado_sindicato: true }), null, opciones());
  const { rubros } = r.costoEmpleador;

  it("las retenciones del trabajador llevan su rubro", () => {
    expect(linea(r, "Jubilación").rubro).toBe("seguridad_social");
    expect(linea(r, "Ley 19.032 PAMI").rubro).toBe("inssjp");
    expect(linea(r, "Obra Social (3%)").rubro).toBe("obra_social");
    expect(linea(r, "Cuota Afiliado").rubro).toBe("sindical");
  });

  it("cada rubro suma lo que pone cada lado", () => {
    expect(rubros.seguridad_social.trabajador).toBeCloseTo(linea(r, "Jubilación").monto, 6);
    expect(rubros.seguridad_social.empleador).toBeCloseTo(
      linea(r, "SIPA").monto + linea(r, "Asignaciones").monto + linea(r, "Fondo Nacional").monto, 6
    );
    expect(rubros.inssjp.trabajador).toBeCloseTo(linea(r, "Ley 19.032 PAMI").monto, 6);
    expect(rubros.inssjp.empleador).toBeCloseTo(linea(r, "INSSJP").monto, 6);
    expect(rubros.art.empleador).toBeCloseTo(linea(r, "ART").monto + 1624, 6);
    expect(rubros.otros.empleador).toBeCloseTo(424.62, 6);
    expect(rubros.camaras.total).toBe(0);
  });

  it("los siete están, y los porcentajes suman 100", () => {
    expect(Object.keys(rubros)).toHaveLength(7);
    expect(money(Object.values(rubros).reduce((a, x) => a + x.porcentaje, 0))).toBe(100);
  });
});

describe("la jornada parcial", () => {
  it("prorratea la detracción, no las sumas fijas", () => {
    const r = procesarRecibo(comercioConArt, escala, entradas({ carga_horaria: 24 }), null, opciones());
    expect(money(r.costoEmpleador.detraccion.prorrateada)).toBe(3501.84);
    expect(linea(r, "FFEP").monto).toBe(1624);
    expect(r.costoEmpleador.costoPorHora).toBeCloseTo(r.costoEmpleador.costoLaboral / 100, 6);
  });
});

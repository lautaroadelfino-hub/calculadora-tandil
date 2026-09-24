// test/calculoContribuciones.test.js
// El módulo de contribuciones patronales, probado contra un recibo REAL:
// el que Nacional Sistema emitió para el período 07/2026, legajo 12427
// (Administrativo A, CCT 130/75). Es la técnica del canario, pero con un
// sistema externo que ya cumple la ley como referencia.

import { describe, it, expect } from "vitest";
import { calcularContribuciones, resumenPorRubro } from "../lib/calculoContribuciones.js";
import semilla from "../data/contribuciones.seed.json";

const money = (n) => Math.round(n * 100) / 100;
const linea = (r, texto) => r.lineas.find((l) => l.concepto.includes(texto));

// La tabla tal como Nacional Sistema calcula HOY, para verificar la aritmética:
// su fórmula de SIPA usa el bruto (remunerativo + NR) y la de obra social sólo
// el remunerativo. Es distinta de la semilla de producción, que lleva la
// decisión del dueño (el NR paga obra social y no SIPA). Las dos están bien:
// esta prueba la cuenta, la semilla el criterio.
const TABLA_ORACULO = {
  vigencia: "Julio 2026 (oráculo Nacional Sistema)",
  detraccion: { monto: 7003.68, prorratea_por_jornada: true },
  bases_art9: { minima: 138757.9, maxima: 4509567.41 },
  regimenes: {
    resto_mipyme: {
      label: "Resto y MiPyME",
      predeterminado: true,
      conceptos: [
        { id: "sipa", label: "SIPA", unidad: "porcentaje", alicuota: 0.1077, base: "remunerativo_mas_no_remunerativo", aplica_detraccion: true, rubro: "seguridad_social" },
        { id: "inssjp", label: "INSSJP", unidad: "porcentaje", alicuota: 0.0158, base: "remunerativo", aplica_detraccion: true, rubro: "inssjp" },
        { id: "aaff", label: "AAFF", unidad: "porcentaje", alicuota: 0.047, base: "remunerativo", aplica_detraccion: true, rubro: "seguridad_social" },
        { id: "fne", label: "FNE", unidad: "porcentaje", alicuota: 0.0095, base: "remunerativo", aplica_detraccion: true, rubro: "seguridad_social" },
        { id: "obra_social", label: "Obra Social", unidad: "porcentaje", alicuota: 0.06, base: "remunerativo", aplica_detraccion: false, rubro: "obra_social" },
      ],
    },
  },
  universales: [
    { id: "ffep", label: "FFEP", unidad: "suma_fija", monto: 1624, rubro: "art" },
    { id: "scvo", label: "SCVO", unidad: "suma_fija", monto: 424.62, rubro: "otros" },
  ],
  criterios_contables: {},
};

describe("el oráculo: recibo 07/2026 de Nacional Sistema, legajo 12427", () => {
  const r = calcularContribuciones({
    remunerativo: 1245072.45,
    noRemunerativo: 155000.67,
    factorJornada: 1,
    tabla: TABLA_ORACULO,
    art: { alicuota: 0.05, sumaFija: 0 },
  });

  it("las siete líneas que salen del remunerativo dan el centavo exacto", () => {
    expect(money(linea(r, "INSSJP").monto)).toBe(19561.49);
    expect(money(linea(r, "AAFF").monto)).toBe(58189.23);
    expect(money(linea(r, "FNE").monto)).toBe(11761.65);
    expect(money(linea(r, "Obra Social").monto)).toBe(74704.35);
    expect(money(linea(r, "ART").monto)).toBe(62253.62);
    expect(money(linea(r, "FFEP").monto)).toBe(1624);
    expect(money(linea(r, "SCVO").monto)).toBe(424.62);
  });

  it("el SIPA da 8 centavos más que el recibo real, y está bien que sea así", () => {
    // Nacional Sistema imprime 150.033,50 porque su variable SUELDO_BRUTO valía
    // 1.400.072,41, que son 71 centavos MENOS que remunerativo + no remunerativo
    // (1.400.073,12): una diferencia de redondeo interna de ese sistema, que
    // multiplicada por 10,77% son estos 8 centavos. No lo "arregles" para que
    // dé igual: la fórmula (base − detracción) × alícuota es la correcta.
    expect(money(linea(r, "SIPA").monto)).toBe(150033.58);
    expect(money(linea(r, "SIPA").detraccionAplicada)).toBe(7003.68);
    expect(money(linea(r, "SIPA").base)).toBe(money(1400073.12 - 7003.68));
  });

  it("el total y el costo laboral reproducen el recibo real salvo esos 8 centavos", () => {
    expect(Math.abs(r.total - 378552.46)).toBeLessThan(0.1);
    const costoLaboral = 1245072.45 + 155000.67 + r.total;
    expect(Math.abs(costoLaboral - 1778625.58)).toBeLessThan(0.1);
  });

  it("son ocho líneas, todas contribuciones, todas con rubro", () => {
    expect(r.lineas).toHaveLength(8);
    for (const l of r.lineas) {
      expect(l.tipo).toBe("contribucion");
      expect(l.rubro).toBeTruthy();
      expect(Number.isFinite(l.monto)).toBe(true);
    }
  });

  it("la detracción se restó sólo donde corresponde", () => {
    expect(linea(r, "Obra Social").detraccionAplicada).toBe(0);
    expect(linea(r, "ART").detraccionAplicada).toBe(0);
    expect(linea(r, "AAFF").detraccionAplicada).toBe(7003.68);
    expect(r.detraccion).toMatchObject({ monto: 7003.68, prorrateada: 7003.68 });
  });

  it("dice qué régimen usó", () => {
    expect(r.regimen).toEqual({ id: "resto_mipyme", label: "Resto y MiPyME" });
    expect(r.avisos).toEqual([]);
  });
});

describe("con la semilla de producción (el criterio del dueño)", () => {
  const con = calcularContribuciones({ remunerativo: 1000000, noRemunerativo: 200000, tabla: semilla });
  const sin = calcularContribuciones({ remunerativo: 1000000, noRemunerativo: 0, tabla: semilla });

  it("el no remunerativo mueve la obra social y nada más", () => {
    expect(money(linea(con, "Obra social").monto - linea(sin, "Obra social").monto)).toBe(12000); // 200.000 × 6%
    for (const id of ["SIPA", "INSSJP", "Asignaciones", "Fondo Nacional"]) {
      expect(money(linea(con, id).monto), id).toBe(money(linea(sin, id).monto));
    }
  });

  it("MiPyME es el régimen si nadie elige; el grande cobra más", () => {
    expect(con.regimen.id).toBe("resto_mipyme");
    const grande = calcularContribuciones({ remunerativo: 1000000, tabla: semilla, regimenId: "servicios_comercio_grande" });
    expect(grande.regimen.id).toBe("servicios_comercio_grande");
    expect(grande.total).toBeGreaterThan(sin.total);
    // 20,40% − 18% sobre (1.000.000 − 7.003,68)
    expect(money(grande.total - sin.total)).toBe(money((1000000 - 7003.68) * 0.024));
  });

  it("sin ART informada no inventa un 3%: la fila queda pendiente y avisa", () => {
    const r = calcularContribuciones({ remunerativo: 1000000, tabla: semilla, art: { alicuota: null, sumaFija: 0 } });
    const art = linea(r, "ART");
    expect(art.pendiente).toBe(true);
    expect(art.monto).toBe(0);
    expect(r.avisos.join(" ")).toMatch(/alícuota de ART/);
  });

  it("la ART informada es estimada, y suma la cuota fija si la hay", () => {
    const r = calcularContribuciones({ remunerativo: 1000000, tabla: semilla, art: { alicuota: 0.03, sumaFija: 500 } });
    expect(money(linea(r, "ART").monto)).toBe(30500);
    expect(linea(r, "ART").estimada).toBe(true);
    expect(r.avisos).toEqual([]);
  });

  it("las contribuciones del convenio se suman con su rubro", () => {
    const r = calcularContribuciones({
      remunerativo: 1000000,
      noRemunerativo: 100000,
      tabla: semilla,
      delConvenio: [
        { id: "camara", label: "Aporte a la cámara", porcentaje: 0.01, base: "remunerativo_mas_no_remunerativo", rubro: "camaras" },
        { id: "fondo", label: "Fondo de capacitación", valor_fijo: 1500, rubro: "sindical" },
      ],
    });
    expect(money(linea(r, "cámara").monto)).toBe(11000);
    expect(linea(r, "cámara").origen).toBe("convenio");
    expect(money(linea(r, "capacitación").monto)).toBe(1500);
    expect(linea(r, "capacitación").unidad).toBe("suma_fija");
  });
});

describe("la detracción y la jornada", () => {
  it("se prorratea por las horas del puesto", () => {
    const r = calcularContribuciones({ remunerativo: 500000, tabla: semilla, factorJornada: 0.5 });
    expect(money(r.detraccion.prorrateada)).toBe(3501.84);
    expect(money(linea(r, "SIPA").base)).toBe(money(500000 - 3501.84));
  });

  it("no se prorratea si la tabla dice que no", () => {
    const tabla = { ...semilla, detraccion: { ...semilla.detraccion, prorratea_por_jornada: false } };
    const r = calcularContribuciones({ remunerativo: 500000, tabla, factorJornada: 0.5 });
    expect(r.detraccion.prorrateada).toBe(7003.68);
  });

  it("nunca deja una base negativa", () => {
    const r = calcularContribuciones({ remunerativo: 5000, tabla: semilla, factorJornada: 1 });
    expect(linea(r, "SIPA").base).toBe(0);
    expect(linea(r, "SIPA").monto).toBe(0);
    expect(linea(r, "SIPA").detraccionAplicada).toBe(5000);
    for (const l of r.lineas) expect(l.monto).toBeGreaterThanOrEqual(0);
  });

  it("si la tabla no trae la detracción, calcula sin ella y avisa", () => {
    const { detraccion, ...sinDetraccion } = semilla;
    const r = calcularContribuciones({ remunerativo: 1000000, tabla: sinDetraccion });
    expect(r.detraccion).toBeNull();
    expect(money(linea(r, "SIPA").monto)).toBe(107700);
    expect(r.avisos.join(" ")).toMatch(/no trae la detracción/);
  });
});

describe("sin tabla, y cuando no entiende", () => {
  it("sin tabla: cero líneas, cero pesos, un aviso que dice qué cargar", () => {
    const r = calcularContribuciones({ remunerativo: 1000000, tabla: null, art: { alicuota: 0.03 } });
    expect(r.lineas).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.regimen).toBeNull();
    expect(r.avisos.join(" ")).toMatch(/Sin tabla de contribuciones/);
    // Y no manda al visitante a /admin: eso es del panel, no de la pantalla pública.
    expect(r.avisos.join(" ")).not.toMatch(/admin/);
  });

  it("un régimen que no está en la tabla FRENA (antes caía en MiPyME callado)", () => {
    expect(() => calcularContribuciones({ remunerativo: 1, tabla: semilla, regimenId: "no-existe" })).toThrow(/"no-existe" no está en la tabla/);
  });

  it("una tabla sin régimen predeterminado también frena si nadie eligió", () => {
    const tabla = JSON.parse(JSON.stringify(semilla));
    for (const r of Object.values(tabla.regimenes)) r.predeterminado = false;
    expect(() => calcularContribuciones({ remunerativo: 1, tabla })).toThrow(/predeterminado/);
    expect(() => calcularContribuciones({ remunerativo: 1, tabla, regimenId: "resto_mipyme" })).not.toThrow();
  });

  it("una base que no conoce frena y la nombra", () => {
    const tabla = JSON.parse(JSON.stringify(semilla));
    tabla.regimenes.resto_mipyme.conceptos[0].base = "bruto_total";
    expect(() => calcularContribuciones({ remunerativo: 1, tabla })).toThrow(/"bruto_total", que el motor no conoce/);
  });

  it("un rubro que no es de los siete frena y los lista", () => {
    const tabla = JSON.parse(JSON.stringify(semilla));
    tabla.universales[0].rubro = "seguros";
    expect(() => calcularContribuciones({ remunerativo: 1, tabla })).toThrow(/"seguros".*camaras, otros/);
  });

  it("una unidad que no conoce frena", () => {
    const tabla = JSON.parse(JSON.stringify(semilla));
    tabla.universales[0].unidad = "por_hora";
    expect(() => calcularContribuciones({ remunerativo: 1, tabla })).toThrow(/"por_hora"/);
  });
});

describe("resumenPorRubro: la composición que pide el decreto", () => {
  it("separa lo que pone cada lado y cubre los siete rubros aunque estén en cero", () => {
    const detalle = [
      { concepto: "Sueldo", tipo: "remunerativo", monto: 1000000 },
      { concepto: "Jubilación", tipo: "retencion", monto: 110000, rubro: "seguridad_social" },
      { concepto: "PAMI", tipo: "retencion", monto: 30000, rubro: "inssjp" },
      { concepto: "Ganancias", tipo: "retencion", monto: 5000 }, // sin rubro: no es costo laboral
      { concepto: "SIPA", tipo: "contribucion", monto: 107700, rubro: "seguridad_social" },
      { concepto: "SCVO", tipo: "contribucion", monto: 424.62, rubro: "otros" },
    ];
    const { rubros, total } = resumenPorRubro(detalle);
    expect(Object.keys(rubros)).toEqual(["sindical", "seguridad_social", "obra_social", "inssjp", "art", "camaras", "otros"]);
    expect(rubros.seguridad_social).toMatchObject({ empleador: 107700, trabajador: 110000, total: 217700 });
    expect(rubros.inssjp).toMatchObject({ empleador: 0, trabajador: 30000 });
    expect(rubros.camaras).toMatchObject({ empleador: 0, trabajador: 0, total: 0, porcentaje: 0 });
    expect(money(total)).toBe(money(217700 + 30000 + 424.62));
    expect(money(Object.values(rubros).reduce((a, r) => a + r.porcentaje, 0))).toBe(100);
  });

  it("una línea con un rubro desconocido frena", () => {
    expect(() => resumenPorRubro([{ concepto: "X", tipo: "contribucion", monto: 1, rubro: "otro" }])).toThrow(/"otro"/);
  });

  it("con todo en cero no divide por cero", () => {
    expect(resumenPorRubro([]).total).toBe(0);
  });
});

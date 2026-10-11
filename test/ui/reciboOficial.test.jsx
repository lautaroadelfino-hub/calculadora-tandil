// @vitest-environment jsdom
// test/ui/reciboOficial.test.jsx
// El recibo dibujado de verdad, en un DOM (jsdom): lo que la persona ve tiene
// que ser lo que el motor calculó. lib/reciboOficial.js ya tiene tests de las
// celdas; acá se mira el componente: que el neto, el bruto y cada línea
// lleguen a la pantalla, que las tablas tengan nombre para el lector de
// pantalla, que sin tabla de contribuciones lo diga en vez de inventar, y que
// nunca se imprima "undefined" ni "NaN".

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import ReciboOficial from "../../components/calculadora/ReciboOficial.jsx";
import { procesarRecibo } from "../../lib/motorLiquidacion.js";
import { money, encabezado } from "../../lib/reciboOficial.js";
import semilla from "../../data/contribuciones.seed.json";
import comercio from "../fixtures/patron/comercio-cct-130-75.convenio.json";
import escalas from "../fixtures/patron/comercio-cct-130-75.escalas.json";

afterEach(cleanup);

const entradas = {
  categoria: "Vendedor B",
  carga_horaria: 48,
  antiguedad_años: 5,
  horas_extras_50: 0,
  horas_extras_100: 0,
  afiliado_sindicato: false,
};
const escala = escalas["2026-07"];
const conTabla = procesarRecibo(comercio, escala, entradas, null, {
  periodo: "2026-07",
  tablaContribuciones: semilla,
  periodoContribuciones: "2026-07",
});
const sinTabla = procesarRecibo(comercio, escala, entradas, null, {
  periodo: "2026-07",
  tablaContribuciones: null,
  periodoContribuciones: null,
});

/**
 * El importe que acompaña a una franja gris ("Sueldo neto $", "Sueldo bruto"...).
 * El título de la franja es el span centrado; el mismo texto puede aparecer
 * además como rótulo de columna o como título de la torta.
 */
const importeDeFranja = (titulo) =>
  screen.getByText(titulo, { selector: "span.flex-1" }).parentElement.textContent.replace(titulo, "").trim();

describe("el recibo en pantalla", () => {
  it("muestra el neto, el bruto y la composición salarial que calculó el motor", () => {
    render(<ReciboOficial resultado={conTabla} convenio={comercio} entradas={entradas} periodoId="2026-07" />);
    expect(importeDeFranja("Sueldo neto $")).toBe(money(conTabla.totales.neto));
    expect(importeDeFranja("Sueldo neto $")).toBe("$ 1.166.249,70");
    expect(importeDeFranja("Sueldo bruto")).toBe(money(conTabla.totales.bruto + conTabla.totales.noRemunerativo));
    const composicion = screen.getByText("Composicion salarial:").parentElement.textContent;
    expect(composicion).toContain(`Remunerativo: ${money(conTabla.totales.bruto)}`);
    expect(composicion).toContain(`Descuentos: ${money(conTabla.totales.retenciones)}`);
  });

  it("cada línea del trabajador está en su tabla, con el importe del motor y los descuentos en positivo", () => {
    render(<ReciboOficial resultado={conTabla} convenio={comercio} entradas={entradas} periodoId="2026-07" />);
    const tabla = screen.getByRole("table", { name: "Haberes y descuentos del trabajador" });
    const filas = within(tabla).getAllByRole("row").map((r) => r.textContent);
    for (const linea of conTabla.detalle.filter((l) => l.tipo !== "contribucion")) {
      const fila = filas.find((t) => t.startsWith(linea.concepto));
      expect(fila, `falta la línea "${linea.concepto}"`).toBeDefined();
      expect(fila).toContain(money(Math.abs(linea.monto)));
    }
  });

  it("el encabezado lleva mes, año, categoría, bruto y antigüedad; lo que no sabe queda 'sin completar'", () => {
    render(<ReciboOficial resultado={conTabla} convenio={comercio} entradas={entradas} periodoId="2026-07" />);
    const cabecera = encabezado(conTabla, entradas, "2026-07");
    const datos = screen.getByRole("table", { name: "Datos del recibo" }).textContent;
    expect(datos).toContain(cabecera.mes);
    expect(datos).toContain(cabecera.año);
    expect(datos).toContain(cabecera.sueldoBruto);
    expect(datos).toContain(cabecera.antiguedad);
    expect(screen.getByRole("table", { name: "Datos del puesto" }).textContent).toContain("Vendedor B");
    expect(screen.getAllByText("sin completar").length).toBeGreaterThan(0);
    expect(screen.getByText(`${comercio.nombre} · CCT ${comercio.cct}`)).toBeTruthy();
  });

  it("con tabla de contribuciones: costo total, contribuciones y la torta con su tabla para el lector de pantalla", () => {
    render(<ReciboOficial resultado={conTabla} convenio={comercio} entradas={entradas} periodoId="2026-07" />);
    const costo = conTabla.costoEmpleador.costoLaboral;
    expect(importeDeFranja("Costo total empleador")).toBe(money(costo));
    expect(importeDeFranja("Sub total contribuciones empleador")).toBe(money(conTabla.costoEmpleador.totalContribuciones));
    // Las contribuciones van en dos columnas (y, para el celular, en una sola
    // tabla con las mismas líneas): cada una con su importe y su base para el
    // lector de pantalla.
    const lineas = conTabla.detalle.filter((l) => l.tipo === "contribucion");
    const izquierda = screen.getByRole("table", { name: "Contribuciones a cargo del empleador, primera columna" });
    const derecha = screen.getByRole("table", { name: "Contribuciones a cargo del empleador, segunda columna" });
    const filas = [...within(izquierda).getAllByRole("row"), ...within(derecha).getAllByRole("row")].map((r) => r.textContent);
    for (const l of lineas) {
      const fila = filas.find((t) => t.startsWith(l.concepto));
      expect(fila, `falta la contribución "${l.concepto}"`).toBeDefined();
      expect(fila).toContain(money(l.monto));
    }
    expect(filas.filter((t) => t.includes("Base $")).length).toBeGreaterThan(0);
    const celular = screen.getByRole("table", { name: "Contribuciones a cargo del empleador" });
    expect(within(celular).getAllByRole("row").length - 1).toBe(lineas.length);
    expect(screen.queryByText("Costo derivado del CCT:")).toBeNull();
    expect(screen.getByRole("img", { name: /Costo total empleador/ })).toBeTruthy();
    const torta = screen.getByRole("table", { name: "Costo total empleador por componente" });
    const importes = within(torta)
      .getAllByRole("row")
      .slice(1)
      .map((r) => within(r).getAllByRole("cell")[0].textContent);
    expect(importes.length).toBeGreaterThan(1);
    expect(importes).toContain(money(conTabla.totales.neto));
  });

  it("sin tabla de contribuciones lo dice, deja el costo en '—' y no dibuja la torta", () => {
    render(<ReciboOficial resultado={sinTabla} convenio={comercio} entradas={entradas} periodoId="2026-07" />);
    expect(importeDeFranja("Costo total empleador")).toBe("—");
    expect(screen.getByText(/no hay tabla de contribuciones cargada/)).toBeTruthy();
    expect(screen.queryByRole("img", { name: /Costo total empleador/ })).toBeNull();
    expect(importeDeFranja("Sueldo neto $")).toBe(money(sinTabla.totales.neto));
  });

  it("una línea con un tipo que el recibo no conoce no se pierde en silencio: se avisa", () => {
    const raro = { ...conTabla, detalle: [...conTabla.detalle, { concepto: "Plus misterioso", tipo: "misterio", monto: 1234 }] };
    render(<ReciboOficial resultado={raro} convenio={comercio} entradas={entradas} periodoId="2026-07" />);
    expect(screen.getByText(/1 línea\(s\) que no están sumadas en los totales/).textContent).toContain("Plus misterioso (misterio)");
  });

  it("nunca imprime 'undefined', 'NaN' ni 'null'", () => {
    const { container } = render(<ReciboOficial resultado={conTabla} convenio={comercio} entradas={entradas} periodoId="2026-07" />);
    expect(container.textContent).not.toMatch(/undefined|NaN|null/);
  });
});

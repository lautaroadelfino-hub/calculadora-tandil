// @vitest-environment jsdom
// test/ui/calculadoraConvenio.test.jsx
// La calculadora entera, en un DOM (jsdom), con un Firestore de mentira
// armado con las capturas vivas de Comercio. Es el primer test de interfaz
// del sitio (hallazgo G1 de la auditoría del 23/9/2026): el motor tenía 700
// tests y ni uno miraba el botón que la gente aprieta.
//
// Lo que se prueba es el camino que hace una persona: carga categoría y
// antigüedad, aprieta "Calcular liquidación" y ve el recibo con el neto que
// corresponde (el canario de producción del README); se equivoca en un campo
// y recibe el aviso en ese campo, con el foco puesto ahí, sin recibo; cambia
// el mes y la calculadora va a buscar la escala de ese mes; y abre un link
// compartido y el recibo se arma solo.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, within, fireEvent, cleanup } from "@testing-library/react";

// El módulo que habla con Firestore se reemplaza entero: nada sale a la red.
vi.mock("@/lib/firestoreRest", async () => {
  const comercio = (await import("../fixtures/comercio-cct-130-75.convenio.json")).default;
  const escalas = (await import("../fixtures/comercio-cct-130-75.escalas.json")).default;
  const contribuciones = (await import("../../data/contribuciones.seed.json")).default;
  const ganancias = (await import("../../data/ganancias.seed.json")).default;
  const documentos = {
    "convenios/comercio-cct-130-75": comercio,
    "parametros_contribuciones/2026-07": contribuciones,
    "parametros_ganancias/2026-07": ganancias,
  };
  for (const [id, escala] of Object.entries(escalas)) documentos[`convenios/comercio-cct-130-75/escalas/${id}`] = escala;
  return {
    leerDocumento: vi.fn(async (ruta) => documentos[ruta] ?? null),
    listarColeccion: vi.fn(async (ruta) =>
      ruta === "convenios/comercio-cct-130-75/escalas"
        ? Object.entries(escalas).map(([id, e]) => ({ id, mes_vigencia: e.mes_vigencia }))
        : []
    ),
    listarIds: vi.fn(async (ruta) => (ruta.startsWith("parametros_") ? ["2026-07"] : [])),
  };
});

import CalculadoraConvenio from "../../components/calculadora/CalculadoraConvenio.jsx";
import { cargarDatosDeCalculadora } from "../../lib/datosCalculadora.js";
import { leerDocumento } from "../../lib/firestoreRest.js";
import { procesarRecibo } from "../../lib/motorLiquidacion.js";
import { money } from "../../lib/reciboOficial.js";
import { paramsDesdeEntradas } from "../../lib/permalink.js";
import comercio from "../fixtures/comercio-cct-130-75.convenio.json";
import escalas from "../fixtures/comercio-cct-130-75.escalas.json";
import semilla from "../../data/contribuciones.seed.json";

const ID = "comercio-cct-130-75";
const ultimoPeriodo = Object.keys(escalas).sort().pop();

afterEach(cleanup);
beforeEach(() => {
  leerDocumento.mockClear();
  window.history.replaceState(null, "", "/calcular/comercio-cct-130-75");
});

const importeDeFranja = (titulo) =>
  screen.getByText(titulo, { selector: "span.flex-1" }).parentElement.textContent.replace(titulo, "").trim();const botonCalcular = () => screen.getByRole("button", { name: "Calcular liquidación" });

/** El neto que el motor da para estas entradas en este mes, calculado acá para no clavar números a mano. */
function netoEsperado(entradas, periodo) {
  return procesarRecibo(comercio, escalas[periodo], entradas, null, {
    periodo,
    tablaContribuciones: semilla,
    periodoContribuciones: "2026-07",
  }).totales.neto;
}

describe("la calculadora de Comercio", () => {
  it("arranca con el último mes cargado, los valores por defecto del convenio y sin recibo", async () => {
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    expect(screen.getByLabelText("Período a liquidar").value).toBe(ultimoPeriodo);
    expect(screen.getByLabelText("Categoría").value).toBe(comercio.inputs_requeridos.find((i) => i.id === "categoria").default);
    expect(screen.getByLabelText("Horas Semanales (Jornada)").value).toBe("48");
    expect(screen.getByText("Tu recibo va a aparecer acá")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Simulación de recibo" })).toBeNull();
  });

  it("Vendedor B con 5 años en septiembre 2026: el recibo aparece con el neto del canario de producción", async () => {
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    fireEvent.change(screen.getByLabelText("Período a liquidar"), { target: { value: "2026-09" } });
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Vendedor B" } });
    fireEvent.change(screen.getByLabelText("Años de Antigüedad"), { target: { value: "5" } });
    fireEvent.click(botonCalcular());

    const titulo = await screen.findByRole("heading", { name: "Simulación de recibo" });
    expect(document.activeElement).toBe(titulo);
    expect(importeDeFranja("Sueldo neto $")).toBe("$ 1.251.841,10");
    expect(screen.getByRole("table", { name: "Datos del puesto" }).textContent).toContain("Vendedor B");
    // La URL guarda la simulación para compartirla o para un F5.
    const enLaUrl = new URLSearchParams(window.location.search);
    expect(enLaUrl.get("periodo")).toBe("2026-09");
    expect(enLaUrl.get("categoria")).toBe("Vendedor B");
    expect(enLaUrl.get("antiguedad_años")).toBe("5");
  });

  it("un campo mal cargado: el aviso va en ese campo, el foco también, y no hay recibo", async () => {
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    leerDocumento.mockClear(); // lo que leyó el servidor al armar la página no cuenta
    const horas = screen.getByLabelText("Horas Semanales (Jornada)");
    fireEvent.change(horas, { target: { value: "-5" } });
    fireEvent.click(botonCalcular());

    expect(await screen.findByText("No puede ser negativo.")).toBeTruthy();
    expect(horas.getAttribute("aria-invalid")).toBe("true");
    expect(horas.getAttribute("aria-describedby")).toBe("carga_horaria-error");
    expect(document.activeElement).toBe(horas);
    expect(screen.queryByRole("heading", { name: "Simulación de recibo" })).toBeNull();
    expect(leerDocumento).not.toHaveBeenCalled();

    // Corregido el campo, calcula.
    fireEvent.change(horas, { target: { value: "48" } });
    fireEvent.click(botonCalcular());
    expect(await screen.findByRole("heading", { name: "Simulación de recibo" })).toBeTruthy();
    expect(screen.queryByText("No puede ser negativo.")).toBeNull();
  });

  it("cambiar el mes va a buscar la escala de ese mes y el recibo cambia con ella", async () => {
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    const entradas = { ...inicial.valores, categoria: "Vendedor B", antiguedad_años: 5 };
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Vendedor B" } });
    fireEvent.change(screen.getByLabelText("Años de Antigüedad"), { target: { value: "5" } });

    fireEvent.change(screen.getByLabelText("Período a liquidar"), { target: { value: "2026-07" } });
    fireEvent.click(botonCalcular());
    await screen.findByRole("heading", { name: "Simulación de recibo" });
    expect(leerDocumento).toHaveBeenCalledWith(`convenios/${ID}/escalas/2026-07`);
    const netoJulio = importeDeFranja("Sueldo neto $");
    expect(netoJulio).toBe(money(netoEsperado(entradas, "2026-07")));

    fireEvent.change(screen.getByLabelText("Período a liquidar"), { target: { value: "2026-08" } });
    fireEvent.click(botonCalcular());
    await vi.waitFor(() => expect(importeDeFranja("Sueldo neto $")).toBe(money(netoEsperado(entradas, "2026-08"))));
    expect(leerDocumento).toHaveBeenCalledWith(`convenios/${ID}/escalas/2026-08`);
    expect(importeDeFranja("Sueldo neto $")).not.toBe(netoJulio);
  });

  it("un link compartido arma el recibo solo, con lo que trae la URL", async () => {
    const valores = { categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 5, horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false };
    const inicial = await cargarDatosDeCalculadora(ID, `?${paramsDesdeEntradas(comercio, valores, "2026-09")}`);
    expect(inicial.autoCalcular).toBe(true);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    await screen.findByRole("heading", { name: "Simulación de recibo" });
    expect(importeDeFranja("Sueldo neto $")).toBe("$ 1.251.841,10");
    expect(screen.getByLabelText("Años de Antigüedad").value).toBe("5");
  });

  it("nunca imprime 'undefined' ni 'NaN', antes ni después de calcular", async () => {
    const inicial = await cargarDatosDeCalculadora(ID);
    const { container } = render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    expect(container.textContent).not.toMatch(/undefined|NaN/);
    fireEvent.click(botonCalcular());
    await screen.findByRole("heading", { name: "Simulación de recibo" });
    expect(container.textContent).not.toMatch(/undefined|NaN/);
  });
});

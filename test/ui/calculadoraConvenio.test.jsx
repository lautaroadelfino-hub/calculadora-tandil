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

// La calificación del pie del recibo tampoco sale a la red: se mira qué se mandaría.
vi.mock("@/lib/calificaciones", async (importOriginal) => ({
  ...(await importOriginal()),
  enviarCalificacion: vi.fn(async () => {}),
}));

import CalculadoraConvenio from "../../components/calculadora/CalculadoraConvenio.jsx";
import { enviarCalificacion } from "@/lib/calificaciones";
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
  enviarCalificacion.mockClear();
  window.localStorage.clear(); // que ningún test herede "ya calificó" de otro
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

  it("'¿Te sirvió este cálculo?' aparece recién con el recibo, y una estrella la guarda con el contexto de la cuenta", async () => {
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    expect(screen.queryByRole("radiogroup", { name: "¿Te sirvió este cálculo?" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Período a liquidar"), { target: { value: "2026-09" } });
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Vendedor B" } });
    fireEvent.click(botonCalcular());
    await screen.findByRole("heading", { name: "Simulación de recibo" });
    fireEvent.change(screen.getByLabelText("Años de Antigüedad"), { target: { value: "5" } });
    expect(screen.getByText("Cambiaste datos.")).toBeTruthy();
    fireEvent.click(botonCalcular());
    // El segundo recibo está listo cuando se va el aviso de datos cambiados.
    await vi.waitFor(() => expect(screen.queryByText("Cambiaste datos.")).toBeNull());

    // Un toque con el dedo: guarda y pasa sola a la pregunta siguiente.
    const cinco = await screen.findByLabelText(/^5 de 5 estrellas/);
    fireEvent.pointerDown(cinco, { pointerType: "touch" });
    fireEvent.click(cinco);
    await vi.waitFor(() => expect(enviarCalificacion).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const campos = enviarCalificacion.mock.calls[0][0].writes[0].update.fields;
    expect(campos).toMatchObject({
      estrellas: { integerValue: "5" },
      convenioId: { stringValue: ID },
      periodo: { stringValue: "2026-09" },
      categoria: { stringValue: "Vendedor B" },
      origen: { stringValue: "manual" },
      calculos: { integerValue: "2" },
      // El Firestore de mentira sólo tiene la tabla de contribuciones de julio:
      // al recibo de septiembre le faltan datos (usó la de otro mes).
      faltanDatos: { booleanValue: true },
      // jsdom no es liquidar.ar.
      entorno: { stringValue: "prueba" },
    });
    // Nada del sueldo viaja con la calificación.
    expect(Object.keys(campos).some((k) => /neto|bruto|antig|basico|importe/i.test(k))).toBe(false);
    expect(JSON.stringify(campos)).not.toContain("1251841");

    // Recalcula después de calificar: la tarjeta es de cada recibo, y como ya
    // calificó no vuelve a aparecer (lo que toque no se pega al recibo anterior).
    await screen.findByText("¡Gracias! ¿Para qué la usaste?");
    fireEvent.change(screen.getByLabelText("Años de Antigüedad"), { target: { value: "6" } });
    fireEvent.click(botonCalcular());
    await vi.waitFor(() => expect(screen.queryByRole("radiogroup", { name: "¿Te sirvió este cálculo?" })).toBeNull());
    expect(enviarCalificacion).toHaveBeenCalledTimes(1);
  });

  it("si recalcula antes de que el alta conteste (red lenta), el recibo nuevo no vuelve a preguntar: quedaban dos calificaciones de la misma persona", async () => {
    // El alta no contesta nunca: el navegador no llega a anotar que ya calificó.
    enviarCalificacion.mockImplementationOnce(() => new Promise(() => {}));
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    fireEvent.click(botonCalcular());
    await screen.findByRole("heading", { name: "Simulación de recibo" });
    const cuatro = await screen.findByLabelText(/^4 de 5 estrellas/);
    fireEvent.pointerDown(cuatro, { pointerType: "touch" });
    fireEvent.click(cuatro);
    await vi.waitFor(() => expect(enviarCalificacion).toHaveBeenCalledTimes(1));
    expect(window.localStorage.length).toBe(0);

    fireEvent.change(screen.getByLabelText("Años de Antigüedad"), { target: { value: "9" } });
    fireEvent.click(botonCalcular());
    await vi.waitFor(() => expect(screen.queryByText("Cambiaste datos.")).toBeNull());
    await vi.waitFor(() => expect(document.querySelector("[data-calificacion]")).toBeNull());
    expect(screen.queryByRole("radiogroup", { name: "¿Te sirvió este cálculo?" })).toBeNull();
    expect(enviarCalificacion).toHaveBeenCalledTimes(1);
  });

  it("si el dato mal cargado está en una sección plegada, 'Calcular liquidación' la abre y lleva al campo (antes no hacía nada a la vista)", async () => {
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    const art = screen.getByLabelText(/Alícuota de ART/);
    const seccion = art.closest("details");
    seccion.open = true;
    fireEvent.change(art, { target: { value: "abc" } });
    seccion.open = false;
    fireEvent.click(botonCalcular());
    await vi.waitFor(() => expect(seccion.open).toBe(true));
    await vi.waitFor(() => expect(document.activeElement).toBe(art));
    expect(screen.getByRole("alert").textContent).toContain("Revisá estos datos");
  });

  it("con el modal de 'Reportar error' abierto, la página de atrás no se desplaza; al cerrarlo, vuelve", async () => {
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    fireEvent.click(botonCalcular());
    await screen.findByRole("heading", { name: "Simulación de recibo" });
    expect(document.documentElement.style.overflowY).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Reportar error / sugerencia" }));
    const modal = await screen.findByRole("dialog");
    expect(document.documentElement.style.overflowY).toBe("hidden");
    // El fondo hace scroll: si el panel no entra en la pantalla, se llega a la ✕ y a "Enviar".
    expect(modal.className).toContain("overflow-y-auto");
    fireEvent.click(within(modal).getByRole("button", { name: "Cerrar" }));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.documentElement.style.overflowY).toBe("");
  });

  it("la calificación va en la columna del recibo, después de 'Reportar error / sugerencia' y afuera de lo que se apaga con 'Cambiaste datos'", async () => {
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    fireEvent.click(botonCalcular());
    await screen.findByRole("heading", { name: "Simulación de recibo" });
    const region = await screen.findByRole("region", { name: "Calificá este cálculo" });
    const columna = document.querySelector("[data-recibo]");
    expect(columna.contains(region)).toBe(true);
    // Pegajosa con data-flotante: globals.css despega los otros sticky de main por debajo de 1536 px.
    expect(region.closest("[data-flotante]")).toBeTruthy();
    // Con Tab y con lector se llega en el orden en que se ve: después del recibo.
    const reportar = screen.getByRole("button", { name: "Reportar error / sugerencia" });
    expect(reportar.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Ya no está adentro de la tarjeta del recibo, debajo de los tres números.
    const radios = screen.getByRole("radiogroup", { name: "¿Te sirvió este cálculo?" });
    expect(columna.querySelector("[data-resumen]").closest(".rounded-2xl").contains(radios)).toBe(false);

    fireEvent.change(screen.getByLabelText("Años de Antigüedad"), { target: { value: "7" } });
    expect(screen.getByText("Cambiaste datos.")).toBeTruthy();
    expect(region.closest(".opacity-50")).toBeNull();
  });

  it("al calcular en una sola columna (el celular), el recibo queda arriba, debajo de la barra; en dos columnas, no", async () => {
    const llamadas = [];
    Element.prototype.scrollIntoView = function (opciones) {
      llamadas.push({ el: this, opciones });
    };
    const conAncho = (unaColumna) =>
      vi.fn((q) => ({ matches: unaColumna && q === "not all and (min-width: 64rem)", media: q, addEventListener() {}, removeEventListener() {} }));
    try {
      window.matchMedia = conAncho(true);
      let inicial = await cargarDatosDeCalculadora(ID);
      render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
      fireEvent.click(botonCalcular());
      const titulo = await screen.findByRole("heading", { name: "Simulación de recibo" });
      expect(llamadas).toHaveLength(1);
      expect(llamadas[0].el).toBe(document.querySelector("[data-recibo]"));
      expect(llamadas[0].opciones).toEqual({ block: "start" });
      expect(document.activeElement).toBe(titulo);
      cleanup();

      llamadas.length = 0;
      window.matchMedia = conAncho(false);
      inicial = await cargarDatosDeCalculadora(ID);
      render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
      fireEvent.click(botonCalcular());
      const tituloEnDosColumnas = await screen.findByRole("heading", { name: "Simulación de recibo" });
      expect(document.activeElement).toBe(tituloEnDosColumnas);
      expect(llamadas).toHaveLength(0);
    } finally {
      delete Element.prototype.scrollIntoView;
      delete window.matchMedia;
    }
  });

  it("la calificación queda flotando, sin × ni 'Ahora no', y vuelve con cada recibo hasta que califica", async () => {
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    fireEvent.click(botonCalcular());
    await screen.findByRole("heading", { name: "Simulación de recibo" });
    const estado = () => document.querySelector("[data-calificacion]")?.dataset.calificacion;
    await vi.waitFor(() => expect(estado()).toBe("flotando"), { timeout: 3000 });
    expect(screen.queryByRole("button", { name: /Cerrar|Ahora no/ })).toBeNull();

    fireEvent.change(screen.getByLabelText("Años de Antigüedad"), { target: { value: "3" } });
    fireEvent.click(botonCalcular());
    await vi.waitFor(() => expect(screen.queryByText("Cambiaste datos.")).toBeNull());
    await vi.waitFor(() => expect(estado()).toBe("flotando"));
    expect(screen.getByRole("radiogroup", { name: "¿Te sirvió este cálculo?" })).toBeTruthy();
    expect(enviarCalificacion).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
  });

  it("al calcular, la dirección guarda la simulación sin perder lo que viene después del # (#medidas, de la calificación)", async () => {
    window.history.replaceState(null, "", "/calcular/comercio-cct-130-75#medidas");
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    fireEvent.click(botonCalcular());
    await screen.findByRole("heading", { name: "Simulación de recibo" });
    expect(window.location.search).toContain("categoria=");
    expect(window.location.hash).toBe("#medidas");
    // Y la tira se entera: está en el modo de medidas.
    await vi.waitFor(() => expect(document.querySelector("[data-calificacion]").hasAttribute("data-de-prueba")).toBe(true));
  });

  it("'Abrió un link compartido' es sólo el recibo que arma un link de 'Copiar link'; un F5 con la simulación en la URL es 'a mano'", async () => {
    const valores = { categoria: "Vendedor B", carga_horaria: 48, antiguedad_años: 5, horas_extras_50: 0, horas_extras_100: 0, afiliado_sindicato: false };
    const query = paramsDesdeEntradas(comercio, valores, "2026-09");
    const origenAlCalificar = async (busqueda) => {
      window.localStorage.clear();
      enviarCalificacion.mockClear();
      window.history.replaceState(null, "", `/calcular/comercio-cct-130-75?${busqueda}`);
      const inicial = await cargarDatosDeCalculadora(ID, `?${busqueda}`);
      render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
      await screen.findByRole("heading", { name: "Simulación de recibo" });
      fireEvent.click(screen.getByLabelText(/^4 de 5 estrellas/));
      await vi.waitFor(() => expect(enviarCalificacion).toHaveBeenCalledTimes(1));
      const origen = enviarCalificacion.mock.calls[0][0].writes[0].update.fields.origen.stringValue;
      cleanup();
      return origen;
    };
    expect(await origenAlCalificar(`${query}&via=link`)).toBe("link");
    expect(await origenAlCalificar(query)).toBe("manual");
  });

  it("si no se puede calcular, el aviso trae 'Reportar error / sugerencia' (abajo del recibo no hay recibo)", async () => {
    const inicial = await cargarDatosDeCalculadora(ID);
    render(<CalculadoraConvenio convenioId={ID} inicial={inicial} />);
    leerDocumento.mockRejectedValueOnce(new Error("No se pudo leer la base de datos (HTTP 503). Probá de nuevo en unos segundos."));
    fireEvent.change(screen.getByLabelText("Período a liquidar"), { target: { value: "2026-05" } });
    fireEvent.click(botonCalcular());
    const aviso = await screen.findByText(/No se pudo leer la base de datos/);
    const boton = within(aviso.closest('[role="alert"]')).getByRole("button", { name: "Reportar error / sugerencia" });
    fireEvent.click(boton);
    expect(await screen.findByRole("dialog", { name: "Reportar error / sugerencia" })).toBeTruthy();
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

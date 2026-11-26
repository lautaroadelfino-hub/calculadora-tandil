// @vitest-environment jsdom
// test/ui/calificarExperiencia.test.jsx
// La tarjeta "¿Te sirvió este cálculo?" del pie del recibo, como la usa una
// persona: un toque en las estrellas la guarda; lo opcional (qué falló, quién
// es, comentario) corrige la misma calificación; "Ahora no" la esconde y no
// vuelve; y si no se pudo guardar, lo dice y deja reintentar. Lo que viaja a
// Firestore se mira en lo que recibe `enviar` (lib/calificaciones.js arma
// las escrituras; su forma la prueba test/calificaciones.test.js).

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import CalificarExperiencia from "../../components/calculadora/CalificarExperiencia.jsx";
import { CLAVE_LOCAL } from "../../lib/calificaciones.js";

afterEach(cleanup);

const CONTEXTO = { convenioId: "comercio-cct-130-75", periodo: "2026-11", categoria: "Vendedor B", origen: "manual", conAvisos: false, calculos: 1 };
const AHORA = new Date("2026-11-26T15:00:00Z");

function almacenEnMemoria(inicial = {}) {
  const mem = new Map(Object.entries(inicial));
  return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), mem };
}

function armar({ enviar = vi.fn(async () => {}), almacen = almacenEnMemoria(), espera = 0 } = {}) {
  render(<CalificarExperiencia contexto={CONTEXTO} enviar={enviar} almacen={almacen} ahora={() => AHORA} espera={espera} />);
  return { enviar, almacen };
}

const estrella = (n) => screen.getByLabelText(new RegExp(`^${n} de 5 estrellas`));
const campos = (llamada) => llamada[0].writes[0].update.fields;
const escritura = (llamada) => llamada[0].writes[0];

describe("la tarjeta de calificación", () => {
  it("un toque en las estrellas guarda la calificación con su contexto, y aparece lo opcional", async () => {
    const { enviar, almacen } = armar();
    expect(screen.getByRole("group", { name: "¿Te sirvió este cálculo?" })).toBeTruthy();
    fireEvent.click(estrella(4));

    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    const w = escritura(enviar.mock.calls[0]);
    expect(w.currentDocument).toEqual({ exists: false });
    expect(campos(enviar.mock.calls[0])).toMatchObject({
      estrellas: { integerValue: "4" },
      convenioId: { stringValue: "comercio-cct-130-75" },
      periodo: { stringValue: "2026-11" },
      categoria: { stringValue: "Vendedor B" },
      origen: { stringValue: "manual" },
      calculos: { integerValue: "1" },
      dispositivo: { stringValue: "escritorio" },
    });

    expect(await screen.findByText(/¡Gracias!/)).toBeTruthy();
    // Con 4 estrellas no se pregunta qué falló; sí para qué la usó y el comentario.
    expect(screen.queryByRole("group", { name: /Qué falló/ })).toBeNull();
    expect(screen.getByRole("group", { name: /Para qué la usaste/ })).toBeTruthy();
    expect(screen.getByLabelText("Comentario (opcional)")).toBeTruthy();
    // El navegador recuerda que calificó, con el id para poder completarla.
    const registro = JSON.parse(almacen.mem.get(CLAVE_LOCAL));
    expect(registro).toMatchObject({ estado: "calificada", el: AHORA.toISOString() });
    expect(w.update.name.endsWith(`/calificaciones/${registro.id}`)).toBe(true);
  });

  it("con 3 o menos pregunta qué falló, y cada respuesta corrige la MISMA calificación", async () => {
    const { enviar, almacen } = armar();
    fireEvent.click(estrella(2));
    await screen.findByRole("group", { name: /Qué falló/ });

    fireEvent.click(screen.getByRole("button", { name: "El número no me cierra" }));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    const segunda = escritura(enviar.mock.calls[1]);
    expect(segunda.currentDocument).toEqual({ exists: true });
    expect(segunda.update.fields.motivos).toEqual({ arrayValue: { values: [{ stringValue: "numero_no_cierra" }] } });
    const id = JSON.parse(almacen.mem.get(CLAVE_LOCAL)).id;
    expect(segunda.update.name.endsWith(`/calificaciones/${id}`)).toBe(true);
    expect(screen.getByRole("button", { name: "El número no me cierra" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Soy empleador" }));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(3));
    expect(campos(enviar.mock.calls[2])).toMatchObject({
      estrellas: { integerValue: "2" },
      perfil: { stringValue: "empleador" },
      motivos: { arrayValue: { values: [{ stringValue: "numero_no_cierra" }] } },
    });
  });

  it("el comentario va con su botón, y avisa que quedó guardado", async () => {
    const { enviar } = armar();
    fireEvent.click(estrella(5));
    const caja = await screen.findByLabelText("Comentario (opcional)");
    const boton = screen.getByRole("button", { name: "Enviar comentario" });
    expect(boton.disabled).toBe(true);
    fireEvent.change(caja, { target: { value: "  Me sirvió para comparar con mi recibo  " } });
    fireEvent.click(boton);
    await screen.findByText("Comentario guardado. ¡Gracias!");
    const ultima = enviar.mock.calls.at(-1);
    expect(campos(ultima).comentario).toEqual({ stringValue: "Me sirvió para comparar con mi recibo" });
    expect(escritura(ultima).currentDocument).toEqual({ exists: true });
  });

  it("varios toques seguidos se juntan en uno solo", async () => {
    const { enviar } = armar({ espera: 60 });
    fireEvent.click(estrella(2));
    fireEvent.click(estrella(3));
    fireEvent.click(estrella(5));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    expect(campos(enviar.mock.calls[0]).estrellas).toEqual({ integerValue: "5" });
    await new Promise((r) => setTimeout(r, 120));
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it("'Ahora no' la esconde, no manda nada y el navegador lo recuerda", async () => {
    const { enviar, almacen } = armar();
    fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));
    expect(screen.queryByRole("group", { name: "¿Te sirvió este cálculo?" })).toBeNull();
    expect(enviar).not.toHaveBeenCalled();
    expect(JSON.parse(almacen.mem.get(CLAVE_LOCAL))).toEqual({ estado: "descartada", el: AHORA.toISOString() });
  });

  it("a quien ya calificó hace poco no se le pregunta", () => {
    const almacen = almacenEnMemoria({ [CLAVE_LOCAL]: JSON.stringify({ estado: "calificada", el: "2026-11-20T10:00:00.000Z", id: "x" }) });
    const { container } = render(<CalificarExperiencia contexto={CONTEXTO} enviar={vi.fn()} almacen={almacen} ahora={() => AHORA} espera={0} />);
    expect(container.textContent).toBe("");
  });

  it("si no se pudo guardar lo dice, y reintentar manda de nuevo la misma calificación", async () => {
    const enviar = vi.fn()
      .mockRejectedValueOnce(new Error("No pudimos guardar tu calificación. Probá de nuevo en un rato."))
      .mockResolvedValue(undefined);
    armar({ enviar });
    fireEvent.click(estrella(3));
    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos guardar tu calificación");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByText(/¡Gracias!/);
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(escritura(enviar.mock.calls[1]).currentDocument).toEqual({ exists: false });
    expect(campos(enviar.mock.calls[1]).estrellas).toEqual({ integerValue: "3" });
  });

  it("'Listo' la cierra con un agradecimiento", async () => {
    armar();
    fireEvent.click(estrella(5));
    fireEvent.click(await screen.findByRole("button", { name: "Listo" }));
    expect(screen.getByRole("status").textContent).toContain("¡Gracias por calificar!");
    expect(screen.queryByRole("group", { name: "¿Te sirvió este cálculo?" })).toBeNull();
  });
});

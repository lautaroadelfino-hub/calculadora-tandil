// @vitest-environment jsdom
// test/ui/calificarExperiencia.test.jsx
// La tarjeta "¿Te sirvió este cálculo?" del recibo, como la usa una persona:
// un toque en las estrellas la guarda en el acto; lo opcional (qué falló, para
// qué la usó, comentario) corrige la misma calificación; "Enviar" funciona sin
// escribir nada, pliega el panel y deja el agradecimiento; lo pendiente no se
// pierde si la tarjeta desaparece; y si no se pudo guardar, lo dice y deja
// reintentar sin duplicar. Lo que viaja a Firestore se mira en lo que recibe
// `enviar` (lib/calificaciones.js arma las escrituras; su forma la prueba
// test/calificaciones.test.js).

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import CalificarExperiencia from "../../components/calculadora/CalificarExperiencia.jsx";
import { CLAVE_LOCAL } from "../../lib/calificaciones.js";

afterEach(cleanup);

const CONTEXTO = { convenioId: "comercio-cct-130-75", periodo: "2026-11", categoria: "Vendedor B", origen: "manual", faltanDatos: false, calculos: 1 };
const AHORA = new Date("2026-11-26T15:00:00Z");

function almacenEnMemoria(inicial = {}) {
  const mem = new Map(Object.entries(inicial));
  return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), mem };
}

function armar({ enviar = vi.fn(async () => {}), almacen = almacenEnMemoria(), espera = 0, ahora = () => AHORA } = {}) {
  const vista = render(<CalificarExperiencia contexto={CONTEXTO} enviar={enviar} almacen={almacen} ahora={ahora} espera={espera} />);
  return { enviar, almacen, ...vista };
}

const estrella = (n) => screen.getByLabelText(new RegExp(`^${n} de 5 estrellas`));
const campos = (llamada) => llamada[0].writes[0].update.fields;
const escritura = (llamada) => llamada[0].writes[0];
const noHayRed = () => Object.assign(new Error("No hay conexión. Probá de nuevo en un rato."), { sinRespuesta: true });
const tarjeta = () => screen.queryByRole("radiogroup", { name: "¿Te sirvió este cálculo?" });

describe("la tarjeta de calificación", () => {
  it("es una sola línea con las estrellas, sin 'Ahora no'", () => {
    armar();
    expect(tarjeta()).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Ahora no" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Enviar" })).toBeNull(); // lo opcional aparece recién al calificar
  });

  it("un toque en las estrellas guarda la calificación en el acto, con su contexto, y aparece lo opcional", async () => {
    const { enviar, almacen } = armar({ espera: 10_000 });
    fireEvent.click(estrella(4));

    // Sin esperar a juntar toques: el que califica y cierra la pestaña también cuenta.
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    const w = escritura(enviar.mock.calls[0]);
    expect(w.currentDocument).toEqual({ exists: false });
    expect(campos(enviar.mock.calls[0])).toMatchObject({
      estrellas: { integerValue: "4" },
      convenioId: { stringValue: "comercio-cct-130-75" },
      periodo: { stringValue: "2026-11" },
      categoria: { stringValue: "Vendedor B" },
      origen: { stringValue: "manual" },
      faltanDatos: { booleanValue: false },
      calculos: { integerValue: "1" },
      dispositivo: { stringValue: "escritorio" },
      // jsdom corre en "localhost": no es liquidar.ar, así que es de prueba.
      entorno: { stringValue: "prueba" },
    });

    expect(await screen.findByText(/¡Gracias!/)).toBeTruthy();
    expect(screen.getByText("Todo es opcional.")).toBeTruthy();
    expect(screen.queryByRole("group", { name: /Qué falló/ })).toBeNull();
    expect(screen.getByRole("group", { name: /Para qué la usaste/ })).toBeTruthy();
    const registro = JSON.parse(almacen.mem.get(CLAVE_LOCAL));
    expect(registro).toMatchObject({ estado: "calificada", el: AHORA.toISOString() });
    expect(w.update.name.endsWith(`/calificaciones/${registro.id}`)).toBe(true);
  });

  it("'Enviar' no pide comentario: con sólo 'Contador o RR. HH.' manda, se pliega y agradece", async () => {
    const { enviar } = armar({ espera: 10_000 });
    fireEvent.click(estrella(5));
    await screen.findByText(/¡Gracias!/);
    fireEvent.click(screen.getByRole("button", { name: "Contador o RR. HH." }));
    const boton = screen.getByRole("button", { name: "Enviar" });
    expect(boton.disabled).toBe(false);
    fireEvent.click(boton);

    expect(await screen.findByText("¡Gracias por ayudar a mejorar!")).toBeTruthy();
    expect(tarjeta()).toBeNull();
    const ultima = enviar.mock.calls.at(-1);
    expect(campos(ultima)).toMatchObject({ estrellas: { integerValue: "5" }, perfil: { stringValue: "contador_rrhh" } });
    expect(campos(ultima).comentario).toBeUndefined();
    expect(screen.queryByRole("button", { name: "Borrar mi comentario" })).toBeNull();
  });

  it("'Enviar' funciona aunque se esté guardando una elección anterior (antes el clic se perdía)", async () => {
    let soltar;
    const enviar = vi.fn(async () => {});
    armar({ enviar, espera: 0 });
    fireEvent.click(estrella(4));
    await screen.findByText(/¡Gracias!/);
    // El guardado del perfil queda colgado un rato, como en una red lenta.
    enviar.mockImplementationOnce(() => new Promise((r) => { soltar = r; }));
    fireEvent.click(screen.getByRole("button", { name: "Contador o RR. HH." }));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    // Mientras se guarda sola la elección, nada cambia de lugar ni se apaga.
    expect(screen.queryByText("Guardando…")).toBeNull();
    const boton = screen.getByRole("button", { name: "Enviar" });
    expect(boton.disabled).toBe(false);
    fireEvent.click(boton);
    soltar();
    expect(await screen.findByText("¡Gracias por ayudar a mejorar!")).toBeTruthy();
    expect(campos(enviar.mock.calls.at(-1)).perfil).toEqual({ stringValue: "contador_rrhh" });
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

    fireEvent.click(screen.getByRole("button", { name: "Soy empleador" }));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(3));
    expect(campos(enviar.mock.calls[2])).toMatchObject({
      estrellas: { integerValue: "2" },
      perfil: { stringValue: "empleador" },
      motivos: { arrayValue: { values: [{ stringValue: "numero_no_cierra" }] } },
    });
  });

  it("el comentario va con 'Enviar', y desde el agradecimiento se puede borrar", async () => {
    const { enviar } = armar();
    fireEvent.click(estrella(3));
    fireEvent.change(await screen.findByLabelText("Comentario"), { target: { value: "  Me faltó el adicional por título  " } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await screen.findByText("¡Gracias por ayudar a mejorar!");
    expect(campos(enviar.mock.calls.at(-1)).comentario).toEqual({ stringValue: "Me faltó el adicional por título" });

    fireEvent.click(screen.getByRole("button", { name: "Borrar mi comentario" }));
    await screen.findByText("Borramos tu comentario.");
    const borrado = escritura(enviar.mock.calls.at(-1));
    expect(borrado.update.fields.comentario).toBeUndefined();
    expect(borrado.updateMask.fieldPaths).toContain("comentario");
  });

  it("si 'Enviar' no pudo guardar, el panel queda abierto con el error y 'Reintentar'", async () => {
    const enviar = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(noHayRed()).mockResolvedValue(undefined);
    armar({ enviar });
    fireEvent.click(estrella(4));
    fireEvent.change(await screen.findByLabelText("Comentario"), { target: { value: "Muy claro" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
    expect(screen.queryByText("¡Gracias por ayudar a mejorar!")).toBeNull();
    expect(screen.getByLabelText("Comentario").value).toBe("Muy claro");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(3));
    expect(campos(enviar.mock.calls[2]).comentario).toEqual({ stringValue: "Muy claro" });
  });

  it("después del alta, los toques seguidos se juntan en una sola corrección", async () => {
    const { enviar } = armar({ espera: 60 });
    fireEvent.click(estrella(2));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    await screen.findByText(/¡Gracias!/);
    fireEvent.click(estrella(3));
    fireEvent.click(estrella(5));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    expect(campos(enviar.mock.calls[1]).estrellas).toEqual({ integerValue: "5" });
    await new Promise((r) => setTimeout(r, 120));
    expect(enviar).toHaveBeenCalledTimes(2);
  });

  it("lo que estaba esperando para juntarse se manda igual si la tarjeta desaparece", async () => {
    const { enviar, unmount } = armar({ espera: 10_000 });
    fireEvent.click(estrella(5));
    await screen.findByText(/¡Gracias!/);
    fireEvent.click(screen.getByRole("button", { name: "Contador o RR. HH." }));
    expect(enviar).toHaveBeenCalledTimes(1); // todavía esperando
    unmount();
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    expect(campos(enviar.mock.calls[1]).perfil).toEqual({ stringValue: "contador_rrhh" });
  });

  it("si se cortó la red, reintentar usa el MISMO id: no duplica la calificación", async () => {
    const enviar = vi.fn().mockRejectedValueOnce(noHayRed()).mockResolvedValue(undefined);
    armar({ enviar });
    fireEvent.click(estrella(3));
    expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByText(/¡Gracias!/);
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(escritura(enviar.mock.calls[1]).update.name).toBe(escritura(enviar.mock.calls[0]).update.name);
    expect(escritura(enviar.mock.calls[1]).currentDocument).toEqual({ exists: false });
  });

  it("si el alta había llegado y se perdió la respuesta, el reintento la encuentra y sigue desde ahí", async () => {
    const yaExiste = Object.assign(new Error("No pudimos guardar tu calificación."), { status: 409 });
    const enviar = vi.fn()
      .mockRejectedValueOnce(noHayRed()) // el alta llegó, la respuesta no
      .mockRejectedValueOnce(yaExiste) // reintento del alta: ya existe
      .mockResolvedValue(undefined); // la corrección con el mismo id funciona
    armar({ enviar });
    fireEvent.click(estrella(2));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByText(/¡Gracias!/);
    expect(enviar).toHaveBeenCalledTimes(3);
    const [, segunda, tercera] = enviar.mock.calls.map(escritura);
    expect(segunda.currentDocument).toEqual({ exists: false });
    expect(tercera.currentDocument).toEqual({ exists: true });
    expect(tercera.update.name).toBe(segunda.update.name);
  });

  it("pasado el día que dan las reglas, no manda nada y dice claro que no se guardó", async () => {
    let hora = AHORA;
    const enviar = vi.fn(async () => {});
    armar({ enviar, ahora: () => hora });
    fireEvent.click(estrella(3));
    await screen.findByText(/¡Gracias!/);
    hora = new Date(AHORA.getTime() + 25 * 60 * 60 * 1000);
    fireEvent.click(screen.getByRole("button", { name: "Otra cosa" }));
    expect((await screen.findByRole("alert")).textContent).toContain("ya no se puede cambiar");
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("a quien ya calificó hace poco no se le pregunta", () => {
    const almacen = almacenEnMemoria({ [CLAVE_LOCAL]: JSON.stringify({ estado: "calificada", el: "2026-11-20T10:00:00.000Z", id: "x" }) });
    const { container } = armar({ almacen, enviar: vi.fn() });
    expect(container.textContent).toBe("");
  });
});

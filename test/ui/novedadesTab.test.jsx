// @vitest-environment jsdom
// test/ui/novedadesTab.test.jsx
// La pestaña Novedades de /admin, dibujada de verdad (jsdom). Lo que se
// protege: que el detalle que se escribe llegue a lo que se guarda (y que
// vacío se guarde como null, no como texto en blanco) y que el listado lo
// muestre, para poder revisar lo publicado sin salir del panel. Firestore no
// se toca: lib/novedades.js está simulado.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../lib/novedades.js", () => ({
  getNovedades: vi.fn(async () => [
    { id: "n1", date: "2026-11-26", title: "Escala de noviembre 2026: los básicos suben 1,7 %", detalle: "Suben 1,7 % los 43 básicos y los viáticos.", tag: "release", published: true, convenioId: "camioneros-cct-40-89" },
    { id: "d1-14", date: "2025-11-16", title: "Una novedad vieja, sin detalle", tag: "release", published: true },
  ]),
  crearNovedad: vi.fn(async () => "nueva"),
  guardarNovedad: vi.fn(async () => {}),
  borrarNovedad: vi.fn(async () => {}),
  importarHistorialD1: vi.fn(async () => 0),
  HISTORIAL_D1: [],
}));

import NovedadesTab from "../../components/admin/NovedadesTab.jsx";
import { crearNovedad } from "../../lib/novedades.js";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const convenios = [{ id: "camioneros-cct-40-89", nombre: "Camioneros" }];

describe("la pestaña Novedades", () => {
  it("el listado muestra el detalle de cada novedad que lo tiene", async () => {
    render(<NovedadesTab convenios={convenios} />);
    expect(await screen.findByText("Suben 1,7 % los 43 básicos y los viáticos.")).toBeTruthy();
    expect(screen.getByText("Una novedad vieja, sin detalle")).toBeTruthy();
  });

  it("publica con el detalle que se escribió, sin espacios de más", async () => {
    render(<NovedadesTab convenios={convenios} />);
    await screen.findByText("Una novedad vieja, sin detalle");
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "  Homologaron el acuerdo del 27 de octubre " } });
    fireEvent.change(screen.getByLabelText("Detalle"), { target: { value: " Disposición DI-2026-1424: homologa el acuerdo y las escalas. " } });
    fireEvent.change(screen.getByLabelText("Convenio"), { target: { value: "camioneros-cct-40-89" } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
    await waitFor(() => expect(crearNovedad).toHaveBeenCalledTimes(1));
    expect(crearNovedad.mock.calls[0][0]).toMatchObject({
      title: "Homologaron el acuerdo del 27 de octubre",
      detalle: "Disposición DI-2026-1424: homologa el acuerdo y las escalas.",
      convenioId: "camioneros-cct-40-89",
      tag: "release",
      published: true,
      url: null,
    });
    // Después de publicar, el formulario queda limpio para la siguiente.
    await waitFor(() => expect(screen.getByLabelText("Detalle").value).toBe(""));
  });

  it("sin detalle se guarda null, no un texto vacío", async () => {
    render(<NovedadesTab convenios={convenios} />);
    await screen.findByText("Una novedad vieja, sin detalle");
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Aviso sin detalle" } });
    fireEvent.change(screen.getByLabelText("Detalle"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
    await waitFor(() => expect(crearNovedad).toHaveBeenCalledTimes(1));
    expect(crearNovedad.mock.calls[0][0].detalle).toBeNull();
  });
});

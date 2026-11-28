// @vitest-environment jsdom
// test/ui/calificacionesTab.test.jsx
// La pestaña Calificaciones de /admin, dibujada de verdad (jsdom). Lo que se
// protege: desde que cada recibo se puede calificar (28/11/2026), una persona
// puede dejar varias calificaciones, y el panel tiene que poder contarla una
// sola vez: la tabla que separa la primera de las siguientes y el filtro
// "Quiénes". Las cuentas en sí las prueba test/calificaciones.test.js; acá,
// que lleguen a la pantalla. Firestore no se toca: está simulado.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const { DOCUMENTOS } = vi.hoisted(() => {
  const hace = (horas) => ({ toDate: () => new Date(Date.now() - horas * 3600_000) });
  return {
    DOCUMENTOS: [
      { id: "a", estrellas: 5, convenioId: "comercio-cct-130-75", periodo: "2026-11", perfil: "contador_rrhh", dispositivo: "escritorio", creadoEl: hace(3) },
      { id: "c", estrellas: 4, convenioId: "comercio-cct-130-75", periodo: "2026-11", dispositivo: "movil", creadoEl: hace(2) },
      // La misma persona que "a", en otro recibo: va marcada y trae el perfil sin que se lo pregunten de nuevo.
      {
        id: "b", estrellas: 2, convenioId: "comercio-cct-130-75", periodo: "2026-11", perfil: "contador_rrhh", dispositivo: "escritorio",
        yaCalifico: true, motivos: ["numero_no_cierra"], comentario: "No me cierra el presentismo", creadoEl: hace(1), actualizadoEl: hace(1),
      },
    ],
  };
});

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: DOCUMENTOS.map((d) => ({ id: d.id, data: () => d })) })),
  deleteDoc: vi.fn(async () => {}),
  writeBatch: vi.fn(() => ({ delete: vi.fn(), commit: vi.fn(async () => {}) })),
}));
vi.mock("@/lib/firebase", () => ({ db: {} }));

import CalificacionesTab from "../../components/admin/CalificacionesTab.jsx";

afterEach(cleanup);

const convenios = [{ id: "comercio-cct-130-75", nombre: "Comercio" }];
/** El número grande de la tarjeta "Calificaciones". */
const cuantas = () => screen.getByText("Calificaciones").nextSibling.textContent;
const fila = (nombre) => screen.getByRole("row", { name: nombre }).textContent;
const elegirQuienes = (valor) => fireEvent.change(screen.getByLabelText("Quiénes"), { target: { value: valor } });

describe("la pestaña Calificaciones", () => {
  it("cuenta aparte la primera calificación de cada persona y las de quien ya había calificado", async () => {
    render(<CalificacionesTab convenios={convenios} />);
    await screen.findByText("¿Primera vez, o ya había calificado otro recibo?");
    expect(cuantas()).toBe("3");
    expect(fila(/Primera calificación/)).toMatch(/2\s*4,5\s*100%/);
    expect(fila(/Ya había calificado/)).toMatch(/1\s*2,0\s*0%/);
    // En el comentario y en la lista completa se ve cuál es de alguien que ya había calificado.
    expect(screen.getAllByText("· ya había calificado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No me cierra el presentismo").length).toBeGreaterThan(0);
  });

  it("con 'Sólo la primera de cada persona', cada una cuenta una vez; con 'Sólo de quien ya había calificado', las otras", async () => {
    render(<CalificacionesTab convenios={convenios} />);
    await screen.findByText("¿Primera vez, o ya había calificado otro recibo?");

    elegirQuienes("primera");
    expect(cuantas()).toBe("2");
    // Con una sola clase a la vista, la tabla que las separa no dice nada: se va.
    expect(screen.queryByText("¿Primera vez, o ya había calificado otro recibo?")).toBeNull();
    expect(screen.queryByText("No me cierra el presentismo")).toBeNull();
    expect(screen.getByText("Nadie dejó comentario en este período.")).toBeTruthy();

    elegirQuienes("siguiente");
    expect(cuantas()).toBe("1");
    expect(screen.getAllByText("No me cierra el presentismo").length).toBeGreaterThan(0);

    elegirQuienes("");
    expect(cuantas()).toBe("3");
    expect(screen.getByText("¿Primera vez, o ya había calificado otro recibo?")).toBeTruthy();
  });
});

// @vitest-environment jsdom
// test/ui/bandeja.test.jsx
// La Bandeja dibujada de verdad (jsdom): los pendientes con su mes, las marcas
// de "mes futuro" y "revisión", las advertencias, los links a la fuente, la
// franja del vigía, y que Abrir y Descartar devuelvan el borrador que se tocó.
// Lo publicado y lo descartado van al historial, no a la lista.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import Bandeja from "../../components/admin/Bandeja.jsx";

afterEach(cleanup);

const ahora = new Date("2026-11-05T15:00:00.000Z");
const pendiente = {
  id: "contribuciones--nacional--2026-12", tipo: "contribuciones", periodo: "2026-12", estado: "requiere_revision",
  resumen: "Diciembre 2026: bases $150.000,00 / $4.900.000,00 (Resolución ANSES 330/2026) · FFEP $1.970,00 (arrastrado de Octubre 2026, falta la Disposición SRT)",
  advertencias: ["El FFEP es el de Octubre 2026: todavía no salió la Disposición de la SRT."],
  fuente: { url: "https://www.boletinoficial.gob.ar/detalleAviso/primera/1/20261130", titulo: "Resolución ANSES 330/2026" },
  partes: { bases_art9: { origen: "boletin", avisoUrl: "https://www.boletinoficial.gob.ar/detalleAviso/primera/1/20261130", norma: "Resolución ANSES 330/2026" }, ffep: { origen: "arrastrado", avisoUrl: "https://www.boletinoficial.gob.ar/detalleAviso/primera/2/20261027", norma: "Disposición SRT 10/2026" } },
  creadoEl: "2026-11-05T12:00:09.000Z", actualizadoEl: "2026-11-05T12:00:09.000Z",
};
const revision = {
  id: "contribuciones--nacional--2026-09--revision-2026-11-05", tipo: "contribuciones", periodo: "2026-09", estado: "requiere_revision",
  revisa: "parametros_contribuciones/2026-09", resumen: "REVISAR Septiembre 2026: FFEP: publicado $1.935,00, el Boletín dice $1.940,00",
  advertencias: [], fuente: { url: "https://www.boletinoficial.gob.ar/detalleAviso/primera/3/20260925" }, creadoEl: "2026-11-05T12:00:10.000Z",
};
const publicado = {
  id: "contribuciones--nacional--2026-10", tipo: "contribuciones", periodo: "2026-10", estado: "publicado",
  resumen: "Octubre 2026", publicadoEl: "2026-10-02T12:00:00.000Z", creadoEl: "2026-10-01T12:00:00.000Z",
};
const escala = {
  id: "escala--comercio-cct-130-75--2026-11", tipo: "escala", convenioId: "comercio-cct-130-75", periodo: "2026-11", estado: "pendiente",
  resumen: "21 categorías, básicos +2,0 %", advertencias: [], fuente: { url: "https://www.faecys.org.ar/x", titulo: "Circular" },
  archivos: [{ ruta: "borradores/x/circular.pdf", url: "https://storage/x.pdf", nombre: "circular.pdf" }], provisorio: true, creadoEl: "2026-11-04T12:00:00.000Z",
};
const estado = { ultimaCorrida: { id: "2026-11-05T12-00-07Z", fin: "2026-11-05T12:00:40.000Z" }, fuentes: { boletinOficial: { fallasSeguidas: 0 } } };
const convenios = [{ id: "comercio-cct-130-75", nombre: "Comercio (CCT 130/75)" }];

describe("la Bandeja", () => {
  it("muestra los pendientes con su mes y sus marcas, y la franja del vigía en verde", () => {
    render(<Bandeja borradores={[pendiente, revision, publicado, escala]} estado={estado} convenios={convenios} ahora={ahora} onAbrir={() => {}} onDescartar={() => {}} />);
    const franja = screen.getByRole("status");
    expect(franja.textContent).toContain("3 pendientes");
    expect(franja.textContent).toContain("Última corrida hace 2 horas");
    expect(franja.className).toContain("emerald");

    expect(screen.getByText("Diciembre 2026")).toBeTruthy();
    expect(screen.getByText("mes futuro")).toBeTruthy();
    expect(screen.getByText("revisión de un mes publicado")).toBeTruthy();
    expect(screen.getByText("provisorio")).toBeTruthy();
    expect(screen.getAllByText("Contribuciones")).toHaveLength(2);
    expect(screen.getByText("Escala · Comercio (CCT 130/75)")).toBeTruthy();
    expect(screen.getByText(/todavía no salió la Disposición de la SRT/)).toBeTruthy();
    expect(screen.getByText(/REVISAR Septiembre 2026/)).toBeTruthy();

    // Links: la fuente, la Disposición del FFEP (distinta de la fuente) y el archivo adjunto.
    expect(screen.getByRole("link", { name: "Resolución ANSES 330/2026" }).getAttribute("href")).toBe("https://www.boletinoficial.gob.ar/detalleAviso/primera/1/20261130");
    expect(screen.getByRole("link", { name: "Disposición SRT 10/2026" }).getAttribute("href")).toBe("https://www.boletinoficial.gob.ar/detalleAviso/primera/2/20261027");
    expect(screen.getByRole("link", { name: "circular.pdf" }).getAttribute("href")).toBe("https://storage/x.pdf");

    // Lo publicado va al historial, no a la lista.
    expect(screen.getByText(/Historial \(1\)/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Abrir" })).toHaveLength(3);
    expect(document.body.textContent).not.toMatch(/undefined|NaN|\[object/);
  });

  it("Abrir y Descartar devuelven el borrador que se tocó", () => {
    const onAbrir = vi.fn();
    const onDescartar = vi.fn();
    render(<Bandeja borradores={[pendiente, revision]} estado={estado} ahora={ahora} onAbrir={onAbrir} onDescartar={onDescartar} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Abrir" })[0]);
    expect(onAbrir).toHaveBeenCalledWith(pendiente);
    fireEvent.click(screen.getAllByRole("button", { name: "Descartar" })[1]);
    expect(onDescartar).toHaveBeenCalledWith(revision);
  });

  it("sin nada pendiente y sin corridas lo dice, y en rojo si el vigía no corre", () => {
    render(<Bandeja borradores={[publicado]} estado={null} ahora={ahora} onAbrir={() => {}} onDescartar={() => {}} />);
    expect(screen.getByRole("status").textContent).toContain("0 pendientes");
    expect(screen.getByRole("status").textContent).toContain("todavía no corrió");
    expect(screen.getByText("Nada pendiente.")).toBeTruthy();
    cleanup();
    render(<Bandeja borradores={[]} estado={{ ultimaCorrida: { id: "x", fin: "2026-11-01T12:00:00.000Z" }, fuentes: {} }} ahora={ahora} onAbrir={() => {}} onDescartar={() => {}} />);
    expect(screen.getByRole("status").className).toContain("rose");
    expect(screen.getByRole("status").textContent).toContain("hace 4 días");
  });

  it("las últimas corridas se listan con el estado de cada fuente", () => {
    const corridas = [{ id: "2026-11-05T12-00-07Z", modo: "cron", fuentes: { boletinOficial: { estado: "ok" } }, borradores: [{ id: "a" }] }, { id: "2026-11-04T12-00-03Z", modo: "cron", fuentes: { boletinOficial: { estado: "fallo", error: "HTTP 503" } }, borradores: [] }];
    render(<Bandeja borradores={[]} estado={estado} corridas={corridas} ahora={ahora} onAbrir={() => {}} onDescartar={() => {}} />);
    expect(screen.getByText(/Últimas corridas \(2\)/)).toBeTruthy();
    expect(screen.getByText(/boletinOficial: fallo \(HTTP 503\)/)).toBeTruthy();
    expect(screen.getByText(/1 borrador\(es\)/)).toBeTruthy();
  });
});

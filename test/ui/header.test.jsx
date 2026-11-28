// @vitest-environment jsdom
// test/ui/header.test.jsx
// El menú del celular de la barra de arriba (components/Header.jsx). La barra
// va pegada: abierto, el menú seguía tapando la página mientras se la
// desplazaba, y sólo se cerraba con su botón o eligiendo un link.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...resto }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

import Header from "../../components/Header.jsx";

afterEach(cleanup);

const botonDelMenu = () => screen.getByRole("button", { name: /menú/ });

describe("el menú del celular", () => {
  it("se abre con su botón y se cierra con Escape", () => {
    render(<Header />);
    expect(botonDelMenu().getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(botonDelMenu());
    expect(botonDelMenu().getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(botonDelMenu().getAttribute("aria-expanded")).toBe("false");
  });

  it("se cierra al desplazar la página: no queda tapándola", () => {
    render(<Header />);
    fireEvent.click(botonDelMenu());
    expect(botonDelMenu().getAttribute("aria-expanded")).toBe("true");
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(botonDelMenu().getAttribute("aria-expanded")).toBe("false");
  });

  it("cerrado, desplazar o apretar Escape no hace nada", () => {
    render(<Header />);
    act(() => window.dispatchEvent(new Event("scroll")));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(botonDelMenu().getAttribute("aria-expanded")).toBe("false");
  });
});

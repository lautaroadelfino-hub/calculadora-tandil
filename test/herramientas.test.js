// test/herramientas.test.js
// El registro de herramientas y los sectores de convenio. Lo que antes estaba
// escrito a mano en la portada, el encabezado y el panel lateral.

import { describe, it, expect } from "vitest";
import {
  HERRAMIENTAS, herramientasDisponibles, herramientasEnCamino,
  LINKS_NAVEGACION, SECTORES, estiloDeSector, estiloDeHerramienta,
} from "../lib/herramientas.js";
import { convenioToForm, formToConvenio } from "../lib/convenioForm.js";
import convenioGastro from "./fixtures/gastronomicos-cct-389-04.convenio.json";

describe("registro de herramientas", () => {
  it("cada herramienta tiene lo mínimo para pintarse", () => {
    for (const h of HERRAMIENTAS) {
      expect(h.id, "falta el id").toBeTruthy();
      expect(h.nombre, `${h.id}: falta el nombre`).toBeTruthy();
      expect(typeof h.disponible, `${h.id}: disponible debe ser booleano`).toBe("boolean");
    }
  });

  it("los ids no se repiten", () => {
    const ids = HERRAMIENTAS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("una herramienta disponible tiene a dónde ir", () => {
    for (const h of herramientasDisponibles()) {
      expect(h.href, `${h.id} está disponible pero no tiene href`).toBeTruthy();
      expect(h.href.startsWith("/")).toBe(true);
    }
  });

  it("disponibles y en camino parten el registro sin superponerse", () => {
    expect(herramientasDisponibles().length + herramientasEnCamino().length).toBe(HERRAMIENTAS.length);
    const idsDisponibles = herramientasDisponibles().map((h) => h.id);
    expect(herramientasEnCamino().some((h) => idsDisponibles.includes(h.id))).toBe(false);
  });

  it("el panel del empleador ya no existe como herramienta aparte", () => {
    // Hasta el 13/9/2026 este test exigía lo contrario. Ese día se decidió que
    // el costo laboral total va adentro del recibo (art. 140 inc. j) LCT,
    // Decreto 407/2026), así que el panel aparte dejó de tener sentido y
    // /empleador pasó a redirigir a la portada. Si alguien lo vuelve a agregar
    // sin hablarlo, esto lo frena: fue decisión, no olvido.
    expect(HERRAMIENTAS.find((h) => h.href === "/empleador")).toBeUndefined();
  });

  it("el roadmap incluye lo que la portada venía prometiendo", () => {
    const nombres = herramientasEnCamino().map((h) => h.nombre.toLowerCase()).join(" ");
    expect(nombres).toMatch(/aguinaldo/);
    expect(nombres).toMatch(/indemnizaci/);
    expect(nombres).toMatch(/pdf/);
  });
});

describe("navegación", () => {
  it("está escrita una sola vez y no se repite", () => {
    // Antes los links estaban en el Header dos veces: una para escritorio y
    // otra para el panel móvil, y había que acordarse de tocar las dos.
    const hrefs = LINKS_NAVEGACION.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/novedades");
  });

  it("cada link tiene texto", () => {
    for (const l of LINKS_NAVEGACION) expect(l.texto).toBeTruthy();
  });
});

describe("sectores de convenio", () => {
  it("el sector público está fuera de alcance a propósito", () => {
    // Decisión tomada, no una función pendiente: cada municipio y cada
    // provincia tiene su propio régimen, con caja y obra social propias que no
    // son las nacionales que aplica el motor. Si alguien vuelve a agregar la
    // opción sin hablarlo, este test lo frena.
    expect(SECTORES.map((x) => x.value)).not.toContain("publico");
    expect(estiloDeSector("publico").sector).toBe("Sector privado");
  });

  it("cada sector trae etiqueta y color", () => {
    for (const s of SECTORES) {
      expect(s.value).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(estiloDeHerramienta(s.color).border).toBeTruthy();
    }
  });

  it("devuelve la etiqueta que corresponde", () => {
    expect(estiloDeSector("gastronomico").sector).toBe("Gastronomía y hotelería");
  });

  it("un convenio sin sector cae en privado, no adivina mirando el id", () => {
    // El bug que reemplaza: se buscaba "fehgra"/"utghra" DENTRO del id, y el id
    // real es "gastronomicos-cct-389-04", que no contiene ninguno de los dos.
    // Además "utghra" estaba mal escrito (el sindicato es UTHGRA).
    expect(estiloDeSector(undefined).sector).toBe("Sector privado");
    expect(estiloDeSector("").sector).toBe("Sector privado");
    expect(estiloDeSector("un-sector-que-no-existe").sector).toBe("Sector privado");
  });

  it("todo sector devuelve clases de color utilizables", () => {
    for (const s of SECTORES) {
      const e = estiloDeSector(s.value);
      expect(e.border).toMatch(/border-/);
      expect(e.texto).toMatch(/text-/);
    }
  });
});

describe("el sector viaja en el documento del convenio", () => {
  it("se lee, se edita y se guarda", () => {
    const form = convenioToForm({ ...convenioGastro, sector: "gastronomico" });
    expect(form.sector).toBe("gastronomico");
    expect(formToConvenio(form, convenioGastro).sector).toBe("gastronomico");
  });

  it("un convenio viejo sin el campo no rompe nada", () => {
    const form = convenioToForm(convenioGastro);
    expect(form.sector).toBe("privado");
    expect(formToConvenio(form, convenioGastro).sector).toBe("privado");
  });

  it("el valor guardado siempre es uno de los sectores conocidos", () => {
    const valores = SECTORES.map((s) => s.value);
    for (const s of [...valores, undefined, ""]) {
      const doc = formToConvenio({
        id: "x-cct-1-1", nombre: "X", cct: "1/1", activo: true, sector: s,
        antiguedadPct: "", presentismoPct: "", retenciones: [], adicionales: [],
      });
      expect(valores).toContain(doc.sector);
    }
  });
});

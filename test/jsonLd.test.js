// test/jsonLd.test.js
import { describe, it, expect } from "vitest";
import { jsonLdSitio, jsonLdMigas, jsonLdAcuerdo, jsonLdFaq, serializarJsonLd } from "../lib/jsonLd.js";

describe("datos estructurados", () => {
  it("el sitio: WebSite y Organization enlazados", () => {
    const s = jsonLdSitio();
    expect(s["@context"]).toBe("https://schema.org");
    expect(s["@graph"].map((n) => n["@type"])).toEqual(["WebSite", "Organization"]);
    expect(s["@graph"][0].publisher["@id"]).toBe(s["@graph"][1]["@id"]);
    expect(s["@graph"][1].logo).toBe("https://liquidar.ar/brand/logo-liquidar.svg");
  });

  it("las migas llevan posición y URL absoluta", () => {
    const m = jsonLdMigas([{ nombre: "Inicio", url: "/" }, { nombre: "Acuerdos", url: "/acuerdos" }]);
    expect(m["@type"]).toBe("BreadcrumbList");
    expect(m.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://liquidar.ar/" },
      { "@type": "ListItem", position: 2, name: "Acuerdos", item: "https://liquidar.ar/acuerdos" },
    ]);
  });

  it("un acuerdo es un DigitalDocument con fecha, formato, fuente y convenio; sin campos vacíos", () => {
    const d = jsonLdAcuerdo({
      acuerdo: { titulo: "Escala salarial septiembre 2026", fecha: "2026-09-01", archivoTipo: "application/pdf", fuenteUrl: "https://sindicato.org/x" },
      convenio: { nombre: "Camioneros", cct: "40/89" },
      url: "/acuerdos/camioneros-cct-40-89/escala-salarial-septiembre-2026",
      descripcion: "Escala salarial de Camioneros (CCT 40/89) del 1 sept 2026.",
    });
    expect(d).toEqual({
      "@context": "https://schema.org",
      "@type": "DigitalDocument",
      name: "Escala salarial septiembre 2026",
      description: "Escala salarial de Camioneros (CCT 40/89) del 1 sept 2026.",
      url: "https://liquidar.ar/acuerdos/camioneros-cct-40-89/escala-salarial-septiembre-2026",
      datePublished: "2026-09-01",
      inLanguage: "es-AR",
      encodingFormat: "application/pdf",
      about: { "@type": "Thing", name: "CCT 40/89" },
      isBasedOn: "https://sindicato.org/x",
      publisher: { "@type": "Organization", name: "LiquidAR", url: "https://liquidar.ar/" },
    });
    const sin = jsonLdAcuerdo({ acuerdo: { titulo: "x", fecha: "2026-01-01" }, convenio: {}, url: "/a" });
    expect("encodingFormat" in sin).toBe(false);
    expect("about" in sin).toBe(false);
    expect("isBasedOn" in sin).toBe(false);
    expect("description" in sin).toBe(false);
  });

  it("las preguntas frecuentes", () => {
    const f = jsonLdFaq([{ pregunta: "¿Cuánto?", respuesta: "Tanto." }]);
    expect(f["@type"]).toBe("FAQPage");
    expect(f.mainEntity[0]).toEqual({ "@type": "Question", name: "¿Cuánto?", acceptedAnswer: { "@type": "Answer", text: "Tanto." } });
  });

  it("al serializar, '<' queda escapado para que nadie cierre el script", () => {
    expect(serializarJsonLd({ a: "</script><b>" })).toBe('{"a":"\\u003c/script>\\u003cb>"}');
  });
});

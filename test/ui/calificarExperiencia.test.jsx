// @vitest-environment jsdom
// test/ui/calificarExperiencia.test.jsx
// La tarjeta "¿Te sirvió este cálculo?" del recibo, como la usa una persona.
// - Entra recién cuando se vieron los tres números. No tiene × ni "Ahora no":
//   si después de la estrella la persona sigue leyendo, se achica a una línea.
// - Un toque en las estrellas la guarda en el acto. Después sigue de a una
//   pregunta (qué falló, para qué la usó, un comentario), y cada respuesta
//   corrige la misma calificación.
// - "Enviar" funciona sin escribir nada, pliega el panel y deja el
//   agradecimiento.
// - Lo pendiente sale igual si la tarjeta desaparece o la página se va,
//   aunque haya otro envío esperando respuesta.
// - Si no se pudo guardar, lo dice y deja reintentar sin duplicar.
// Lo que viaja a Firestore se mira en lo que recibe `enviar`: lib/calificaciones.js
// arma las escrituras, y su forma la prueba test/calificaciones.test.js.
// jsdom no tiene layout, ni sticky, ni teclado de celular: eso se mira a mano
// en el navegador (README, sección 5).

import { describe, it, expect, vi, afterEach } from "vitest";
// Las reglas como texto, con ?raw de Vite. Con node:fs, el build de Cloudflare
// (que corre los tests con NODE_ENV=production) no cargaba este archivo de
// jsdom: "No such built-in module: node:".
import REGLAS from "../../firestore.rules?raw";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import CalificarExperiencia, { AVISO_GUARDADA } from "../../components/calculadora/CalificarExperiencia.jsx";
import { preguntaDelComentario, PREGUNTA_POR_MOTIVO } from "../../components/calculadora/calificacion/piezas.jsx";
import { CLAVE_LOCAL, MOTIVOS, CAMPOS_QUE_CAMBIAN } from "../../lib/calificaciones.js";

const SCROLL_ORIGINAL = Object.getOwnPropertyDescriptor(window, "scrollY");
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  ObservadorFalso.todos = [];
  if (SCROLL_ORIGINAL) Object.defineProperty(window, "scrollY", SCROLL_ORIGINAL);
  else delete window.scrollY;
});

/**
 * El mouse se apoya en la tarjeta: un clic con el mouse (así la tarjeta sabe
 * que es un mouse) y :hover, que jsdom no calcula. `sacar()` lo saca.
 */
function conElMouseEncima(tarjeta) {
  let encima = true;
  const matches = tarjeta.matches.bind(tarjeta);
  tarjeta.matches = (sel) => (sel === ":hover" ? encima : matches(sel));
  fireEvent.pointerDown(tarjeta, { pointerType: "mouse" });
  return { sacar: () => (encima = false) };
}

/** La página se mueve hasta `y` (en el celular hace scroll el body; acá alcanza con la ventana). */
function moverLaPagina(y) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  act(() => document.dispatchEvent(new Event("scroll")));
}

const CONTEXTO = { convenioId: "comercio-cct-130-75", periodo: "2026-11", categoria: "Vendedor B", origen: "manual", faltanDatos: false, calculos: 1 };
const AHORA = new Date("2026-11-26T15:00:00Z");
// Sin esperas: la entrada, la pausa antes de avanzar, el pie bloqueado y la salida.
const RAPIDO = { entrada: 0, pausa: 0, pie: 0, agradecimiento: 60_000, salida: 0 };

function almacenEnMemoria(inicial = {}) {
  const mem = new Map(Object.entries(inicial));
  return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), mem };
}

/** Un IntersectionObserver de mentira: el test dice qué se ve. */
class ObservadorFalso {
  static todos = [];
  constructor(cb, opciones) {
    this.cb = cb;
    this.opciones = opciones;
    this.observados = [];
    ObservadorFalso.todos.push(this);
  }
  observe(el) {
    this.observados.push(el);
  }
  unobserve() {}
  disconnect() {
    this.desconectado = true;
  }
  ver(entrada) {
    act(() => this.cb([{ intersectionRatio: 0, isIntersecting: true, boundingClientRect: { bottom: 300 }, rootBounds: { top: 60 }, ...entrada }], this));
  }
}

/** La tarjeta como la arma la calculadora: dentro de la columna del recibo, después de los tres números. */
function Recibo({ children }) {
  return (
    <div data-recibo="">
      <div data-resumen="">Neto a cobrar</div>
      <button type="button">Reportar error / sugerencia</button>
      {children}
    </div>
  );
}

function armar({ enviar = vi.fn(async () => {}), almacen = almacenEnMemoria(), espera = 0, ahora = () => AHORA, tiempos = RAPIDO, visita = "nueva", desactualizado = false } = {}) {
  const alCambiarVisita = vi.fn();
  const props = { contexto: CONTEXTO, enviar, almacen, ahora, espera, tiempos, visita, desactualizado, alCambiarVisita };
  const vista = render(
    <Recibo>
      <CalificarExperiencia {...props} />
    </Recibo>
  );
  const redibujar = (cambios) =>
    vista.rerender(
      <Recibo>
        <CalificarExperiencia {...props} {...cambios} />
      </Recibo>
    );
  return { enviar, almacen, alCambiarVisita, redibujar, ...vista };
}

// Un toque con el dedo y un clic con el mouse avanzan solos; con el teclado, no.
const tocar = (el) => {
  fireEvent.pointerDown(el, { pointerType: "touch" });
  fireEvent.click(el);
};
const cliquear = (el) => {
  fireEvent.pointerDown(el, { pointerType: "mouse" });
  fireEvent.click(el);
};
const conTeclado = (el) => {
  fireEvent.keyDown(el, { key: " " });
  fireEvent.click(el);
};

const estrella = (n) => screen.getByLabelText(new RegExp(`^${n} de 5 estrellas`));
const boton = (nombre) => screen.getByRole("button", { name: nombre });
const riel = () => document.querySelector("[data-calificacion]");
const region = () => screen.getByRole("region", { name: "Calificá este cálculo" });
const campos = (llamada) => llamada[0].writes[0].update.fields;
const escritura = (llamada) => llamada[0].writes[0];
const noHayRed = () => Object.assign(new Error("No hay conexión. Probá de nuevo en un rato."), { sinRespuesta: true });
const estrellas = () => screen.queryByRole("radiogroup", { name: "¿Te sirvió este cálculo?" });
const puntos = () => document.querySelectorAll("[data-punto]");
/** Hasta "¡Gracias! ¿Para qué la usaste?", con un toque en la estrella. */
const hastaElPerfil = async (n = 5) => {
  tocar(estrella(n));
  return screen.findByRole("group", { name: /Para qué la usaste/ });
};

describe("cuándo aparece", () => {
  it("entra recién cuando los tres números estuvieron enteros a la vista", async () => {
    vi.stubGlobal("IntersectionObserver", ObservadorFalso);
    const { alCambiarVisita } = armar();
    expect(riel().dataset.calificacion).toBe("oculta");
    expect(region().hasAttribute("inert")).toBe(true);

    const [obs] = ObservadorFalso.todos;
    expect(obs.observados[0].hasAttribute("data-resumen")).toBe(true);
    expect(obs.opciones.rootMargin).toBe("-60px 0px -120px 0px");
    expect(obs.opciones.threshold).toContain(1);

    obs.ver({ intersectionRatio: 0.4, boundingClientRect: { bottom: 700 } }); // todavía abajo
    await new Promise((r) => setTimeout(r, 20));
    expect(riel().dataset.calificacion).toBe("oculta");

    obs.ver({ intersectionRatio: 1 });
    await waitFor(() => expect(riel().dataset.calificacion).toBe("flotando"));
    expect(region().hasAttribute("inert")).toBe(false);
    expect(obs.desconectado).toBe(true);
    expect(alCambiarVisita).toHaveBeenCalledWith("vista");
  });

  it("también entra si los números ya quedaron arriba; y sin IntersectionObserver, entra igual", async () => {
    vi.stubGlobal("IntersectionObserver", ObservadorFalso);
    armar();
    ObservadorFalso.todos[0].ver({ intersectionRatio: 0, isIntersecting: false, boundingClientRect: { bottom: 40 } });
    await waitFor(() => expect(riel().dataset.calificacion).toBe("flotando"));
    cleanup();
    vi.unstubAllGlobals();
    armar();
    await waitFor(() => expect(riel().dataset.calificacion).toBe("flotando"));
  });

  it("espera un compás después de ver los números, salvo desde el segundo recibo de la visita", async () => {
    vi.stubGlobal("IntersectionObserver", ObservadorFalso);
    armar({ tiempos: { ...RAPIDO, entrada: 10_000 } });
    ObservadorFalso.todos[0].ver({ intersectionRatio: 1 });
    await new Promise((r) => setTimeout(r, 30));
    expect(riel().dataset.calificacion).toBe("oculta");
    cleanup();

    const { alCambiarVisita } = armar({ visita: "vista", tiempos: { ...RAPIDO, entrada: 10_000 } });
    ObservadorFalso.todos.at(-1).ver({ intersectionRatio: 1 });
    await waitFor(() => expect(riel().dataset.calificacion).toBe("flotando"));
    expect(alCambiarVisita).not.toHaveBeenCalled();
  });

  it("no tiene × ni 'Ahora no': queda flotando", async () => {
    armar();
    await waitFor(() => expect(riel().dataset.calificacion).toBe("flotando"));
    expect(screen.queryByRole("button", { name: /Cerrar|Ahora no/ })).toBeNull();
  });

  it("a quien ya calificó hace poco no se le dibuja nada, ni el lugar", () => {
    const almacen = almacenEnMemoria({ [CLAVE_LOCAL]: JSON.stringify({ estado: "calificada", el: "2026-11-20T10:00:00.000Z", id: "x" }) });
    armar({ almacen, enviar: vi.fn() });
    expect(riel()).toBeNull();
    expect(screen.queryByRole("region", { name: "Calificá este cálculo" })).toBeNull();
  });

  it("con 'Cambiaste datos' y sin calificar se va mientras dure; si ya calificó, se queda", async () => {
    const { redibujar } = armar();
    await waitFor(() => expect(riel().dataset.calificacion).toBe("flotando"));
    redibujar({ desactualizado: true });
    expect(riel().dataset.calificacion).toBe("oculta");
    expect(region().hasAttribute("inert")).toBe(true);
    redibujar({ desactualizado: false });
    expect(riel().dataset.calificacion).toBe("flotando");

    tocar(estrella(4));
    redibujar({ desactualizado: true });
    expect(riel().dataset.calificacion).toBe("flotando");
    expect(region().hasAttribute("inert")).toBe(false);
  });
});

describe("de a una pregunta", () => {
  it("un toque en una estrella guarda en el acto, con su contexto, y pasa sola a la pregunta siguiente", async () => {
    const { enviar, almacen } = armar({ espera: 10_000 });
    tocar(estrella(4));

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
    const registro = JSON.parse(almacen.mem.get(CLAVE_LOCAL));
    expect(registro).toMatchObject({ estado: "calificada", el: AHORA.toISOString() });
    expect(w.update.name.endsWith(`/calificaciones/${registro.id}`)).toBe(true);

    expect(await screen.findByText("¡Gracias! ¿Para qué la usaste?")).toBeTruthy();
    expect(screen.getByText("Pregunta 2 de 3.", { exact: false })).toBeTruthy();
    expect(estrellas()).toBeNull();
    expect(puntos()).toHaveLength(3);
  });

  it("con el teclado no avanza sola: elige, aparece 'Seguir' y 'Seguir' sigue", async () => {
    armar();
    conTeclado(estrella(4));
    expect(await screen.findByRole("button", { name: "Seguir" })).toBeTruthy();
    await new Promise((r) => setTimeout(r, 30));
    expect(estrellas()).toBeTruthy();
    conTeclado(boton("Seguir"));
    expect(await screen.findByRole("group", { name: "¡Gracias! ¿Para qué la usaste?" })).toBeTruthy();
  });

  it("con 3 o menos pregunta qué falló, y cada respuesta corrige la MISMA calificación", async () => {
    const { enviar, almacen } = armar();
    tocar(estrella(2));
    expect(await screen.findByRole("group", { name: "Uy. ¿Qué falló?" })).toBeTruthy();
    expect(screen.getByText("Podés marcar varias. Así lo arreglamos.")).toBeTruthy();
    expect(screen.getByText("Pregunta 2 de 4.", { exact: false })).toBeTruthy();
    expect(puntos()).toHaveLength(4);
    expect(puntos()[0].dataset.punto).toBe("hecho");

    tocar(boton("El número no me cierra"));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    const segunda = escritura(enviar.mock.calls[1]);
    expect(segunda.currentDocument).toEqual({ exists: true });
    expect(segunda.update.fields.motivos).toEqual({ arrayValue: { values: [{ stringValue: "numero_no_cierra" }] } });
    const id = JSON.parse(almacen.mem.get(CLAVE_LOCAL)).id;
    expect(segunda.update.name.endsWith(`/calificaciones/${id}`)).toBe(true);
    // Se pueden marcar varias: no avanza sola.
    expect(screen.getByRole("group", { name: "Uy. ¿Qué falló?" })).toBeTruthy();

    tocar(boton("Seguir"));
    tocar(await screen.findByRole("button", { name: "Soy empleador" }));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(3));
    expect(campos(enviar.mock.calls[2])).toMatchObject({
      estrellas: { integerValue: "2" },
      perfil: { stringValue: "empleador" },
      motivos: { arrayValue: { values: [{ stringValue: "numero_no_cierra" }] } },
    });
    // Un solo motivo: el comentario pregunta por ese.
    expect(await screen.findByLabelText("¿Qué concepto no te cierra?")).toBeTruthy();
  });

  it("con 3 estrellas la pregunta es '¿Qué no te convenció?', y 'Seguir' sin marcar nada la saltea", async () => {
    armar();
    tocar(estrella(3));
    await screen.findByRole("group", { name: "¿Qué no te convenció?" });
    tocar(boton("Seguir"));
    expect(await screen.findByRole("group", { name: "¿Para qué la usaste?" })).toBeTruthy();
  });

  it("el pedido del dueño: con sólo 'Contador o RR. HH.' manda, se pliega y agradece, sin escribir nada", async () => {
    const { enviar } = armar({ espera: 10_000 });
    await hastaElPerfil(5);
    tocar(boton("Contador o RR. HH."));
    // Pasa sola al comentario; "Enviar" está activo con la caja vacía.
    const caja = await screen.findByLabelText("¿Algo que le agregarías?");
    expect(caja.value).toBe("");
    const enviarBoton = boton("Enviar");
    expect(enviarBoton.disabled).toBe(false);
    expect(enviarBoton.getAttribute("aria-disabled")).toBeNull();
    tocar(enviarBoton);

    expect(await screen.findByText("¡Gracias por ayudar a mejorar!")).toBeTruthy();
    const ultima = enviar.mock.calls.at(-1);
    expect(campos(ultima)).toMatchObject({ estrellas: { integerValue: "5" }, perfil: { stringValue: "contador_rrhh" } });
    expect(campos(ultima).comentario).toBeUndefined();
    expect(screen.queryByRole("button", { name: "Borrar mi comentario" })).toBeNull();
  });

  it("'Seguir' y 'Enviar' nunca están apagados; 'Enviar' dice 'Enviando…' sólo mientras manda", async () => {
    let soltar;
    const enviar = vi.fn(async () => {});
    armar({ enviar });
    await hastaElPerfil(4);
    expect(boton("Seguir").disabled).toBe(false);
    tocar(boton("Seguir"));
    await screen.findByRole("button", { name: "Enviar" });
    enviar.mockImplementationOnce(() => new Promise((r) => { soltar = r; }));
    tocar(boton("Enviar"));
    const enviando = await screen.findByRole("button", { name: "Enviando…" });
    expect(enviando.getAttribute("aria-disabled")).toBe("true");
    expect(enviando.disabled).toBe(false);
    soltar();
    expect(await screen.findByText("¡Gracias por ayudar a mejorar!")).toBeTruthy();
  });

  it("'Volver' deja corregir la estrella: corrige la misma calificación y cambia las preguntas", async () => {
    const { enviar } = armar();
    await hastaElPerfil(4);
    expect(puntos()).toHaveLength(3);
    tocar(boton("Volver"));
    await waitFor(() => expect(estrellas()).toBeTruthy());
    expect(estrella(4).checked).toBe(true);
    expect(boton("Seguir")).toBeTruthy();

    tocar(estrella(2));
    await screen.findByRole("group", { name: "Uy. ¿Qué falló?" });
    expect(puntos()).toHaveLength(4);
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    const correccion = escritura(enviar.mock.calls[1]);
    expect(correccion.currentDocument).toEqual({ exists: true });
    expect(correccion.update.name).toBe(escritura(enviar.mock.calls[0]).update.name);
    expect(correccion.update.fields.estrellas).toEqual({ integerValue: "2" });

    tocar(boton("Falta mi categoría o un concepto"));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(3));
    tocar(boton("Volver"));
    await waitFor(() => expect(estrellas()).toBeTruthy());
    tocar(estrella(4));
    await screen.findByRole("group", { name: "¡Gracias! ¿Para qué la usaste?" });
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(4));
    // Con 4 no hay "qué falló": la corrección saca los motivos.
    const sinMotivos = escritura(enviar.mock.calls[3]);
    expect(sinMotivos.update.fields.motivos).toBeUndefined();
    expect(sinMotivos.updateMask.fieldPaths).toContain("motivos");
  });

  it("el pie no toma toques justo después de cambiar de pregunta (un doble toque salteaba una)", async () => {
    armar({ tiempos: { ...RAPIDO, pie: 80 } });
    await hastaElPerfil(5);
    const pie = document.querySelector("[data-pie]");
    expect(pie.className).toContain("pointer-events-none");
    await waitFor(() => expect(document.querySelector("[data-pie]").className).not.toContain("pointer-events-none"));
  });
});

describe("el comentario", () => {
  it("la pregunta se arma con lo que contestó", () => {
    for (const m of MOTIVOS) expect(PREGUNTA_POR_MOTIVO[m.id], m.id).toBeTruthy();
    expect(preguntaDelComentario({ estrellas: 2, motivos: ["numero_no_cierra"] }).titulo).toBe("¿Qué concepto no te cierra?");
    expect(preguntaDelComentario({ estrellas: 1, motivos: ["falta_categoria_o_concepto"] }).titulo).toBe("¿Qué te faltó?");
    expect(preguntaDelComentario({ estrellas: 3, motivos: ["dificil_de_usar"] }).titulo).toBe("¿En qué parte te trabaste?");
    expect(preguntaDelComentario({ estrellas: 2, motivos: ["datos_viejos"] }).titulo).toBe("¿Qué dato está viejo?");
    expect(preguntaDelComentario({ estrellas: 2, motivos: ["otro"] }).titulo).toBe("¿Qué pasó?");
    expect(preguntaDelComentario({ estrellas: 2, motivos: [] }).titulo).toBe("¿Qué esperabas y qué pasó?");
    expect(preguntaDelComentario({ estrellas: 3, motivos: ["otro", "datos_viejos"] }).titulo).toBe("¿Qué esperabas y qué pasó?");
    expect(preguntaDelComentario({ estrellas: 4, motivos: [] }).titulo).toBe("¿Qué le faltó para las 5 estrellas?");
    expect(preguntaDelComentario({ estrellas: 5, motivos: [] }).titulo).toBe("¿Algo que le agregarías?");
  });

  it("la caja: con su pregunta, la nota de datos personales, a 16 px y sin tomar el foco sola", async () => {
    armar();
    await hastaElPerfil(4);
    tocar(boton("Seguir"));
    const caja = await screen.findByLabelText("¿Qué le faltó para las 5 estrellas?");
    expect(caja.tagName).toBe("TEXTAREA");
    expect(caja.getAttribute("placeholder")).toBe("Una idea, algo que no encontraste…");
    expect(document.getElementById(caja.getAttribute("aria-describedby")).textContent).toBe(
      "Es opcional. No escribas datos personales (nombre, CUIL, empresa)."
    );
    expect(caja.className).toContain("text-[16px]");
    expect(caja.autofocus).toBe(false);
    // Con el dedo, el foco no va a la caja: el teclado taparía media pantalla a quien no pidió escribir.
    expect(document.activeElement).not.toBe(caja);
  });

  it("sale sólo con 'Enviar', recortado; desde el agradecimiento se puede borrar", async () => {
    const { enviar } = armar();
    await hastaElPerfil(5);
    tocar(boton("Seguir"));
    fireEvent.change(await screen.findByLabelText("¿Algo que le agregarías?"), { target: { value: "  Falta el convenio de bancarios  " } });
    await new Promise((r) => setTimeout(r, 30));
    expect(enviar).toHaveBeenCalledTimes(1); // escribir no manda nada
    tocar(boton("Enviar"));
    await screen.findByText("¡Gracias por ayudar a mejorar!");
    expect(campos(enviar.mock.calls.at(-1)).comentario).toEqual({ stringValue: "Falta el convenio de bancarios" });

    tocar(boton("Borrar mi comentario"));
    await waitFor(() => expect(screen.getAllByText("Borramos tu comentario.").length).toBeGreaterThan(0));
    // La región viva cambia en un efecto, un instante después del texto: se espera a ella.
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Borramos tu comentario."));
    const borrado = escritura(enviar.mock.calls.at(-1));
    expect(borrado.update.fields.comentario).toBeUndefined();
    expect(borrado.updateMask.fieldPaths).toContain("comentario");
  });

  it("si 'Enviar' no pudo guardar, queda en el comentario con el error y lo escrito; otro 'Enviar' lo manda", async () => {
    const enviar = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(noHayRed()).mockResolvedValue(undefined);
    armar({ enviar });
    await hastaElPerfil(4);
    tocar(boton("Seguir"));
    fireEvent.change(await screen.findByLabelText("¿Qué le faltó para las 5 estrellas?"), { target: { value: "Muy claro" } });
    tocar(boton("Enviar"));
    expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
    expect(screen.queryByText("¡Gracias por ayudar a mejorar!")).toBeNull();
    expect(screen.getByLabelText("¿Qué le faltó para las 5 estrellas?").value).toBe("Muy claro");
    // En este paso no hay "Reintentar": "Enviar" reintenta.
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
    tocar(boton("Enviar"));
    expect(await screen.findByText("¡Gracias por ayudar a mejorar!")).toBeTruthy();
    expect(campos(enviar.mock.calls[2]).comentario).toEqual({ stringValue: "Muy claro" });
  });
});

describe("el foco y el lector de pantalla", () => {
  it("con teclado, el foco va al título de cada pregunta; al comentario, a la caja; al final, al agradecimiento", async () => {
    armar();
    conTeclado(estrella(5));
    conTeclado(await screen.findByRole("button", { name: "Seguir" }));
    await screen.findByRole("group", { name: "¡Gracias! ¿Para qué la usaste?" });
    await waitFor(() => expect(document.activeElement.textContent).toContain("¡Gracias! ¿Para qué la usaste?"));
    expect(document.activeElement.textContent).toContain("Pregunta 2 de 3.");

    conTeclado(boton("Seguir"));
    const caja = await screen.findByLabelText("¿Algo que le agregarías?");
    await waitFor(() => expect(document.activeElement).toBe(caja));

    conTeclado(boton("Enviar"));
    await screen.findByText("¡Gracias por ayudar a mejorar!");
    await waitFor(() => expect(document.activeElement.textContent).toBe("¡Gracias por ayudar a mejorar!"));
    expect(document.activeElement).not.toBe(document.body);
  });

  it("con el mouse, al llegar al comentario el cursor ya está en la caja", async () => {
    armar();
    cliquear(estrella(4));
    cliquear(await screen.findByRole("button", { name: "Seguir" }));
    const caja = await screen.findByLabelText("¿Qué le faltó para las 5 estrellas?");
    await waitFor(() => expect(document.activeElement).toBe(caja));
  });

  it("la región viva existe vacía y avisa recién cuando el alta respondió", async () => {
    let soltar;
    const enviar = vi.fn(() => new Promise((r) => { soltar = r; }));
    armar({ enviar });
    const viva = screen.getByRole("status");
    expect(viva.getAttribute("aria-live")).toBe("polite");
    expect(viva.textContent).toBe("");
    tocar(estrella(5));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    expect(viva.textContent).toBe("");
    await act(async () => soltar());
    await waitFor(() => expect(viva.textContent).toBe(AVISO_GUARDADA));
  });

  it("si el alta llega recién con 'Enviar', no avisa 'Lo que sigue es opcional': ya no sigue nada", async () => {
    const enviar = vi.fn().mockRejectedValueOnce(noHayRed()).mockResolvedValue(undefined);
    armar({ enviar });
    await hastaElPerfil(5);
    expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
    tocar(boton("Seguir"));
    tocar(await screen.findByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("¡Gracias por ayudar a mejorar!")).toBeTruthy();
    expect(screen.getByRole("status").textContent).not.toContain("Lo que sigue es opcional");
  });

  it("'Reintentar' lleva el foco al título antes de desaparecer (si no, quedaba en el body)", async () => {
    const enviar = vi.fn().mockRejectedValueOnce(noHayRed()).mockImplementationOnce(() => new Promise(() => {}));
    armar({ enviar });
    conTeclado(estrella(3));
    const reintentar = await screen.findByRole("button", { name: "Reintentar" });
    act(() => reintentar.focus());
    conTeclado(reintentar);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull());
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement.textContent).toContain("¿Te sirvió este cálculo?");
  });
});

describe("sin ×, para no molestar", () => {
  it("si después de la estrella sigue leyendo el recibo, la pregunta se achica a una línea que sigue flotando; un toque la abre donde estaba", async () => {
    armar();
    // Antes de calificar no se achica: las estrellas son la invitación.
    moverLaPagina(0);
    moverLaPagina(600);
    expect(estrellas()).toBeTruthy();

    await hastaElPerfil(5);
    moverLaPagina(600);
    moverLaPagina(700); // un poco: no
    expect(screen.getByRole("group", { name: "¡Gracias! ¿Para qué la usaste?" })).toBeTruthy();
    moverLaPagina(900);
    expect(document.querySelector("[data-achicada]")).toBeTruthy();
    const linea = screen.getByRole("button", { name: /^¡Gracias! ¿Para qué la usaste\?\s*Pregunta 2 de 3\.$/ });
    expect(linea.getAttribute("aria-expanded")).toBe("false");
    expect(riel().dataset.calificacion).toBe("flotando");
    expect(screen.queryByRole("group", { name: "¡Gracias! ¿Para qué la usaste?" })).toBeNull();
    expect(puntos()).toHaveLength(3);

    tocar(linea);
    expect(await screen.findByRole("group", { name: "¡Gracias! ¿Para qué la usaste?" })).toBeTruthy();
    expect(document.querySelector("[data-achicada]")).toBeNull();
    // Abierta de una: con la transición de apertura, en Windows la barra de
    // scroll de adentro aparecía un instante y escondía la última fila.
    expect(region().querySelector(".grid-rows-\\[0fr\\]")).toBeNull();
  });

  it("un solo salto de la página ya cuenta (antes el primer tramo sólo fijaba desde dónde contar)", async () => {
    armar();
    await hastaElPerfil(5);
    moverLaPagina(400); // AvPág sin animación: un único evento de scroll
    expect(document.querySelector("[data-achicada]")).toBeTruthy();
  });

  it("no se achica con el mouse encima: la persona está con la tarjeta", async () => {
    armar();
    cliquear(estrella(5));
    await screen.findByRole("group", { name: "¡Gracias! ¿Para qué la usaste?" });
    const encima = conElMouseEncima(region());
    moverLaPagina(0);
    moverLaPagina(800);
    expect(document.querySelector("[data-achicada]")).toBeNull();
    encima.sacar();
    moverLaPagina(1000);
    expect(document.querySelector("[data-achicada]")).toBeTruthy();
  });

  it("no se achica mientras escribe el comentario", async () => {
    armar();
    await hastaElPerfil(4);
    tocar(boton("Seguir"));
    const caja = await screen.findByLabelText("¿Qué le faltó para las 5 estrellas?");
    act(() => caja.focus());
    moverLaPagina(0);
    moverLaPagina(800);
    expect(document.querySelector("[data-achicada]")).toBeNull();
    expect(screen.getByLabelText("¿Qué le faltó para las 5 estrellas?")).toBe(caja);
  });

  it("no se achica con un comentario escrito sin mandar: la línea escondería 'Enviar', lo único que lo manda", async () => {
    armar();
    await hastaElPerfil(4);
    tocar(boton("Seguir"));
    fireEvent.change(await screen.findByLabelText("¿Qué le faltó para las 5 estrellas?"), { target: { value: "El presentismo" } });
    // Bajó el teclado (la caja ya no tiene el foco) y fue a mirar el recibo.
    moverLaPagina(0);
    moverLaPagina(800);
    expect(document.querySelector("[data-achicada]")).toBeNull();
    expect(boton("Enviar")).toBeTruthy();
  });

  it("con el mouse, el cursor que la tarjeta pone en la caja vacía no frena el achique", async () => {
    armar();
    cliquear(estrella(5));
    cliquear(await screen.findByRole("button", { name: "Soy empleador" }));
    const caja = await screen.findByLabelText("¿Algo que le agregarías?");
    await waitFor(() => expect(document.activeElement).toBe(caja));
    moverLaPagina(0);
    moverLaPagina(400);
    expect(document.querySelector("[data-achicada]")).toBeTruthy();
    // La caja, que tenía el foco, desapareció: el foco pasa a la línea.
    await waitFor(() => expect(document.activeElement.getAttribute("aria-expanded")).toBe("false"));
  });

  it("con el foco de un lector de pantalla adentro no se achica (elige sin mandar teclas ni toques); con el foco afuera, sí, y no se lo lleva", async () => {
    armar();
    await waitFor(() => expect(riel().dataset.calificacion).toBe("flotando"));
    const tres = estrella(3);
    act(() => tres.focus());
    fireEvent.click(tres); // lo que hace un lector: foco y clic, sin pointerdown ni keydown
    expect(await screen.findByRole("button", { name: "Seguir" })).toBeTruthy(); // no avanzó sola
    moverLaPagina(0);
    moverLaPagina(800);
    expect(document.querySelector("[data-achicada]")).toBeNull();

    const afuera = boton("Reportar error / sugerencia");
    act(() => afuera.focus());
    moverLaPagina(1000);
    expect(document.querySelector("[data-achicada]")).toBeTruthy();
    expect(document.activeElement).toBe(afuera);
  });

  it("con un error también se achica: la línea dice 'No se guardó' y un toque la abre con 'Reintentar'", async () => {
    const enviar = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(noHayRed()).mockResolvedValue(undefined);
    armar({ enviar });
    tocar(estrella(2));
    await screen.findByRole("group", { name: "Uy. ¿Qué falló?" });
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    tocar(boton("Otra cosa")); // sale enseguida, y falla
    expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
    // El error no se va solo: si la pregunta no se achicara, quedaría tapando el recibo.
    moverLaPagina(0);
    moverLaPagina(400);
    expect(document.querySelector("[data-achicada]")).toBeTruthy();
    const linea = screen.getByRole("button", { name: /^Uy\. ¿Qué falló\?.*No se guardó$/ });
    expect(linea.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("alert").textContent).toContain("No hay conexión"); // el lector se entera igual
    tocar(linea);
    expect(await screen.findByRole("group", { name: "Uy. ¿Qué falló?" })).toBeTruthy();
    expect(boton("Reintentar")).toBeTruthy();
  });
});

describe("el agradecimiento", () => {
  it("flota un rato y se apoya al pie; con el mouse encima espera", async () => {
    armar({ tiempos: { ...RAPIDO, agradecimiento: 150 } });
    await hastaElPerfil(5);
    tocar(boton("Seguir"));
    tocar(await screen.findByRole("button", { name: "Enviar" }));
    await screen.findByText("¡Gracias por ayudar a mejorar!");
    expect(riel().dataset.calificacion).toBe("flotando");
    // El mouse se apoya en la tarjeta. jsdom no sabe de :hover: se lo decimos.
    const encima = conElMouseEncima(region());
    await new Promise((r) => setTimeout(r, 400));
    expect(riel().dataset.calificacion).toBe("flotando");
    encima.sacar();
    await waitFor(() => expect(riel().dataset.calificacion).toBe("posada"), { timeout: 2500 });
    expect(screen.getByText("¡Gracias por ayudar a mejorar!")).toBeTruthy();
  });

  it("con un toque no espera (en el celular el :hover queda pegado después de tocar)", async () => {
    armar({ tiempos: { ...RAPIDO, agradecimiento: 100 } });
    await hastaElPerfil(5);
    tocar(boton("Seguir"));
    tocar(await screen.findByRole("button", { name: "Enviar" }));
    await screen.findByText("¡Gracias por ayudar a mejorar!");
    const tarjeta = region();
    const matches = tarjeta.matches.bind(tarjeta);
    tarjeta.matches = (sel) => (sel === ":hover" ? true : matches(sel));
    await waitFor(() => expect(riel().dataset.calificacion).toBe("posada"));
  });
});

describe("el teclado del celular", () => {
  it("mientras se escribe, la tarjeta se apoya arriba del teclado (y no con zoom de dedos)", async () => {
    const vv = Object.assign(new EventTarget(), { height: 400, offsetTop: 0, scale: 1 });
    vi.stubGlobal("visualViewport", vv);
    vi.stubGlobal("innerHeight", 700);
    armar();
    await hastaElPerfil(5);
    tocar(boton("Seguir"));
    const caja = await screen.findByLabelText("¿Algo que le agregarías?");
    act(() => caja.focus());
    await waitFor(() => expect(riel().style.getPropertyValue("--teclado")).toBe("300px"));
    expect(region().style.maxHeight).toBe("min(384px, 26rem)");

    vv.height = 700;
    act(() => vv.dispatchEvent(new Event("resize")));
    await waitFor(() => expect(riel().style.getPropertyValue("--teclado")).toBe("0px"));

    Object.assign(vv, { height: 400, scale: 2 });
    act(() => vv.dispatchEvent(new Event("resize")));
    await new Promise((r) => setTimeout(r, 40));
    expect(riel().style.getPropertyValue("--teclado")).toBe("0px");

    Object.assign(vv, { scale: 1 });
    act(() => vv.dispatchEvent(new Event("resize")));
    await waitFor(() => expect(riel().style.getPropertyValue("--teclado")).toBe("300px"));
    act(() => caja.blur());
    await waitFor(() => expect(riel().style.getPropertyValue("--teclado")).toBe("0px"));
  });
});

describe("lo que se guarda", () => {
  it("'Enviar' funciona aunque se esté guardando una elección anterior (antes el clic se perdía)", async () => {
    let soltar;
    const enviar = vi.fn(async () => {});
    armar({ enviar, espera: 0 });
    await hastaElPerfil(4);
    // El guardado del perfil queda colgado un rato, como en una red lenta.
    enviar.mockImplementationOnce(() => new Promise((r) => { soltar = r; }));
    tocar(boton("Contador o RR. HH."));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    tocar(await screen.findByRole("button", { name: "Enviar" }));
    soltar();
    expect(await screen.findByText("¡Gracias por ayudar a mejorar!")).toBeTruthy();
    expect(campos(enviar.mock.calls.at(-1)).perfil).toEqual({ stringValue: "contador_rrhh" });
  });

  it("después del alta, los toques seguidos se juntan en una sola corrección", async () => {
    const { enviar } = armar({ espera: 60 });
    tocar(estrella(2));
    await screen.findByRole("group", { name: "Uy. ¿Qué falló?" });
    expect(enviar).toHaveBeenCalledTimes(1);
    tocar(boton("Es difícil de usar"));
    tocar(boton("Otra cosa"));
    tocar(boton("Es difícil de usar"));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    expect(campos(enviar.mock.calls[1]).motivos).toEqual({ arrayValue: { values: [{ stringValue: "otro" }] } });
    await new Promise((r) => setTimeout(r, 120));
    expect(enviar).toHaveBeenCalledTimes(2);
  });

  it("lo que estaba esperando para juntarse se manda igual si la tarjeta desaparece", async () => {
    const { enviar, unmount } = armar({ espera: 10_000 });
    await hastaElPerfil(5);
    tocar(boton("Contador o RR. HH."));
    expect(enviar).toHaveBeenCalledTimes(1); // todavía esperando
    unmount();
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    expect(campos(enviar.mock.calls[1]).perfil).toEqual({ stringValue: "contador_rrhh" });
  });

  it("y si la pestaña pasa a segundo plano (en el celular 'pagehide' no siempre llega)", async () => {
    const { enviar } = armar({ espera: 10_000 });
    await hastaElPerfil(5);
    tocar(boton("Soy empleador"));
    expect(enviar).toHaveBeenCalledTimes(1);
    const visibilidad = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    visibilidad.mockRestore();
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    expect(campos(enviar.mock.calls[1]).perfil).toEqual({ stringValue: "empleador" });
  });

  it("si se cortó la red, reintentar usa el MISMO id: no duplica la calificación", async () => {
    const enviar = vi.fn().mockRejectedValueOnce(noHayRed()).mockResolvedValue(undefined);
    armar({ enviar });
    tocar(estrella(3));
    expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
    tocar(boton("Reintentar"));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(escritura(enviar.mock.calls[1]).update.name).toBe(escritura(enviar.mock.calls[0]).update.name);
    expect(escritura(enviar.mock.calls[1]).currentDocument).toEqual({ exists: false });
  });

  it("si el alta falló y eligió algo antes del reintento, eso sale después del alta (antes se perdía)", async () => {
    const enviar = vi.fn().mockRejectedValueOnce(noHayRed()).mockResolvedValue(undefined);
    armar({ enviar, espera: 0 });
    await hastaElPerfil(5);
    expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
    // La tarjeta siguió de pregunta: el perfil dispara el reintento del alta.
    tocar(boton("Soy empleador"));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(3));
    const [, alta, correccion] = enviar.mock.calls.map(escritura);
    expect(alta.currentDocument).toEqual({ exists: false });
    expect(alta.update.fields.perfil).toBeUndefined(); // el alta lleva sólo las estrellas
    expect(correccion.currentDocument).toEqual({ exists: true });
    expect(correccion.update.name).toBe(alta.update.name);
    expect(correccion.update.fields.perfil).toEqual({ stringValue: "empleador" });
  });

  it("si el alta había llegado y se perdió la respuesta, el reintento la encuentra y sigue desde ahí", async () => {
    const yaExiste = Object.assign(new Error("No pudimos guardar tu calificación."), { status: 409 });
    const enviar = vi.fn()
      .mockRejectedValueOnce(noHayRed()) // el alta llegó, la respuesta no
      .mockRejectedValueOnce(yaExiste) // reintento del alta: ya existe
      .mockResolvedValue(undefined); // la corrección con el mismo id funciona
    armar({ enviar });
    conTeclado(estrella(2));
    await screen.findByRole("alert");
    conTeclado(boton("Reintentar"));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    const [, segunda, tercera] = enviar.mock.calls.map(escritura);
    expect(segunda.currentDocument).toEqual({ exists: false });
    expect(tercera.currentDocument).toEqual({ exists: true });
    expect(tercera.update.name).toBe(segunda.update.name);
  });

  it("pasado el día que dan las reglas, no manda nada, lo dice claro y termina en el agradecimiento", async () => {
    let hora = AHORA;
    const enviar = vi.fn(async () => {});
    armar({ enviar, ahora: () => hora });
    tocar(estrella(3));
    await screen.findByRole("group", { name: "¿Qué no te convenció?" });
    hora = new Date(AHORA.getTime() + 25 * 60 * 60 * 1000);
    tocar(boton("Otra cosa"));
    expect((await screen.findByRole("alert")).textContent).toContain("ya no se puede cambiar");
    // No hay nada que reintentar y la estrella quedó guardada: antes quedaba la pregunta abierta, sin salida.
    expect(screen.getByText("¡Gracias por ayudar a mejorar!")).toBeTruthy();
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("al irse con el alta esperando respuesta (red lenta), la corrección sale aparte, sin esperar en la cola", async () => {
    let soltar;
    const enviar = vi.fn().mockImplementationOnce(() => new Promise((r) => { soltar = r; })).mockResolvedValue(undefined);
    armar({ enviar, espera: 10_000 });
    await hastaElPerfil(5); // la tarjeta sigue aunque el alta no respondió
    tocar(boton("Soy empleador"));
    expect(enviar).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("pagehide"));
    // Encolada, saldría recién cuando responda el alta: con la página cerrada, nunca.
    expect(enviar).toHaveBeenCalledTimes(2);
    const correccion = escritura(enviar.mock.calls[1]);
    expect(correccion.currentDocument).toEqual({ exists: true });
    expect(correccion.update.name).toBe(escritura(enviar.mock.calls[0]).update.name);
    expect(correccion.update.fields.perfil).toEqual({ stringValue: "empleador" });
    // Si la página sigue viva, la de la cola sale igual cuando responde el alta (repetirla no hace daño).
    await act(async () => soltar());
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(3));
    expect(campos(enviar.mock.calls[2]).perfil).toEqual({ stringValue: "empleador" });
  });

  it("al irse, lo que falló sin red y nadie reintentó se vuelve a mandar", async () => {
    const enviar = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(noHayRed()).mockResolvedValue(undefined);
    armar({ enviar });
    await hastaElPerfil(5);
    tocar(boton("Soy empleador")); // sale enseguida y falla; la tarjeta sigue al comentario, sin "Reintentar"
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    await screen.findByRole("alert");
    const visibilidad = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    visibilidad.mockRestore();
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(3));
    expect(campos(enviar.mock.calls[2]).perfil).toEqual({ stringValue: "empleador" });
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("al irse justo después de la estrella no manda una corrección de más (en el panel contaría como que siguió)", async () => {
    let soltar;
    const enviar = vi.fn().mockImplementationOnce(() => new Promise((r) => { soltar = r; })).mockResolvedValue(undefined);
    const { unmount } = armar({ enviar });
    tocar(estrella(5));
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new Event("pagehide"));
    await act(async () => soltar());
    unmount();
    await new Promise((r) => setTimeout(r, 30));
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it("si 'Borrar mi comentario' falla, el aviso habla del comentario (no de la calificación) y el mismo link reintenta", async () => {
    const enviar = vi.fn(async () => {});
    armar({ enviar });
    await hastaElPerfil(5);
    tocar(boton("Seguir"));
    fireEvent.change(await screen.findByLabelText("¿Algo que le agregarías?"), { target: { value: "Hola" } });
    tocar(boton("Enviar"));
    await screen.findByText("¡Gracias por ayudar a mejorar!");
    enviar.mockRejectedValueOnce(noHayRed());
    tocar(boton("Borrar mi comentario"));
    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos borrar tu comentario.");
    // Sin "Reintentar": borraba sin avisar "Borramos tu comentario.".
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
    tocar(boton("Borrar mi comentario"));
    await waitFor(() => expect(screen.getAllByText("Borramos tu comentario.").length).toBeGreaterThan(0));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("si el borrado falló y la pestaña pasa a segundo plano, se reintenta, y al volver dice 'Borramos tu comentario.'", async () => {
    const enviar = vi.fn(async () => {});
    armar({ enviar });
    await hastaElPerfil(5);
    tocar(boton("Seguir"));
    fireEvent.change(await screen.findByLabelText("¿Algo que le agregarías?"), { target: { value: "Hola" } });
    tocar(boton("Enviar"));
    await screen.findByText("¡Gracias por ayudar a mejorar!");
    enviar.mockRejectedValueOnce(noHayRed());
    tocar(boton("Borrar mi comentario"));
    await screen.findByRole("alert");
    const visibilidad = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    visibilidad.mockRestore();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Borramos tu comentario."));
    expect(escritura(enviar.mock.calls.at(-1)).update.fields.comentario).toBeUndefined();
  });

  it("en un recorrido entero, todo lo que se escribe está entre lo que aceptan las reglas", async () => {
    const reglas = REGLAS;
    const permitidas = reglas.match(/d\.keys\(\)\.hasOnly\(\[([^\]]+)\]\)/)[1].split(",").map((s) => s.trim().replace(/'/g, ""));
    const { enviar } = armar();
    tocar(estrella(2));
    tocar(await screen.findByRole("button", { name: "Los datos no están al día" }));
    tocar(boton("Seguir"));
    tocar(await screen.findByRole("button", { name: "Trabajo en relación de dependencia" }));
    fireEvent.change(await screen.findByLabelText("¿Qué dato está viejo?"), { target: { value: "Falta el acuerdo de noviembre" } });
    tocar(boton("Enviar"));
    tocar(await screen.findByRole("button", { name: "Borrar mi comentario" }));
    await waitFor(() => expect(screen.getAllByText("Borramos tu comentario.").length).toBeGreaterThan(0));
    for (const [cuerpo] of enviar.mock.calls) {
      const w = cuerpo.writes[0];
      for (const k of Object.keys(w.update.fields)) expect(permitidas).toContain(k);
      if (w.updateMask) for (const k of w.updateMask.fieldPaths) expect(CAMPOS_QUE_CAMBIAN).toContain(k);
    }
  });
});

// Lo de app/globals.css se prueba en test/calificaciones.test.js, que corre en
// Node: acá, con jsdom, Vitest no deja leer un .css como texto.

describe("lo que tapa", () => {
  it("mientras flota, deja en el recibo su alto más la distancia al pie; al apoyarse, lo saca", async () => {
    const observados = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(el) {
          observados.push(el);
        }
        disconnect() {}
      }
    );
    const alto = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(180);
    try {
      armar({ tiempos: { ...RAPIDO, agradecimiento: 50 } });
      const recibo = document.querySelector("[data-recibo]");
      // jsdom no calcula el `bottom` del riel: queda el alto y el aire.
      await waitFor(() => expect(recibo.style.getPropertyValue("--reserva-calificacion")).toBe("188px"));
      expect(observados).toContain(region());
      await hastaElPerfil(5);
      tocar(boton("Seguir"));
      tocar(await screen.findByRole("button", { name: "Enviar" }));
      await waitFor(() => expect(riel().dataset.calificacion).toBe("posada"), { timeout: 2500 });
      expect(recibo.style.getPropertyValue("--reserva-calificacion")).toBe("");
    } finally {
      alto.mockRestore();
    }
  });
});

// lib/herramientas.js
// Las herramientas del sitio, en un solo lugar.
//
// POR QUÉ EXISTE: la tarjeta del Panel Empleador estaba escrita a mano en la
// home, los links de navegación estaban escritos DOS veces en el Header (una
// para escritorio y otra para móvil), y el roadmap era una lista literal en
// SideRailLeft. Agregar una calculadora nueva significaba editar cinco
// archivos de código y desplegar — o sea que, para el dueño, "sumar una
// herramienta" era indistinguible de "conseguir un programador".
//
// Acá NO conviene ir a Firestore: cada herramienta futura es igualmente una
// página de código, así que un archivo alcanza y es más simple de mantener.
// Los CONVENIOS sí van en la base, porque se agregan sin tocar código.

// EL PANEL EMPLEADOR YA NO ESTÁ ACÁ, y no es un olvido: se retiró el 13/9/2026.
// Desde el Decreto 407/2026 el costo laboral total tiene que figurar en el
// recibo (art. 140 inc. j) LCT), así que lo que calculaba pasó a ser una
// sección del recibo de cada convenio. /empleador redirige a la portada. Hay
// un test que frena el intento de volver a agregarlo sin hablarlo.
export const HERRAMIENTAS = [
  {
    id: "aguinaldo",
    nombre: "Calculadora de aguinaldo",
    descripcion: "El medio aguinaldo sobre la mejor remuneración del semestre.",
    href: "/aguinaldo",
    etiqueta: "Empleados",
    accion: "Calcular",
    color: "sky",
    disponible: false,
    enNavegacion: false,
  },
  {
    id: "indemnizacion",
    nombre: "Calculadora de indemnización",
    descripcion: "Antigüedad, preaviso e integración del mes de despido.",
    href: "/indemnizacion",
    etiqueta: "Empleados",
    accion: "Calcular",
    color: "sky",
    disponible: false,
    enNavegacion: false,
  },
  {
    id: "recibo-pdf",
    nombre: "Descarga del recibo en PDF",
    descripcion: "Bajar la liquidación en un archivo listo para imprimir.",
    href: null,
    etiqueta: "Empleados",
    accion: null,
    color: "sky",
    disponible: false,
    enNavegacion: false,
  },
];

/** Las que ya funcionan y se muestran como tarjeta en la home. */
export const herramientasDisponibles = () => HERRAMIENTAS.filter((h) => h.disponible);

/** Las que todavía no, para la lista de "Próximas actualizaciones". */
export const herramientasEnCamino = () => HERRAMIENTAS.filter((h) => !h.disponible);

/** Links fijos de la barra de navegación, para no escribirlos dos veces. */
export const LINKS_NAVEGACION = [
  { href: "/", texto: "Calculadora" },
  { href: "/novedades", texto: "Novedades" },
  ...HERRAMIENTAS.filter((h) => h.disponible && h.enNavegacion).map((h) => ({
    href: h.href,
    texto: h.nombre,
  })),
];

// ---------------------------------------------------------------------------
// Sectores de convenio
//
// Antes el sector y el color de cada tarjeta se DEDUCÍAN buscando palabras
// dentro del id del convenio:
//
//   const isGastro = id.includes("fehgra") || id.includes("utghra");
//
// Eso fallaba en silencio: el id real del convenio gastronómico es
// "gastronomicos-cct-389-04", que no contiene ni "fehgra" ni "utghra" (que
// además está mal escrito: el sindicato es UTHGRA), así que su tarjeta ya
// caía al estilo genérico. Y cualquier convenio cuyo id no coincidiera con
// las palabras buscadas quedaba etiquetado mal, o sea información equivocada
// para el visitante.
//
// Ahora el sector es un campo del documento, elegible desde el panel.
// ---------------------------------------------------------------------------

// FUERA DE ALCANCE: el sector público. Es una decisión tomada, no una función
// pendiente. Cada municipio y cada provincia tiene su propio régimen, con caja
// jubilatoria y obra social propias que no son las nacionales que aplica el
// motor. Equivocarse ahí es mucho más fácil y mucho más caro que no ofrecerlo.
// No agregar la opción sin hablarlo antes; hay un test que frena el descuido.
export const SECTORES = [
  { value: "privado", label: "Sector privado", color: "sky" },
  { value: "gastronomico", label: "Gastronomía y hotelería", color: "amber" },
  { value: "rural", label: "Rural y agro", color: "lime" },
  { value: "construccion", label: "Construcción", color: "orange" },
  { value: "domestico", label: "Casas particulares", color: "violet" },
];

const PALETA = {
  sky: { border: "border-sky-200 hover:border-sky-400", texto: "text-sky-700" },
  emerald: { border: "border-emerald-200 hover:border-emerald-400", texto: "text-emerald-700" },
  amber: { border: "border-amber-200 hover:border-amber-400", texto: "text-amber-700" },
  lime: { border: "border-lime-200 hover:border-lime-400", texto: "text-lime-700" },
  orange: { border: "border-orange-200 hover:border-orange-400", texto: "text-orange-700" },
  violet: { border: "border-violet-200 hover:border-violet-400", texto: "text-violet-700" },
  slate: { border: "border-slate-200 hover:border-slate-400", texto: "text-slate-700" },
};

/**
 * Estilo de la tarjeta de un convenio, a partir de su campo `sector`.
 * Un convenio sin sector cargado cae en "privado", que es el caso más común,
 * en vez de adivinarlo leyendo el id.
 */
export function estiloDeSector(sector) {
  const encontrado = SECTORES.find((s) => s.value === sector) || SECTORES[0];
  const paleta = PALETA[encontrado.color] || PALETA.slate;
  return { sector: encontrado.label, color: encontrado.color, ...paleta };
}

export function estiloDeHerramienta(color) {
  return PALETA[color] || PALETA.slate;
}

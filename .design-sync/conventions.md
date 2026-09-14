# LiquidAR — cómo se construye con estas piezas

LiquidAR (liquidar.ar) simula recibos de sueldo por convenio colectivo argentino. Las piezas de `liquidar-ui` son las mismas que usa la app; toda pantalla nueva se arma con ellas y con utilidades de Tailwind, en castellano rioplatense (voseo: "Elegí", "Calculá").

## Sin proveedor, con la hoja de estilos

No hay ThemeProvider ni contexto: los componentes funcionan solos. Lo único imprescindible es que `styles.css` esté cargada (trae Tailwind, la fuente Inter y los tokens). Sin ella, las piezas se ven sin estilo.

## El idioma de estilos: utilidades de Tailwind y la paleta de siempre

El layout propio (grillas, márgenes, contenedores) se escribe con clases de Tailwind v4. Los colores son la paleta estándar de Tailwind, con un significado fijo:

| Significado | Clases que se usan |
|---|---|
| Acción principal, neto, acentos de marca | `bg-emerald-600` `hover:bg-emerald-700` `text-emerald-700` `bg-emerald-50` `border-emerald-200` |
| Todo lo que paga el empleador | `text-indigo-700` `bg-indigo-50` `border-indigo-100` `bg-indigo-500` |
| No remunerativo | `text-sky-800` `text-sky-600` `bg-sky-50` |
| Descuentos, retenciones y errores | `text-rose-600` `text-rose-700` `bg-rose-50` `border-rose-300` |
| Avisos y "cambiaste datos" | `text-amber-900` `bg-amber-50` `border-amber-300` `bg-amber-600` |
| Texto y superficies | `text-slate-900` `text-slate-700` `text-slate-500` `bg-slate-50` `bg-slate-100` `border-slate-200` `bg-white` |
| Formas | `rounded-xl` (controles y cajas) `rounded-2xl` (tarjetas) `shadow-sm` |

Nunca `text-slate-400` para texto: no llega al contraste mínimo. Los importes van siempre con `tabular-nums` y `whitespace-nowrap`; los textos largos con `[overflow-wrap:anywhere]`, nunca `truncate` ni `line-clamp`.

Tipografía: `Inter` (viene por `styles.css`). Jerarquía: `text-2xl font-bold` títulos de página, `text-xs font-bold uppercase tracking-wide` rótulos de sección, `text-sm` cuerpo, `text-[11px] text-slate-500` ayudas y explicaciones.

Los mismos colores tienen nombre en `tokens.css` (`--liquidar-verde`, `--liquidar-empleador`, `--liquidar-no-remunerativo`, `--liquidar-descuento`, `--liquidar-atencion`, `--liquidar-texto`, `--liquidar-borde`, `--liquidar-radio`) para CSS a mano; en JSX se prefieren las clases de arriba.

## Dónde está la verdad

- `styles.css` y `tokens.css` (los que vienen con el paquete): la hoja compilada y los nombres.
- Cada componente trae su `.d.ts` (la API) y su `.prompt.md` (cómo se usa, con ejemplos). Leelos antes de componer: los props están en castellano (`tono`, `variante`, `ancho`, `abierto`).

## Las piezas, y para qué es cada una

`TarjetaConvenio` (portada), `BandaResumen` (arriba del recibo: neto, bruto, costo), `EncabezadoRecibo` (cabecera oscura con "Estimado" y la franja de desactualizado), `SeccionRecibo` + `LineaRecibo` (haberes, no remunerativos y descuentos, cada línea con su explicación), `TablaEmpleador` (contribuciones, antes del bruto), `ComposicionCargas` (los rubros del Decreto 407/2026), `Campo` y `CampoNumero` (formulario, con error debajo), `Casilla`, `Plegable` (secciones con valores por defecto), `Boton`, `Chip`, `Aviso`, `Modal`. También `money`, `pct` y `num` para formatear en es-AR.

Regla de oro del recibo: primero el resumen, después lo que paga el empleador, después haberes y descuentos, después el neto; cada número dice de dónde sale.

## Un ejemplo idiomático

```jsx
import { EncabezadoRecibo, BandaResumen, SeccionRecibo, LineaRecibo, Boton } from "liquidar-ui";

<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
  <EncabezadoRecibo subtitulo="Camioneros · Agosto 2026" />
  <div className="p-5 space-y-5">
    <BandaResumen neto={1442051.5} brutoMasNoRemunerativo={1673641.22} costoLaboral={2050459.88} />
    <SeccionRecibo titulo="Haberes remunerativos">
      <LineaRecibo concepto="Sueldo Básico" importe={1075910.44} explicacion="Escala del convenio: $1.075.910,44" />
      <LineaRecibo concepto="Antigüedad" importe={53795.52} explicacion="1% × 5 años = 5% sobre $1.075.910,44 (el básico)" />
    </SeccionRecibo>
    <Boton variante="enlace">Copiar link de esta simulación</Boton>
  </div>
</div>
```

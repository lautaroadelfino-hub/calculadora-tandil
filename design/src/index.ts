// design/src/index.ts
// Las piezas de interfaz de LiquidAR. Cada una es la versión presentacional de
// lo que hoy vive en app/ y components/: mismas clases, mismos colores, sin
// Firestore ni estado de la página.
export { Boton } from "./Boton";
export type { BotonProps } from "./Boton";
export { Chip } from "./Chip";
export type { ChipProps } from "./Chip";
export { Aviso } from "./Aviso";
export type { AvisoProps } from "./Aviso";
export { Campo } from "./Campo";
export type { CampoProps } from "./Campo";
export { CampoNumero } from "./CampoNumero";
export type { CampoNumeroProps } from "./CampoNumero";
export { Casilla } from "./Casilla";
export type { CasillaProps } from "./Casilla";
export { Plegable } from "./Plegable";
export type { PlegableProps } from "./Plegable";
export { TarjetaConvenio } from "./TarjetaConvenio";
export type { TarjetaConvenioProps } from "./TarjetaConvenio";
export { BandaResumen } from "./BandaResumen";
export type { BandaResumenProps } from "./BandaResumen";
export { EncabezadoRecibo } from "./EncabezadoRecibo";
export type { EncabezadoReciboProps } from "./EncabezadoRecibo";
export { SeccionRecibo } from "./SeccionRecibo";
export type { SeccionReciboProps } from "./SeccionRecibo";
export { LineaRecibo } from "./LineaRecibo";
export type { LineaReciboProps } from "./LineaRecibo";
export { TablaEmpleador } from "./TablaEmpleador";
export type { TablaEmpleadorProps, FilaEmpleador } from "./TablaEmpleador";
export { ComposicionCargas } from "./ComposicionCargas";
export type { ComposicionCargasProps, RubroCargas } from "./ComposicionCargas";
export { Modal } from "./Modal";
export type { ModalProps } from "./Modal";
export { money, pct, num } from "./formato";

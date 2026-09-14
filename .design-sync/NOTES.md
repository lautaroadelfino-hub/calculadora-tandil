# Notas de sincronización con Claude Design (liquidar-ui)

- El repo es la app de Next.js, no una biblioteca: las piezas viven en `design/` (paquete `liquidar-ui`, TSX + Tailwind) y se extrajeron de `app/` y `components/` el 13/9/2026. Si cambia una pieza en la app, hay que reflejarlo en `design/src/` (y viceversa): todavía no se comparte código entre ambos.
- Build: `npm run build --prefix design` (esbuild para JS, `tsc` para los `.d.ts`, CLI de Tailwind v4 para `dist/styles.css`). Las herramientas están como devDependencies del repo raíz; `--node-modules ./node_modules` (raíz) porque `react` vive ahí. Entrada: `--entry ./design/dist/index.js`.
- Fuente Inter: llega por `@import url(fonts.googleapis.com)` en `src/styles.css` (`[FONT_REMOTE]`), más `runtimeFontPrefixes: ["Inter"]`. No se envían archivos de fuente.
- Playwright: la caché de esta máquina tiene chromium 1228 y 1234; `playwright@1.62.0` (chromium 1234) instalado en `.ds-sync/`. npm 11 no corre scripts de instalación por defecto (avisos `install-scripts`): esbuild y playwright funcionan igual porque sus binarios vienen como dependencias opcionales.
- Las vistas previas no pueden mostrar el comportamiento responsive por historia (el viewport es el de la tarjeta entera): las historias "en celular" de BandaResumen y TablaEmpleador se quitaron. Para ver el apilado móvil hay que abrir la app a 400 px.
- Todas las tarjetas van en `cardMode: column` (son anchas: recibo, tablas); `Modal` en `single` con viewport 760x560 porque es `fixed`.
- Los heredocs de Bash de más de ~10 KB fallan en esta máquina: los archivos largos se escriben con la herramienta Write.

- El servidor de revisión (`node .ds-sync/storybook/http-serve.mjs ./ds-bundle`) hay que lanzarlo desde la raíz del repo: desde `ds-bundle/` no encuentra el módulo. Imprime el puerto; la página es `http://127.0.0.1:<puerto>/.review.html`.
- La primera sincronización se completó el 13/9/2026 por la vía incremental (proyecto nuevo y vacío): 83 archivos, 15 piezas con vista previa calificada `good`, `_ds_sync.json` subido al final como ancla. A partir de acá toda re-sincronización va por la vía atómica (proyecto pinneado en `config.json`).
- Vía única de re-sync: `cp -r` de los scripts staged, `npm run build --prefix design` si cambió `design/src`, bajar `_ds_sync.json` del proyecto a `.design-sync/.cache/remote-sync.json` y correr el driver `resync.mjs --remote` desde la raíz; subir sólo si `upload.any` es true.

## Known render warns

- Ninguno pendiente: la validación final salió sin warns.

## Re-sync risks

- `design/src/*` duplica clases de la app: si la app cambia el diseño (por ejemplo tras iterar en Claude Design), hay que traer los cambios a `design/` a mano y rearmar.
- El build asume Node 24 y Tailwind v4 (`@tailwindcss/cli`); un cambio de versión mayor de Tailwind puede cambiar los nombres de las variables de color en `dist/styles.css`.
- Las historias usan importes reales de agosto/septiembre 2026: no se rompen con el tiempo, pero quedan viejas como ejemplo.
- Nada de la app depende de `design/`: el paquete existe sólo para Claude Design. Si alguna vez la app lo consume, `design/dist` deja de ser ignorable.

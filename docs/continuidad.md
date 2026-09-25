# Continuidad: qué hace falta para que liquidar.ar siga andando

Una carilla para el día que haya que recuperar algo, cambiar de máquina o
delegar. Escrita el 24/9/2026 a partir de la auditoría integral del 23/9.

## Las cuentas

| Qué | Cuenta | Para qué |
|---|---|---|
| Consola de Firebase (proyecto `liquidar-f01ab`) y Google Cloud | `info@liquidar.ar` | Reglas de Firestore, usuarios de Authentication, datos a mano |
| Usuario de Firebase Authentication con el que se entra a `/admin` | `admin@csueldos.com` | Es la única identidad que puede escribir en la base (`firestore.rules`). Es sólo un usuario de la app, pero **`csueldos.com` no es del proyecto**: si alguien registrara ese dominio podría pedir un cambio de contraseña de la cuenta y recibir el mail. Conviene moverla a un mail de `liquidar.ar` (consola → Authentication → Users → editar) y cambiarla en `firestore.rules`, en la consola y en `ADMIN_EMAIL` de `.env.local`. Mientras tanto, la contraseña se cambia desde la consola con `info@liquidar.ar` |
| GitHub (`lautaroadelfino-hub/calculadora-tandil`) | la cuenta del dueño | El código. Todo lo que llega a `main` se despliega solo |
| Cloudflare Pages | la cuenta del dueño | Construye y publica el sitio en cada push; variables de entorno del build |
| Dominio `liquidar.ar` | la cuenta del dueño en el registrador | DNS apuntando a Cloudflare |

## Qué se rompe si...

- **Se borra o se pisa una escala desde `/admin`:** se restaura desde el
  último respaldo (abajo). Sin respaldo, hay que volver a cargar el CSV del
  acuerdo y los valores del período a mano.
- **Se pushea código roto a `main`:** `npm run build` corre los tests antes de
  construir, así que Cloudflare no publica y queda la versión anterior en
  línea. La acción de GitHub deja la marca roja al lado del commit (y un mail,
  si en la cuenta de GitHub están prendidas las notificaciones de Actions). Se
  arregla y se vuelve a pushear.
- **Hay que publicar ya y un test falla por un dato, no por el código:** en el
  panel de Cloudflare Pages (Settings → Builds → Build command) poner
  `npm run build:sin-tests`, publicar, y volver a `npm run build` después.
- **Hay que subir a Next 17:** no todavía. El sitio usa el runtime `edge` en
  las páginas del servidor (que Next 16.3 ya marca como obsoleto) porque es lo
  que pide el adaptador de Cloudflare. Antes de cambiar de versión mayor hay
  que saber qué adaptador usa el build de Cloudflare y qué runtime pide.
  Hasta entonces, `next` se queda en `^16`.
- **Firestore no responde:** el sitio muestra "No pudimos traer los datos" y
  sigue en pie; vuelve solo cuando Firestore vuelve.
- **Se pierde la contraseña de `admin@csueldos.com`:** se cambia desde la
  consola de Firebase (Authentication → Users) con `info@liquidar.ar`.
- **Se pierde el acceso a `info@liquidar.ar`:** es el único acceso a la
  consola. Conviene tener un segundo dueño del proyecto de Firebase (IAM) en
  otra cuenta de Google.
- **Cambia la máquina:** clonar el repo, `npm install`, crear `.env.local` con
  las tres claves del README, y listo. Los respaldos viven en la carpeta
  `respaldos/` de la máquina (no viajan en el repo): copiarlos aparte.

## Respaldo y restauración

**Respaldar** (no pide contraseña, tarda segundos): doble clic en
`respaldar.bat`, o `node scripts/respaldar.mjs`. Deja una carpeta
`respaldos/AAAA-MM-DD-HHMM/` con todas las colecciones que usa el sitio
(convenios, escalas, Ganancias, contribuciones, novedades) y un `resumen.txt`.
Conviene hacerlo **antes de cargar un mes** y guardar las carpetas en otro
lado (un pendrive, Drive).

**Restaurar** un documento o una colección entera desde un respaldo:

```
node scripts/restaurar.mjs respaldos/2026-09-24-1030 convenios/comercio-cct-130-75/escalas/2026-09
node scripts/restaurar.mjs respaldos/2026-09-24-1030 parametros_contribuciones --aplicar
```

Sin `--aplicar` sólo muestra qué haría: qué documentos se crean, cuáles se
reemplazan y, si es una colección, cuáles existen hoy y no estaban en el
respaldo (esos "sobrantes" quedan como están, salvo que se agregue
`--borrar-sobrantes`). Restaurar una escala restaura también el documento del
convenio del mismo respaldo, porque el panel los escribe juntos. Con
`--aplicar` pide la contraseña del administrador (sin mostrarla; o la toma de
la variable `ADMIN_PASSWORD`, seteada sólo para esa corrida en la consola, no
en `.env.local`) y reemplaza cada documento entero, tal como estaba en el
respaldo. El sitio lo refleja en menos de un minuto.

**Lo que no respalda esto:** los usuarios de Authentication y las reglas de
Firestore. Las reglas están en `firestore.rules` (versionadas en el repo); el
usuario administrador se recrea desde la consola.

## Cada cuánto

- Respaldo: antes de cada carga de mes, y una vez por mes aunque no se cargue nada.
- Dependencias: `npm audit` de vez en cuando; el 24/9/2026 quedó en cero.
- Reglas de Firestore: cada vez que cambia el archivo, volver a pegarlo en la consola.

# Continuidad: qué hace falta para que liquidar.ar siga andando

Una carilla para el día que haya que recuperar algo, cambiar de máquina o
delegar. Escrita el 24/9/2026 a partir de la auditoría integral del 23/9.

## Las cuentas

| Qué | Cuenta | Para qué |
|---|---|---|
| Consola de Firebase (proyecto `liquidar-f01ab`) y Google Cloud | `info@liquidar.ar` | Reglas de Firestore, usuarios de Authentication, datos a mano |
| Usuario de Firebase Authentication con el que se entra a `/admin` | `admin@liquidar.ar` (alias de `info@liquidar.ar` en Google Workspace) | Es la única identidad que puede escribir en la base y en Storage: las reglas la identifican por su UID (`yx2H1OsUirUTvevmtTasVnSU5Zw1`), no por el mail, así que cambiar el mail o la contraseña no obliga a tocar las reglas. Hasta el 11/10/2026 era `admin@csueldos.com`, un dominio que nadie tenía registrado. La contraseña se cambia desde la consola con `info@liquidar.ar`, o con "Olvidé mi contraseña", que llega a `info@` |
| GitHub (`lautaroadelfino-hub/calculadora-tandil`) | la cuenta del dueño | El código. Todo lo que llega a `main` se despliega solo |
| Cloudflare Pages | la cuenta del dueño | Construye y publica el sitio en cada push; variables de entorno del build |
| Dominio `liquidar.ar` | la cuenta del dueño en el registrador | DNS apuntando a Cloudflare |
| Formspree (formulario `manaynzy`, el botón "Reportar error / sugerencia") | `info@liquidar.ar` | Cada envío llega por mail a `info@liquidar.ar`; el formulario se administra en formspree.io con esa cuenta |

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
- **Se pierde la contraseña de `admin@liquidar.ar`:** se cambia desde la
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
(convenios, escalas, Ganancias, contribuciones, novedades, acuerdos) y un
`resumen.txt`. Los archivos de los acuerdos (PDF y demás) viven en Firebase
Storage y **no entran en este respaldo**: se bajan desde la consola de Firebase
(Storage → carpeta `acuerdos`).
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

**Lo que no respalda esto:** los usuarios de Authentication, las reglas y los
archivos de Storage. Las reglas están en `firestore.rules` y `storage.rules`
(versionadas en el repo); el usuario administrador se recrea desde la consola;
los archivos de los acuerdos se bajan desde la consola (Storage → `acuerdos`).

## Cada cuánto

- Respaldo: antes de cada carga de mes, y una vez por mes aunque no se cargue nada. Desde que corre el vigía (abajo), además, uno por día en GitHub Actions.
- Dependencias: `npm audit` de vez en cuando; el 24/9/2026 quedó en cero.
- Reglas de Firestore y de Storage: cada vez que cambia el archivo, volver a pegarlo en la consola.

## El vigía (desde octubre de 2026)

`scripts/vigia.mjs` corre todos los días a las 09:00 en GitHub Actions
(`.github/workflows/vigia.yml`): hace un respaldo de Firestore (queda 14 días
como *artifact* de la corrida), lee las fuentes (Boletín Oficial, Camioneros,
FAECYS, UTHGRA, ARCA), deja lo nuevo como **borrador** en Firestore y avisa por
Telegram. **No publica nada.** Lo que prepara se revisa y se publica desde la
pestaña Bandeja de `/admin`. El plan completo está en
`.claude/plans/` (sesión del 21/10/2026) y la forma de cada pieza, en los
comentarios de `scripts/vigia/`.

| Qué | Dónde | Para qué |
|---|---|---|
| Usuario `vigia@liquidar.ar` en Firebase Authentication | Consola de Firebase, con `info@liquidar.ar` | Es la sesión del robot. Las reglas (`firestore.rules`, `storage.rules`) la identifican por su UID y sólo le dejan escribir en `borradores`, `vigia`, `vigia_corridas`, `vigia_tramos`, `vigia_acuerdos_leidos` y en Storage `borradores/` (y crear archivos en `acuerdos/`). Aunque el código se equivoque, no puede tocar una escala ni una tabla |
| Bot de Telegram | @BotFather, con la cuenta de Telegram del dueño | Los avisos. El token se regenera con `/revoke` en BotFather; el `chat.id` se lee en `https://api.telegram.org/bot<TOKEN>/getUpdates` después de mandarle `/start` al bot (dentro de las 24 horas) |
| Secretos de GitHub Actions | GitHub → Settings → Secrets and variables → Actions | Secrets: `VIGIA_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Variables: `NEXT_PUBLIC_FIREBASE_API_KEY`, `VIGIA_EMAIL`. Nunca van en el código ni en `.env.local` |

**Comprobar que las reglas están bien pegadas:** `node scripts/vigia.mjs --probar-permisos`
(con `VIGIA_EMAIL` y `VIGIA_PASSWORD` en la consola, sólo para esa corrida).
Tiene que decir "Todo como tiene que ser": el vigía NO puede crear un convenio,
una escala, una tabla ni un acuerdo, y SÍ puede escribir en lo suyo. Se corre
también desde GitHub (Actions → Vigía → Run workflow) después de cada cambio de
reglas.

**Qué se rompe si...**
- **Una fuente cambia su página:** el vigía avisa por Telegram ("cambió el
  formato de …") la primera vez y después cada 7 días, y la Bandeja la marca en
  rojo. Es un arreglo de código.
- **GitHub apaga el cron:** lo hace cuando el repo lleva 60 días sin commits.
  La señal es que deja de llegar el mensaje mensual "Vigía vivo" y la Bandeja
  dice que la última corrida fue hace muchos días. Se reactiva en la pestaña
  Actions del repo (el workflow aparece como deshabilitado, con un botón para
  habilitarlo).
- **Se pierde la contraseña del vigía:** se cambia desde la consola de
  Firebase (Authentication → Users) y se actualiza el secreto en GitHub.
- **Telegram no entrega:** la corrida termina en rojo y GitHub manda un mail (si
  están prendidas las notificaciones de Actions). Revisar el token y el chat.

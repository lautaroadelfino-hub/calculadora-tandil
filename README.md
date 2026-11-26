# LiquidAR

Calculadora de sueldos por convenio colectivo argentino. Cada recibo muestra
también el costo laboral total para el empleador, como exige el art. 140
inc. j) de la LCT desde junio de 2026, y se dibuja con el modelo del Anexo III
del Decreto 407/2026 (la copia está en `docs/decreto-407-2026-anexo-III.pdf`;
las casillas que la simulación no conoce, como empresa, CUIT, nombre o legajo,
quedan en blanco). En producción: **https://liquidar.ar**

Este README es el manual del dueño, no documentación para programadores. Si
algo de acá no se entiende, está mal escrito: avisá.

---

## Lo primero: cómo está armado, en tres frases

1. **El código no sabe nada de convenios.** Hay un solo motor de cálculo
   (`lib/motorLiquidacion.js`) que lee las reglas de cada convenio desde la base
   de datos. Agregar un convenio nuevo **no requiere tocar código**.
2. **Los datos viven en Firestore** (proyecto `liquidar-f01ab`) y los cargás vos
   desde `/admin`.
3. **Publicar es pushear.** Todo lo que llega a la rama `main` se despliega solo
   a liquidar.ar. Por eso conviene trabajar en otra rama y mirar la preview.
4. **La portada y las calculadoras se arman en el servidor.** Cloudflare lee
   Firestore por su API REST (`lib/firestoreRest.js`) y manda el HTML con las
   tarjetas o el formulario ya puestos; el navegador no descarga el SDK de
   Firebase (sólo lo usa `/admin`). Esas lecturas se guardan en el edge un
   minuto: **un cambio hecho en `/admin` puede tardar hasta un minuto en verse
   en el sitio.** No es un error.

---

## Las tareas que vas a hacer siempre

### 1. Cargar la escala de un mes (lo más frecuente)

1. Entrá a `/admin` → pestaña **Escalas paritarias**.
2. Elegí el convenio.
3. Escribí el período con el formato **`AAAA-MM`** (por ejemplo `2026-09`).
   El mes va con dos dígitos: si ponés `2026-9`, los meses se ordenan mal y la
   calculadora elige el período equivocado. El panel ahora te frena si te
   equivocás.
4. Tocá **Buscar**. Si ya había algo cargado, lo trae.
5. **Descargar CSV** → se baja un archivo con las categorías y los sueldos
   actuales. Si el convenio es nuevo y no tiene categorías, baja una plantilla
   con filas de ejemplo para que veas el formato.
6. Abrilo en Excel, poné los sueldos del acuerdo, guardá.
7. **Subir CSV** → revisá la grilla. Lo que aparece **en rojo no tiene sueldo
   básico**: eso casi siempre es un error de carga.
8. **Guardar y publicar**. Antes de publicar te avisa si alguna categoría va a
   desaparecer, porque publicar reemplaza el mes entero.

**El formato del CSV** es una de estas dos formas:

```
categoria,basico,no_remunerativo
Vendedor A,1273746,0
```

```
zona,categoria,basico,no_remunerativo
Escala A,Nivel 1,999420,38700
```

Si el acuerdo tiene además una suma no remunerativa **sin incidencia** (como la
"Asignación Extraordinaria por Única Vez" de Comercio: no genera antigüedad ni
presentismo, y no paga aportes ni contribuciones), se agrega una cuarta columna
`no_remunerativo_sin_incidencia` y se escribe su nombre en el campo que está
debajo del período. Si ninguna categoría la tiene, no hace falta la columna.

Los números se pueden escribir como quieras: `1.273.746,00`, `1273746`,
`$ 1.273.746`. Lo que **no** se puede es dejar el básico vacío o poner texto:
ahí te avisa con el número de fila en vez de guardar un cero.

**Varios meses de una, desde la terminal.** Si los CSV ya están en una
carpeta con un `carga.json` que dice a qué convenio y período va cada uno
(como `docs/acuerdos/comercio-2026-10-27/`; el formato está en
`lib/cargaDeMes.js`), `node scripts/cargarMes.mjs <carpeta>` muestra qué
publicaría con las mismas revisiones del panel, y con `--aplicar` al final lo
publica (pide la contraseña de admin, y entra todo o no entra nada). Si el
`carga.json` trae el FFEP y las bases del art. 9 del mes, carga también la
tabla de contribuciones (tarea 4) a partir de la última que haya.

### 2. Dar de alta un convenio nuevo

1. `/admin` → pestaña **Convenios** → **+ Nuevo convenio**.
2. Nombre, CCT, identificador (sólo minúsculas, números y guiones) y **sector**
   (define el color y la etiqueta de la tarjeta en la portada).
3. **Dejalo INACTIVO** mientras lo preparás. Va a aparecer en "Próximas
   actualizaciones" de la portada, que es exactamente lo que querés.
4. Cargá las reglas: antigüedad, presentismo, adicionales, retenciones
   sindicales. Ver abajo qué significa cada una.
5. Cargá las escalas de los meses que necesites (tarea 1).
6. Volvé a Convenios y marcalo **Activo**. Ahí pasa a ser una tarjeta de la
   portada y sale de la lista de próximas.

### 3. Actualizar el impuesto a las Ganancias

ARCA publica la escala por semestre. `/admin` → pestaña **Ganancias** → período
`AAAA-MM` → cargás los tramos y las deducciones.

Si liquidás un mes cuyo semestre no está cargado, **el recibo te lo avisa en
pantalla** y te dice qué tabla usó. No lo ignores: la escala cambia por
semestre.

### 4. Cargar la tabla de contribuciones patronales de un mes

Desde el 01/06/2026 el recibo muestra lo que paga el empleador por cada
trabajador (art. 140 inc. j) LCT, Decreto 407/2026), antes del bruto. Para eso
necesita la tabla del mes: alícuotas por régimen, detracción de la Ley 27.541,
sumas fijas (FFEP y seguro colectivo de vida), bases del art. 9 y los criterios
contables. Cada mes llega preparado: `/admin` → **Bandeja** (el vigía lee el
Boletín Oficial: las bases del art. 9 de la Resolución de ANSES y el FFEP de la
Disposición de la SRT) → **Abrir** → revisá → **Guardar y publicar**. Si no
llegó: pestaña **Contribuciones** → período `AAAA-MM` → **Copiar del mes
anterior** → cambiá las bases y el FFEP → **Guardar y publicar**.
**Pendiente al 28/10/2026:** el vigía todavía no está configurado y su
workflow está desactivado (qué falta, en `docs/continuidad.md`), así que por
ahora nada llega a la Bandeja y se usa el camino de "si no llegó".

Si un mes no tiene tabla, la calculadora usa la del mes anterior más cercano y
lo avisa; si no hay ninguna anterior, el recibo sale **sin la sección del
empleador** y lo dice en ámbar. Junio a septiembre de 2026 ya están cargados.

Los dos criterios contables de esa pestaña (topes del art. 9 en los aportes,
SAC en la base patronal) arrancan **encendidos** por tu decisión del 13/9/2026.
Se apagan desde ahí, sin tocar código.

La obra social (3% del trabajador y 6% del empleador) va siempre sobre la
jornada completa de la categoría (art. 92 ter inc. 4 LCT), por tu decisión del
5/10/2026. No es un interruptor; por eso la calculadora acepta desde 20 horas
semanales.

### 5. Mirar qué opina la gente (calificaciones)

En cada recibo, debajo de los tres números de arriba (neto, bruto y costo
laboral), aparece una línea discreta: **"¿Te sirvió este cálculo?"**, con 5
estrellas. No es un cartel ni aparece por tiempo: está ahí recién cuando hay
recibo, y el que no quiere calificar no toca nada (no hay "Ahora no"). Con un
toque en las estrellas la calificación queda guardada en el acto. Ahí se abre,
todo opcional, qué falló (si puso 3 o menos), para qué usó la calculadora y un
comentario; **Enviar** funciona sin escribir nada, pliega el panel y deja
"¡Gracias por ayudar a mejorar!" (desde ahí puede borrar su comentario). Si la
persona califica, no se le vuelve a preguntar por 4 meses. Hay una tarjeta por
recibo: si recalcula después de calificar, no vuelve a aparecer.

**Qué se guarda:** las estrellas y lo que conteste, más el contexto del recibo
que calificó, que se toma solo: convenio, mes y categoría, si estaba en el
celular o la computadora, si ese recibo lo armó un link de "Copiar link" o lo
calculó a mano (un F5 cuenta como a mano), si le faltaban datos (una tabla del
mes que no está, o que se tomó de otro mes) y cuántas cuentas lleva en esa
visita a la página. **Ningún importe del sueldo ni dato de la persona.** El
comentario le pide que no escriba datos personales; si alguien los escribe
igual, se borra desde el panel.

**Las pruebas no se mezclan:** una calificación hecha desde la PC (`npm run
dev`) o desde una preview de Cloudflare también va a la base de producción,
pero marcada como **prueba**, y el panel no la cuenta salvo que se tilde
"Incluir pruebas". Las que hagas en liquidar.ar mismo cuentan como reales:
borralas después desde el panel.

**Dónde se ve:** `/admin` → pestaña **Calificaciones** (fechas y semanas en
hora argentina). Arriba, el porcentaje de 4 y 5 estrellas (la medida
principal) y el promedio. Abajo, en este orden: qué falló en las bajas, semana
a semana (incluidas las semanas en cero), por convenio, para qué la usan,
desde dónde, cómo se armó el recibo y si le faltaban datos; después los
comentarios, y al final todas las calificaciones del filtro, cada una con su
botón **Borrar**, y **Borrar las N del filtro** para limpiar de una (pruebas,
o una tanda de calificaciones falsas: ver `docs/continuidad.md`).
**Descargar CSV** baja lo que muestra el filtro, separado por punto y coma
para que el Excel en castellano lo abra en columnas.

**Cómo leerlo sin engañarse:** califica sobre todo el que quedó muy contento o
muy enojado, así que importan más las comparaciones y la tendencia que el
promedio. Con menos de 20 calificaciones en un grupo, una diferencia no dice
nada (el panel lo marca). Lo que más conviene mirar:

- **"El número no me cierra"** concentrado en un convenio o una categoría:
  revisar esa escala o esas reglas.
- **La nota baja la semana en que se cargó un mes** o se publicó un cambio:
  algo puede haber quedado mal.
- **"Los datos no están al día"**, o recibos a los que **les faltaban datos**
  que califican peor: cargar las tablas del mes a tiempo.
- **Celular peor que computadora**: revisar la pantalla chica.
- **Una semana en cero, marcada en rojo**, después de semanas con
  calificaciones: puede ser que la tarjeta haya dejado de guardar (casi
  siempre, reglas sin pegar: ver `docs/continuidad.md`).

Quien no llega a calcular (por un error) no ve la tarjeta: para eso el aviso
del error trae "Reportar error / sugerencia", que manda un mail. Ese mail
lleva la página sin la afiliación sindical ni los datos de la familia.

**Antes de que funcione hay que pegar las reglas** (ver `firestore.rules`, más
abajo): las calificaciones son lo único que alguien sin sesión puede escribir
en la base, y las reglas validan cada campo. Sin el bloque de
"calificaciones" en la consola, la tarjeta dice "No pudimos guardar tu
calificación" y la pestaña, que no puede leerlas. Si algún día se cambian
los motivos, los perfiles o cualquier dato que se guarda, se cambian en
`lib/calificaciones.js` **y** en `firestore.rules` (un test avisa si no
coinciden) y se vuelven a pegar las reglas.

---

## Qué significa cada regla de un convenio

| Regla | Qué hace |
|---|---|
| **Antigüedad — un porcentaje por año** | Se multiplica por los años. Comercio: 1% por año. |
| **Antigüedad — por tramos** | El porcentaje de cada tramo es el **total**, no se multiplica. Gastronómicos: desde los 5 años, 4% del básico. |
| **Presentismo** | Un porcentaje. Elegís si se calcula sobre el básico o sobre básico + antigüedad. |
| **Adicionales remunerativos** | Conceptos propios del convenio que suman al sueldo. En gastronómicos: complemento de servicio 12% y asistencia perfecta 10%. |
| **Adicionales por día, por km, por viaje o por mes** | Un importe que fija cada planilla. Por día, por km o por viaje se multiplica por la cantidad que informa la persona (la comida, el viático especial, la pernoctada y los kilómetros de Camioneros); por mes es un importe fijo, sin cantidad. El importe se carga por período en Escalas → Valores del período, con la clave que usa el adicional. Los no remunerativos van sin incidencia (viáticos del art. 106 LCT) salvo que lo marques. El de por mes remunerativo va como el presentismo: se proporciona por la jornada y cuenta para el aguinaldo, las vacaciones, el valor hora y las sindicales; no remunerativo se paga entero. |
| **Antigüedad: sobre qué** | Sobre el básico (Comercio, gastronómicos) o sobre básico + adicionales remunerativos (Camioneros, ítem 6.1.5). |
| **Retenciones sindicales** | Descuentos. Pueden ser un porcentaje o un monto fijo, y pueden aplicarse sólo a afiliados o sólo a no afiliados. La base puede ser el remunerativo, el **remunerativo habitual** (sólo lo fijo del mes: sin horas extras, SAC, vacaciones ni lo que se paga por km, día o viaje; es el tope del Decreto 612/26 para las cuotas solidarias), remunerativo + no remunerativo, o sólo el no remunerativo. |
| **Reemplaza la obra social** | Marcala si esa retención va en lugar del 3% de obra social, para que no se cobren las dos. |
| **ART típica** | La alícuota de ART habitual de la actividad, en %. Es el valor que el recibo propone; el empleador la cambia, y siempre se muestra como estimada. Vacía = el recibo avisa que falta. Hoy Comercio, Gastronómicos y Camioneros tienen 5%, el valor de tu Nacional Sistema: cambialo si querés (el transporte de cargas suele pagar más). |
| **Contribuciones propias del convenio** | Lo que el CCT le cobra al empleador (cámaras, fondos, seguros), con su rubro del decreto. |

Las retenciones de ley (jubilación 11%, PAMI 3%, obra social 3%) las aplica el
motor solo: no hay que cargarlas en ningún convenio. Con la tabla de
contribuciones del mes, además, aplica los topes del art. 9 y prorratea la obra
social por la jornada (los dos se apagan desde la pestaña Contribuciones).

---

## Para trabajar en el código

```bash
npm install          # la primera vez
npm run dev          # levanta http://localhost:3000
npm test             # corre los tests (más de 700; los de interfaz, en test/ui, corren en jsdom)
npm run build        # corre los tests y después compila: es lo que hace Cloudflare al publicar
npm run lint         # revisa el código
```

También están `iniciar-calculadora.bat`, `probar-calculos.bat` y
`respaldar.bat` para hacer lo mismo con doble clic, y `cargar-mes.bat` para
publicar un mes desde una carpeta con sus CSV (tarea 1, "varios meses de
una"): primero muestra qué haría y recién si decís que sí pide la contraseña.

Hace falta un archivo `.env.local` con cuatro claves de Firebase. Son públicas
por diseño (se ven en el navegador de cualquiera que entre al sitio), pero no
viajan en el repositorio:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=liquidar-f01ab.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=liquidar-f01ab
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=liquidar-f01ab.firebasestorage.app
```

La cuarta es el bucket de Firebase Storage, donde van los archivos de los
acuerdos que se cargan desde /admin (pestaña Acuerdos). Si falta, el sitio
funciona igual y el panel avisa que no puede subir archivos. En Cloudflare
Pages las cuatro van en Settings → Variables and Secrets, y después de
agregar una hay que volver a desplegar.

**Regla de oro con los tests:** si uno falla, se arregla el código, nunca el
test. Un test de regresión que se "arregla" cambiando el número esperado es la
forma más rápida de romper producción sin que nadie se entere.

### Antes de publicar

1. `npm test` — la cantidad de tests nunca baja.
2. `npm run build`.
3. Pushear a una rama que no sea `main` y mirar la preview que arma Cloudflare.
4. Probar a mano en producción: Comercio con Vendedor B, 5 años, jornada 48,
   no afiliado, **septiembre 2026 → neto $1.251.841,10** (con la tabla de
   contribuciones de septiembre y Ganancias jul-dic 2026). Si cambió sin que lo
   hayas decidido, algo se rompió.

   Ojo, son dos canarios distintos. Los tests con pesos fijos usan la foto
   congelada del 13/9/2026 en `test/fixtures/patron/`, que da
   **$1.166.249,70** con la escala de julio tal como estaba cargada antes de
   corregirla con la planilla firmada del acuerdo (los $120.000 no
   remunerativos sumados al básico y sin el tramo del 1,9%). Esa foto no se
   recaptura nunca: lo que vigila es la aritmética del motor, no la escala. El
   canario de producción de septiembre también está en
   `test/canarioProduccion.test.js`, sobre las capturas vivas de
   `test/fixtures/`.
5. Recién ahí, a `main`.

---

---

## Antes de tocar el código: leete el criterio

`docs/criterio.md` contesta la pregunta que vuelve cada vez que aparece un
convenio nuevo: **qué se carga como dato y qué obliga a tocar código**. Tiene la
regla madre (*el motor no adivina nunca: o entiende, o avisa*), los cuatro
criterios, los pasos para agregar una regla nueva, y la lista honesta de todo lo
que todavía no cumple.

Si vas a pedirle a alguien —persona o asistente— que toque este proyecto,
mandale esa hoja primero.

---

## Cosas que conviene saber

- **Un push con los tests rotos no llega a producción.** `npm run build`, que
  es lo que corre Cloudflare, ejecuta la suite antes de compilar: si algo
  falla, no se publica y queda la versión anterior. La acción de GitHub
  (`.github/workflows/tests.yml`) corre los tests, el lint y la compilación en
  cada push y deja la marca verde o roja al lado del commit (y un mail, si en
  tu cuenta de GitHub están prendidas las notificaciones de Actions). Para
  publicar sin tests en una urgencia está `npm run build:sin-tests` (ver
  `docs/continuidad.md`).
- **Respaldo de la base:** doble clic en `respaldar.bat` (o
  `node scripts/respaldar.mjs`) baja todas las colecciones a
  `respaldos/AAAA-MM-DD-HHMM/`. Hacelo antes de cargar un mes. Para volver
  atrás: `node scripts/restaurar.mjs <carpeta> <ruta> --aplicar` (ver
  `docs/continuidad.md`).
- **`firestore.rules` está en el repo pero NO se aplica solo.** Desde el
  13/9/2026 (10:56) la consola y el archivo dicen lo mismo: se lee sin registro
  sólo lo que la calculadora usa, y escribe únicamente el usuario con el que
  entrás a /admin, identificado por su UID; todo lo demás está cerrado. La
  única excepción, desde el 26/11/2026, son las calificaciones del pie del
  recibo (tarea 5): cualquiera puede crear una, con la forma exacta que valida
  el archivo, y nadie más que vos las lee. Si
  alguna vez cambiás el archivo, hay que volver a pegarlo en la consola
  (Firestore Database → Reglas → Publicar) con la cuenta de Google dueña del
  proyecto, que es `info@liquidar.ar`. Cambiar el mail o la contraseña del
  administrador no toca las reglas; crear otro usuario administrador sí (hay
  que poner su UID en el archivo y en la consola antes de usar el panel).
- **`storage.rules` es lo mismo para Firebase Storage** (los archivos de los
  acuerdos): se pega en Storage → Reglas → Publicar. Lee cualquiera, escribe
  sólo el administrador, hasta 10 MB y sólo PDF, JPG, PNG, DOC o DOCX.
- **Cada acuerdo tiene su propia página**: `liquidar.ar/acuerdos/<convenio>/<título-en-minúsculas>`
  (la URL se ve en la pestaña Acuerdos de /admin, debajo de cada uno). Esa
  dirección se arma del título al crear el acuerdo y **no cambia si después
  editás el título**: puede estar en Google o compartida. Despublicar un
  acuerdo deja su página en 404 y Google la saca sola.
- **Google**: el sitio está en Search Console (verificación por DNS). Cada
  página declara su propio título, descripción, canonical e imagen para
  compartir; `/sitemap.xml` lista todas las páginas con su fecha real de
  cambio y `/robots.txt` permite todo (el panel y el login llevan `noindex`).
- **A `/admin` entra cualquier usuario autenticado de Firebase, pero guardar
  sólo puede `admin@liquidar.ar`**, porque las reglas llevan el UID de ese
  usuario (`yx2H1OsUirUTvevmtTasVnSU5Zw1`). El mail es un alias de
  `info@liquidar.ar` en Google Workspace, así que "Olvidé mi contraseña"
  llega ahí. `scripts/restaurar.mjs` entra con ese mail (o con `ADMIN_EMAIL`
  de `.env.local`, si está). Hasta el 11/10/2026 el usuario era
  `admin@csueldos.com`, un dominio que nadie tenía registrado.
- **Las visitas se miden con Cloudflare Web Analytics** (sin cookies, sin
  aviso de consentimiento). Se enciende con la variable
  `NEXT_PUBLIC_CF_BEACON_TOKEN` en el proyecto de Cloudflare Pages (Settings →
  Variables) y un redeploy; el token sale de "Analytics & Logs → Web Analytics
  → Add a site → liquidar.ar". Sin la variable, el sitio no manda nada y no
  pasa nada.
- **`node scripts/capturarFixtures.mjs <id-del-convenio>`** baja el convenio y
  todas sus escalas a `test/fixtures/`, que es lo que leen los tests sobre
  datos actuales (invariantes, canario de producción). No toca
  `test/fixtures/patron/`, la foto congelada de los tests con pesos fijos. No
  es un respaldo: para eso está `respaldar.bat`.

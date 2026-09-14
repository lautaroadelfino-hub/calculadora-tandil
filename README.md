# LiquidAR

Calculadora de sueldos por convenio colectivo argentino. Cada recibo muestra
también el costo laboral total para el empleador, como exige el art. 140
inc. j) de la LCT desde junio de 2026. En producción: **https://liquidar.ar**

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

## Las cuatro tareas que vas a hacer siempre

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
contables. `/admin` → pestaña **Contribuciones** → período `AAAA-MM` →
**Cargar valores oficiales** → revisá los números → **Guardar**.

Si un mes no tiene tabla, la calculadora usa la del mes anterior más cercano y
lo avisa; si no hay ninguna anterior, el recibo sale **sin la sección del
empleador** y lo dice en ámbar. Junio y julio de 2026 ya están cargados.

Los tres criterios contables de esa pestaña (topes del art. 9 en los aportes,
obra social del trabajador prorrateada por la jornada, SAC en la base patronal)
arrancan **encendidos** por tu decisión del 13/9/2026. Se apagan desde ahí, sin
tocar código.

---

## Qué significa cada regla de un convenio

| Regla | Qué hace |
|---|---|
| **Antigüedad — un porcentaje por año** | Se multiplica por los años. Comercio: 1% por año. |
| **Antigüedad — por tramos** | El porcentaje de cada tramo es el **total**, no se multiplica. Gastronómicos: desde los 5 años, 4% del básico. |
| **Presentismo** | Un porcentaje. Elegís si se calcula sobre el básico o sobre básico + antigüedad. |
| **Adicionales remunerativos** | Conceptos propios del convenio que suman al sueldo. En gastronómicos: complemento de servicio 12% y asistencia perfecta 10%. |
| **Adicionales por día, por km o por viaje** | Un importe que fija cada planilla, multiplicado por una cantidad que informa la persona: la comida, el viático especial, la pernoctada y los kilómetros de Camioneros. El importe se carga por período en Escalas → Valores del período, con la clave que usa el adicional. Los no remunerativos van sin incidencia (viáticos del art. 106 LCT) salvo que lo marques. |
| **Antigüedad: sobre qué** | Sobre el básico (Comercio, gastronómicos) o sobre básico + adicionales remunerativos (Camioneros, ítem 6.1.5). |
| **Retenciones sindicales** | Descuentos. Pueden ser un porcentaje o un monto fijo, y pueden aplicarse sólo a afiliados o sólo a no afiliados. La base puede ser el remunerativo, el **remunerativo habitual** (sin horas extras, SAC ni vacaciones: es el tope del Decreto 612/26 para las cuotas solidarias), remunerativo + no remunerativo, o sólo el no remunerativo. |
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
npm test             # corre los tests (más de 380)
npm run build        # verifica que compile, que es lo que decide el deploy
```

También están `iniciar-calculadora.bat` y `probar-calculos.bat` para hacer lo
mismo con doble clic.

Hace falta un archivo `.env.local` con tres claves de Firebase. Son públicas
por diseño (se ven en el navegador de cualquiera que entre al sitio), pero no
viajan en el repositorio:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=liquidar-f01ab.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=liquidar-f01ab
```

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

   Ojo, son dos canarios distintos: los tests usan una foto congelada de julio
   2026 en `test/fixtures/` que da **$1.166.249,70**, y esa foto tenía la escala
   de julio mal cargada (los $120.000 no remunerativos sumados al básico y sin
   el tramo del 1,9%). El 13/9/2026 se corrigió en Firestore con la planilla
   firmada del acuerdo; la foto de los tests se dejó a propósito, porque lo que
   vigila es la aritmética del motor, no la escala. Si algún día se recapturan
   los fixtures, esos números esperados cambian y hay que actualizarlos a mano.
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

- **`npm run lint` está roto** y no es culpa de nadie: el plugin pide
  `typescript`, que no está instalado porque el proyecto es JavaScript puro. No
  afecta al deploy.
- **`firestore.rules` está en el repo pero NO se aplica solo.** Desde el
  13/9/2026 (10:56) la consola y el archivo dicen lo mismo: se lee sin registro
  sólo lo que la calculadora usa, y escribe únicamente la cuenta
  `admin@csueldos.com` con la que entrás a /admin; todo lo demás está cerrado.
  Si alguna vez cambiás el archivo, hay que volver a pegarlo en la consola
  (Firestore Database → Reglas → Publicar) con la cuenta de Google dueña del
  proyecto, que es `info@liquidar.ar`. Y si cambiás el mail del administrador,
  cambialo en el archivo y en la consola antes de usar el panel.
- **Hoy entra a `/admin` cualquier usuario autenticado de Firebase.** El archivo
  de reglas tiene preparada la versión con lista de administradores, pero hay
  que poner el UID antes de activarla: si se aplica con la lista vacía, te
  quedás afuera de tu propio panel.
- **Las visitas se miden con Cloudflare Web Analytics** (sin cookies, sin
  aviso de consentimiento). Se enciende con la variable
  `NEXT_PUBLIC_CF_BEACON_TOKEN` en el proyecto de Cloudflare Pages (Settings →
  Variables) y un redeploy; el token sale de "Analytics & Logs → Web Analytics
  → Add a site → liquidar.ar". Sin la variable, el sitio no manda nada y no
  pasa nada.
- **La copia de seguridad más barata** es la pestaña Convenios → "Descargar
  copia de seguridad", más `node scripts/capturarFixtures.mjs <id-del-convenio>`,
  que baja el convenio y todas sus escalas a `test/fixtures/`. Eso además hace
  que ese convenio quede cubierto por los tests automáticamente.

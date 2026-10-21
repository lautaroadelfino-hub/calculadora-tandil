# Criterio para programar convenios

Esta hoja existe para contestar una sola pregunta, la que vuelve cada vez que
aparece un convenio nuevo: **¿esto se carga como dato, o hay que tocar código?**

Sin una respuesta escrita, la salida más fácil siempre va a ser meter un "si el
convenio es tal, hacé esto otro" adentro del motor. Ese camino ya se recorrió:
eran tres motores separados por gremio y costó 3.726 líneas borrarlos (commit
`b1f7b31`, 10 de julio de 2026).

---

## Qué queda afuera

**El sector público.** Es una decisión tomada, no una función pendiente. Cada
municipio y cada provincia tiene su propio régimen, con caja jubilatoria y obra
social propias que no son las nacionales que aplica el motor. Equivocarse ahí es
mucho más fácil y mucho más caro que no ofrecerlo.

No agregarlo sin hablarlo antes. Hay un test que frena el intento distraído.

---

## La decisión de fondo

**Un solo motor. El convenio es dato.**

Ninguna particularidad de un gremio se resuelve con código propio para ese
gremio. Si el modelo no la puede expresar, **se agranda el modelo para todos**,
nunca se hace una excepción para uno.

La consecuencia práctica, que es el punto: cargar un convenio nuevo no necesita
un programador.

---

## La regla madre

> **El motor no adivina nunca. O entiende, o avisa.**

Todo lo demás sale de ahí. En concreto:

- Si el motor recibe una palabra que no conoce, **frena con un mensaje en
  castellano**. No elige una por su cuenta.
- Si le falta un número que la regla necesita, **frena**. No usa el de otro
  convenio.
- Si el usuario cargó algo que el recibo no usó, **lo dice en pantalla**.

Esto no es prolijidad. Los tres errores más caros del proyecto fueron todos el
mismo: algo se guardaba bien, el recibo salía mal, y **no había ni un mensaje**.

| Qué pasó | Cuánto duró |
|---|---|
| El panel guardaba `aplica_sobre` del presentismo y el motor lo ignoraba | Desde julio de 2026 |
| El motor procesaba adicionales que el formulario no sabía crear | Igual |
| Un convenio sin porcentaje cargado se liquidaba con el 1% y el 8,333% de Comercio | Igual |

---

## Las cuatro reglas

### 1. Lo que se guarda, se lee

Todo campo que el panel guarda dentro de `reglas_calculo` tiene que estar
declarado en `lib/vocabularioConvenios.js` y ser leído por el motor. Si sobra,
se saca.

Un campo escrito que nadie lee es una bomba con temporizador: el panel te lo
acepta, te lo muestra guardado, y el día que alguien cargue un convenio distinto
el recibo sale mal sin un solo aviso.

**Se controla solo:** `test/vocabulario.test.js`. Compara las tres cosas —lo que
el formulario guarda, lo que el modelo declara y lo que el motor lee— y falla
nombrando el campo exacto.

### 2. Ningún número suelto adentro del motor

Todo número que no venga del convenio va a `lib/parametrosLaborales.js`, con
nombre y con el porqué al lado.

Y cuidado con una trampa: **que un número esté escrito fijo no prueba que sea
universal. Prueba que todavía nadie necesitó otro.** La prueba está en este
mismo repositorio: el motor gastronómico que se borró tenía el divisor de horas
como **parámetro** (con 200 apenas como valor por defecto) y la base de la obra
social como una **opción de tres valores**. Hoy las dos están clavadas, y
Comercio y Gastronómicos —que en aquel motor elegían valores distintos— reciben
el mismo criterio.

Cuando un parámetro tenga que poder venir del convenio, la forma es: **si el
convenio lo dice, se usa el del convenio; si no lo dice, se usa el de ley y se
muestra en el recibo cuál se usó.** Nunca el número de un gremio aplicándose
callado a otro.

Mover un número de lugar **no puede cambiar ni un centavo**. Si `npm test` se
pone rojo, el que se equivocó es el cambio.

### 3. La calculadora no lee archivos de `data/`

Los datos que el dueño actualiza viven en Firestore y se cargan desde `/admin`.
Los archivos de `data/` sirven como **semilla**: el panel tiene un botón que los
carga a la base, como ya hace la pestaña de Ganancias.

El motivo es el que da la medición: los datos que viajan adentro del código
aparecen al instante (el Panel Empleador está visible a los 710 ms) pero
actualizarlos requiere editar el repositorio y desplegar. Los que viven en la
base tardan un segundo pero los actualiza el dueño solo. Para un proyecto que
mantiene una persona que no programa, **la segunda gana siempre**.

**Se cumple desde el 13 de septiembre de 2026.** El módulo que importaba de
`data/` (`calculoEmpleador.js`) se retiró junto con el panel del empleador, y
las bases del art. 9 y las alícuotas de las contribuciones pasaron a Firestore
(colección `parametros_contribuciones`, pestaña Contribuciones), con
`data/contribuciones.seed.json` como semilla y un botón que la carga.

**Se controla solo:** `test/criterio.test.js` lee el código del motor y de
los módulos que usa, y falla si alguno importa de `data/`.

### 4. Qué pregunta es del convenio y qué es de la ley

La prueba no es mirar el código, es contestar en voz alta:
**¿dónde tengo que ir a mirar para saber cuánto vale esto?**

- Si la respuesta es **`/admin`** → la pregunta es **del convenio**.
- Si la respuesta es el **Boletín Oficial** → la pregunta es **universal**.

| Del convenio | Universales |
|---|---|
| categoría, zona, años de antigüedad, afiliación al gremio | jornada, horas extras, aguinaldo, vacaciones, cónyuge, hijos, hijos con discapacidad, régimen de contribuciones, alícuota y cuota fija de ART |

Un caso mixto que conviene tener claro: la **ART** es universal (cada empleador
negocia la suya, no la fija el convenio), pero el **valor propuesto** sale del
convenio (`art.alicuota_tipica`, cargado en `/admin`). El recibo la muestra
siempre como estimada.

La lista completa está en `lib/vocabularioConvenios.js`.

---

## Cómo se agrega una regla nueva

**Paso 0 — ¿de qué tipo es?** Son tres tipos, no dos. La pasada del costo
laboral (septiembre de 2026) mostró que confundir los dos últimos termina con
un dato que cambia por período clavado adentro del código.
- **¿Podrían dos convenios cargar números distintos?** → es **del convenio**:
  va a `reglas_calculo` y al panel. Seguí todos los pasos.
- **¿Es de ley y no cambia** (el 11% de jubilación, el /150 del plus
  vacacional)? → es una **constante**: va a `parametrosLaborales.js`, con nombre
  y con el porqué. Sólo los pasos 1, 2 y 6.
- **¿Es de ley pero cambia por período** (bases del art. 9, alícuotas de las
  contribuciones, escala de Ganancias)? → es **dato del período**: va a
  Firestore con su pestaña en `/admin` (el patrón de Ganancias y de
  Contribuciones), con una semilla en `data/` y un botón que la carga. La
  pantalla se la pasa al motor como tabla; el motor no la busca. Pasos 1, 2, 5
  y 6.

1. **Declarala** en `lib/vocabularioConvenios.js`. Si no está ahí, no existe.
2. **Que el motor la lea**, con el valor por defecto igual al comportamiento de
   hoy, así ningún convenio ya cargado cambia.
3. **Agregala al formulario** (`convenioForm.js` + `ConveniosTab.jsx`), con su
   validación.
4. **Si necesita un dato nuevo de la persona**, agregalo a `inputs_requeridos`
   y probalo con un convenio que no lo tenga.
5. **Escribí el test**, y después borrá a propósito la línea del motor que lee
   el campo: si el test sigue en verde, el test no sirve.
6. **Verificá que nada se movió:** `npm test`, el canario de producción del
   README (Vendedor B, 5 años, septiembre 2026 → **$1.251.841,10**) y la foto
   del motor: `node scripts/fotoDelMotor.mjs --comparar respaldos/foto-motor/<la última>.ndjson`
   tiene que dar cero diferencias salvo lo decidido. La foto vive en
   `respaldos/foto-motor/`, que está fuera de git: es una herramienta de esta
   máquina (se regenera con un respaldo de Firestore), y Cloudflare no la corre,
   sólo corre `npm test`. Lo que la foto cuida tiene que estar también en un test.

---

## Criterios normativos decididos por el dueño

**Decreto 612/2026 (B.O. 20/7/2026), decidido el 5/10/2026.** Reglamenta el
art. 9 de la Ley 14.250: lo que el convenio descuenta a favor del sindicato no
pasa del 2%, y se calcula sobre el básico de convenio más las sumas
remunerativas normales, habituales y de pago mensual (afuera horas extras, SAC,
plus vacacional, premios y no remunerativos). En el motor esa base es
`remunerativo_habitual`.

- **Contribución solidaria** de Camioneros y Gastronómicos: `remunerativo_habitual`. Ya estaba así.
- **Cuota de afiliado:** el decreto la deja afuera del tope; va sobre la base de cada convenio.
- **Comercio (solidario 2% + FAECyS 0,5%):** sigue sobre remunerativo + no
  remunerativo mientras rija la cautelar de la Justicia Federal de San Martín
  que suspendió los arts. 131 y 133 de la Ley 27.802 para los convenios de
  FAECyS (130/75, 547/08, 781/20). Si la cautelar cae, pasa a 2% sobre
  `remunerativo_habitual`.
- **Seguro de sepelio** (Camioneros 1,5%, Gastronómicos 1%): no se suma a la
  solidaria para el tope del 2%; es un seguro, no un aporte al sindicato.
- **Presentismo, y cualquier adicional remunerativo de importe fijo por mes
  que fije el convenio** (el premio asistencia de Camioneros, por ejemplo):
  integran la base habitual. Son adicionales mensuales del convenio, no premios
  en el sentido del decreto, aunque la paritaria los llame "premio". Así se lee
  el paréntesis de arriba, y así lo aplica la decisión del 15/10/2026 de más
  abajo.

Fuentes: DDAS, PASBBA Abogados, Raskovsky & Asociados e Ignacio Online (julio
de 2026).

**Topes del art. 9 en PAMI y obra social:** van, por el Decreto 1448/2008. Las
contribuciones del empleador no se topean.

**SAC, decidido el 5/10/2026:** la mitad del sueldo del mes simulado, no la
mejor remuneración del semestre.

**SAC en Ganancias, decidido el 5/10/2026:** la persona elige (RG 5531/2024):
1/12 por mes, que es el default, o entero cuando se cobra. Los viáticos de
Camioneros no entran en Ganancias.

**Horas extras por km de Camioneros, decidido el 5/10/2026:** pagan aportes,
pero no entran en el SAC, el plus vacacional ni la solidaria.

**Antigüedad sobre lo que se paga por km, día o viaje, decidido el 15/10/2026:**
se calcula (ítem 6.1.5 del 40/89) y va como eso: paga aportes, pero no entra en
el SAC, el plus vacacional, la solidaria, el valor hora ni el ajuste de la obra
social a jornada completa. En el recibo es una sola línea de antigüedad; "Cómo
se hizo esta cuenta" dice cuánto es esa parte (y nombra el ajuste de la obra
social sólo en jornada parcial, que es donde existe). El recibo impreso, donde
ese bloque no sale, lleva un renglón al pie con el mismo importe. Por esto
mismo la etiqueta de la base `remunerativo_habitual` dice "lo fijo del mes".

**Adicional remunerativo de importe fijo por mes, decidido el 15/10/2026:** va
como el presentismo. Se proporciona por la jornada y entra en el SAC, el plus
vacacional, la solidaria, el valor hora y el ajuste de la obra social a jornada
completa. Los no remunerativos por mes siguen como estaban (no se proporcionan):
eso no se decidió.

**Tope mínimo del art. 9 en jornadas cortas:** no se resuelve porque no se da.
Desde 20 horas, el básico más bajo cargado (Camioneros, $949.566 a 44 hs) da
unos $431.000, el triple de la base mínima.

**Tope del SAC, decidido el 5/10/2026:** el SAC se topea aparte, a la mitad de la base máxima.

**Detracción de la Ley 27.541, decidido el 5/10/2026:** en el mes del SAC sube un 50%.

**Valor de la hora extra, decidido el 5/10/2026:** básico + antigüedad +
presentismo + adicionales remunerativos, sin los no remunerativos. Desde el
15/10/2026, con los adicionales fijos por mes y sin la antigüedad que sale de
los km.

**Obra social, decidido el 5/10/2026.** El 3% del trabajador y el 6% del
empleador van siempre sobre la jornada completa de la categoría (art. 92 ter
inc. 4 LCT); la diferencia la paga el trabajador, y por eso la calculadora
liquida desde 20 horas semanales.

---

## Lo que todavía NO cumple este criterio

Escrito acá a propósito: una regla con excepciones no anotadas se convierte en
una regla que nadie sigue.

| Qué | Contra qué regla va |
|---|---|
| Los recargos de la hora extra (1,5 y 2,0), el aguinaldo (50%), el plus vacacional (/150) y los aportes de ley (11%, 3%, 3%) son constantes con nombre en `parametrosLaborales.js`, pero **un convenio no puede declarar otros**. Hay convenios con el sábado al 100% y hay actividades con caja propia | Modelo incompleto |
| La obra social va siempre sobre la jornada completa (decisión del 5/10/2026, art. 92 ter inc. 4 LCT); que su base **incluya el no remunerativo** sigue fijo. Los dos motores viejos lo tenían como opción y Comercio y Gastronómicos elegían valores **distintos** | Regla 2 |
| Los adicionales de importe fijo van como "por unidad" con unidad `mes` y el importe en la escala del período; lo que todavía no existe es un adicional porcentual sobre otro adicional ("15% sobre el valor comida", ítem 5.3.11 del 40/89) ni los coeficientes zonales del sur (1,20 y 1,40) | Modelo incompleto |
| Un adicional remunerativo de importe fijo por mes integra siempre la remuneración habitual (SAC, plus vacacional, solidaria, valor hora, obra social a jornada completa). El día que aparezca un premio que de verdad no sea normal y habitual, hace falta una palanca por regla (`integra_habitual: false`) con su casilla en /admin, porque la base de una retención es una sola palabra | Modelo incompleto |
| Las bases de una contribución patronal son dos palabras (`remunerativo`, `remunerativo_mas_no_remunerativo`). Alcanzan para los convenios cargados; el día que uno tenga dos sumas no remunerativas con tratamiento distinto, la línea tiene que crecer | Modelo incompleto |
| El panel no sabe guardar un adicional colgado de una pregunta que no sea la suya, ni uno que se active con el "no" (`depende_de`, `cuando`), ni una retención colgada de una pregunta: al guardar desde /admin se pierde. Ningún convenio cargado lo usa. `test/vocabulario.test.js` (chequeo 5) lo lleva anotado y avisa si aparece otro | Lo que se guarda tiene que ser lo que el motor lee |
| `firestore.rules` y la consola coinciden desde el 13/9/2026 (lectura sólo de lo que usa la calculadora; escribe sólo el usuario admin, por UID; el resto cerrado). Lo que sigue siendo cierto: **el archivo no se aplica solo**, y cada cambio hay que volver a pegarlo en la consola con la cuenta `info@liquidar.ar` | A recordar al agregar una colección |

**Ya saldado (13 de septiembre de 2026, tercera pasada, por Camioneros):** los
adicionales **por unidad** (`adicionales_por_unidad`: por día, por km, por viaje o
por mes, remunerativos o no, con el importe en `valores_del_periodo` de la escala
y la cantidad en una pregunta del convenio; la unidad `mes` no lleva cantidad) y la antigüedad **sobre básico más
adicionales** (`antiguedad.aplica_sobre`, ítem 6.1.5 del CCT 40/89). Un importe
que la escala no trae frena: no se inventa.

**Ya saldado (13 de septiembre de 2026, segunda pasada):** la escala acepta una
segunda suma no remunerativa **sin incidencia** (`no_remunerativo_sin_incidencia`,
con su nombre en el período): no genera antigüedad ni presentismo, no entra en
ninguna base y va derecho al neto. Salió del acuerdo de Comercio de julio de
2026, que paga $120.000 con incidencia y $25.000 sin ella el mismo mes. Y las
retenciones sindicales pueden calcularse sobre la remuneración habitual
(`remunerativo_habitual`: lo fijo del mes, sin horas extras, SAC, vacaciones ni
lo que se paga por km, día o viaje), que es la base
de la contribución solidaria de UTHGRA con el tope del Decreto 612/26. Una base
que el motor no conoce ahora frena, en vez de caer callada al remunerativo.

**Ya saldado (13 de septiembre de 2026, con la pasada del costo laboral):** el
motor y todo lo que importa dejaron de leer `data/` (Regla 3); las alícuotas de
las contribuciones, la detracción, las sumas fijas y las bases del art. 9 son
una tabla por período en Firestore; los topes del art. 9 y el prorrateo de la
obra social son criterios de esa tabla, encendidos por decisión del dueño; los
números que el motor tenía sueltos (11%, 3%, 3%, 1,5, 2,0, 0,5, /150, /30)
tienen nombre en `parametrosLaborales.js`; y los dos convenios en Firestore
quedaron sin el `antiguedad.aplica_sobre` viejo, porque se guardaron desde
`/admin` al cargarles la ART típica.

**Ya saldado:** si las sumas no remunerativas generan antigüedad, presentismo y
adicionales es una casilla del convenio (13 de septiembre de 2026). Salió de
leer el art. 11.3.3 del CCT 389/04, que dice que la base es "únicamente los
salarios básicos de la categoría": es criterio contable y cambia por convenio,
así que lo decide el dueño, no el código.

**Ya saldado:** un adicional puede colgarse de una pregunta en vez de estar
siempre prendido, y la pregunta la escribe el dueño desde el panel (13 de
septiembre de 2026). Es el mecanismo que faltaba para que lo que depende del
empleado lo conteste el que usa la calculadora, y no lo decida el código.

**Ya saldado:** la jornada completa del convenio y el divisor de horas mensuales
salieron del motor y ahora se cargan desde el panel (13 de septiembre de 2026).
Eran el primer muro contra el que chocaba cualquier convenio que no fuera de 48
horas.

Cada línea de esta tabla es un convenio futuro que va a chocar. No hay que
arreglarlas todas ahora: hay que arreglar la que bloquee al próximo convenio que
quieras cargar, y tacharla de acá.

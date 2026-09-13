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
6. **Verificá que nada se movió:** `npm test` y el canario del README (Vendedor
   B, 5 años, julio 2026 → **$1.166.249,70**).

---

## Lo que todavía NO cumple este criterio

Escrito acá a propósito: una regla con excepciones no anotadas se convierte en
una regla que nadie sigue.

| Qué | Contra qué regla va |
|---|---|
| Los recargos de la hora extra (1,5 y 2,0), el aguinaldo (50%), el plus vacacional (/150) y los aportes de ley (11%, 3%, 3%) son constantes con nombre en `parametrosLaborales.js`, pero **un convenio no puede declarar otros**. Hay convenios con el sábado al 100% y hay actividades con caja propia | Modelo incompleto |
| Que la obra social del trabajador se prorratee por la jornada ya es un criterio de la tabla del período; que su base **incluya el no remunerativo** sigue fijo. Los dos motores viejos lo tenían como opción y Comercio y Gastronómicos elegían valores **distintos** | Regla 2 |
| Los adicionales de importe fijo van como "por unidad" con unidad `mes` y el importe en la escala del período; lo que todavía no existe es un adicional porcentual sobre otro adicional ("15% sobre el valor comida", ítem 5.3.11 del 40/89) ni los coeficientes zonales del sur (1,20 y 1,40) | Modelo incompleto |
| Las bases de una contribución patronal son dos palabras (`remunerativo`, `remunerativo_mas_no_remunerativo`). Alcanzan para los convenios cargados; el día que uno tenga dos sumas no remunerativas con tratamiento distinto, la línea tiene que crecer | Modelo incompleto |
| `firestore.rules` y la consola coinciden desde el 13/9/2026 (lectura sólo de lo que usa la calculadora; escribe sólo `admin@csueldos.com`; el resto cerrado). Lo que sigue siendo cierto: **el archivo no se aplica solo**, y cada cambio hay que volver a pegarlo en la consola con la cuenta `info@liquidar.ar` | A recordar al agregar una colección |

**Ya saldado (13 de septiembre de 2026, tercera pasada, por Camioneros):** los
adicionales **por unidad** (`adicionales_por_unidad`: por día, por km, por viaje o
por mes, remunerativos o no, con el importe en `valores_del_periodo` de la escala
y la cantidad en una pregunta del convenio) y la antigüedad **sobre básico más
adicionales** (`antiguedad.aplica_sobre`, ítem 6.1.5 del CCT 40/89). Un importe
que la escala no trae frena: no se inventa.

**Ya saldado (13 de septiembre de 2026, segunda pasada):** la escala acepta una
segunda suma no remunerativa **sin incidencia** (`no_remunerativo_sin_incidencia`,
con su nombre en el período): no genera antigüedad ni presentismo, no entra en
ninguna base y va derecho al neto. Salió del acuerdo de Comercio de julio de
2026, que paga $120.000 con incidencia y $25.000 sin ella el mismo mes. Y las
retenciones sindicales pueden calcularse sobre la remuneración habitual
(`remunerativo_habitual`, sin horas extras, SAC ni vacaciones), que es la base
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

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

> **Hoy esto no se cumple.** `lib/calculoEmpleador.js` y
> `lib/parametrosLaborales.js` importan de `data/`. Está anotado abajo.

### 4. Qué pregunta es del convenio y qué es de la ley

La prueba no es mirar el código, es contestar en voz alta:
**¿dónde tengo que ir a mirar para saber cuánto vale esto?**

- Si la respuesta es **`/admin`** → la pregunta es **del convenio**.
- Si la respuesta es el **Boletín Oficial** → la pregunta es **universal**.

| Del convenio | Universales |
|---|---|
| categoría, zona, años de antigüedad, afiliación al gremio | jornada, horas extras, aguinaldo, vacaciones, cónyuge, hijos, hijos con discapacidad |

La lista completa está en `lib/vocabularioConvenios.js`.

---

## Cómo se agrega una regla nueva

**Paso 0 — ¿de qué tipo es?** ¿Podrían dos convenios cargar números distintos?
- **Sí** → es del convenio: va a `reglas_calculo` y al panel. Seguí todos los pasos.
- **No** → es de ley: va a `parametrosLaborales.js`. Sólo los pasos 1, 2 y 6.

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
| `lib/calculoEmpleador.js` y `lib/parametrosLaborales.js` importan de `data/` | Regla 3 |
| Los recargos de la hora extra (1,5 y 2,0) están fijos. Hay convenios con el sábado al 100% | Regla 2 |
| El aguinaldo (50%) y el plus vacacional (/150) están fijos | Regla 2 |
| Jubilación 11%, PAMI 3% y obra social 3% están fijos en el motor, y un convenio no puede declarar otros | Regla 2 |
| La base de la obra social está fija; los dos motores viejos la tenían como opción, y Comercio y Gastronómicos elegían valores **distintos** | Regla 2 |
| Un adicional sólo puede ser un porcentaje, y siempre está prendido. No se puede hacer "adicional por título, sólo si es terciario" ni un adicional de monto fijo, aunque las retenciones sí lo aceptan | Modelo incompleto |
| Los dos convenios en Firestore todavía tienen `antiguedad.aplica_sobre` guardado, que ya nadie escribe | Se limpia al abrir cada convenio en `/admin` y guardarlo |
| `firestore.rules` niega toda colección que no esté declarada a mano, y **el archivo no se aplica solo**: lo que rige vive en la consola de Firebase | A tener en cuenta antes de mover un dato a la base |

**Ya saldado:** la jornada completa del convenio y el divisor de horas mensuales
salieron del motor y ahora se cargan desde el panel (13 de septiembre de 2026).
Eran el primer muro contra el que chocaba cualquier convenio que no fuera de 48
horas.

Cada línea de esta tabla es un convenio futuro que va a chocar. No hay que
arreglarlas todas ahora: hay que arreglar la que bloquee al próximo convenio que
quieras cargar, y tacharla de acá.

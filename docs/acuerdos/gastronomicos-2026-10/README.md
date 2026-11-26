# Gastronómicos: octubre y noviembre 2026, sin acuerdo nuevo

Los dos CSV de esta carpeta son las escalas de Gastronómicos (UTHGRA–FEHGRA,
CCT 389/04) de **octubre y noviembre 2026**. No salen de un acuerdo nuevo:
al 26/11/2026 UTHGRA y FEHGRA no firmaron el segundo tramo. Salen de lo que
el acta del primer tramo fija para ese caso. Decisión del dueño del
26/11/2026: publicarlos así, porque sin ellos el sitio liquida octubre y
noviembre con la escala de septiembre, que trae una suma no remunerativa que
ya no corresponde.

## Qué dice el acta

Acta Acuerdo Paritaria 2026/2027 UTHGRA–FEHGRA, CCT 389/04, firmada el
24/7/2026 y presentada el 28/7/2026 (RE-2026-72653200-APN-CGDTEYS#MCH). Las
partes la llaman "acuerdo provisional y transitorio". Es la misma que ya está
en la pestaña Acuerdos como "Acuerdo salarial UTHGRA-FEHGRA 2026-2027,
primer tramo: julio a septiembre 2026"
([PDF de UTHGRA](https://www.uthgra.org.ar/wp-content/uploads/2026/07/Acuerdo_Salarial_primer_tramo_2026_2027.pdf)).

- **PRIMERO:** la gratificación no remunerativa va en tres cuotas, sólo con
  los sueldos de julio, agosto y septiembre de 2026.
- **SEGUNDO, "Base próximo acuerdo":** "la base para establecer los salarios
  básicos con vigencia a partir del 01.10.2026, se conformará aplicando un
  8,03 % (ocho con tres centésimas por ciento) sobre los básicos
  remunerativos aplicables hasta el mes de septiembre/26. […] En caso de que
  al 15 de octubre de 2026 no se haya alcanzado un acuerdo salarial con
  aplicación al 1/10/2026 los valores aquí acordados como base de cálculo,
  se aplicarán como salarios básicos a partir del 1/10/2026, debiendo
  presentar las partes las correspondientes planillas, sin perjuicio del
  acuerdo que finalmente se celebre sobre la base definitiva de cálculo o el
  aumento para el período que acuerden sobre la misma."
- **CUARTO:** las partes se reúnen en octubre de 2026 para la paritaria del
  período 1/6/2026 a 31/5/2027.

## La cuenta

Para las 14 categorías: **básico = septiembre × 1,0803, redondeado al peso;
no remunerativo = 0.** Noviembre es igual a octubre: el acta no prevé otro
aumento hasta que haya acuerdo.

| Categoría | Septiembre: básico + no rem. | Octubre y noviembre |
|---|---|---|
| Escala A, Nivel 1 (Peón - Lavacopas) | 1.074.307 + 74.000 | 1.160.574 |
| Escala A, Nivel 2 (Mozo Mostrador - Cadete) | 1.141.004 + 78.000 | 1.232.627 |
| Escala A, Nivel 3 (Ayudante Cocina - Comis) | 1.220.868 + 83.000 | 1.318.904 |
| Escala A, Nivel 4 (Mucama - Medio Oficial) | 1.284.118 + 88.000 | 1.387.233 |
| Escala A, Nivel 5 (Cajero - Comis Cocina) | 1.356.517 + 93.000 | 1.465.445 |
| Escala A, Nivel 6 (Mozo - Maître) | 1.429.981 + 98.000 | 1.544.808 |
| Escala A, Nivel 7 (Jefe Brigada - Recepción) | 1.840.959 + 126.000 | 1.988.788 |
| Escala B, Nivel 1 (Peón - Lavacopas) | 1.038.120 + 71.000 | 1.121.481 |
| Escala B, Nivel 2 (Mozo Mostrador - Cadete) | 1.102.324 + 75.000 | 1.190.841 |
| Escala B, Nivel 3 (Ayudante Cocina - Comis) | 1.180.295 + 81.000 | 1.275.073 |
| Escala B, Nivel 4 (Mucama - Medio Oficial) | 1.217.642 + 83.000 | 1.315.419 |
| Escala B, Nivel 5 (Cajero - Comis Cocina) | 1.271.299 + 87.000 | 1.373.384 |
| Escala B, Nivel 6 (Mozo - Maître) | 1.384.689 + 95.000 | 1.495.880 |
| Escala B, Nivel 7 (Jefe Brigada - Recepción) | 1.538.297 + 105.000 | 1.661.822 |

Escala A y Escala B son las columnas "A" y "B" del Anexo I del acta, es
decir, la clase del establecimiento. Por el orden y la estructura, A sería la
escala IV del art. 11 del CCT (hoteles de 4 estrellas, restaurantes y
catering A) y B, la III (3 estrellas, restaurantes B y de tipo económico,
cafés y bares A, catering B).

## Contra qué se controló

- **UTHGRA Tucumán**, seccional oficial, publicó su
  [Anexo I de básicos de octubre 2026](https://www.uthgratucuman.com/wp-content/uploads/2026/10/Anexo_I_basicos_octubre_2026.pdf).
  Es otro convenio (el CCT 758/19, provincial), pero tiene los mismos básicos
  de septiembre y la misma cláusula del 8,03%. Los 14 importes de la tabla
  de arriba aparecen tal cual en ese anexo. Confirma la cuenta y el redondeo.
- **Una "planilla provisoria octubre 2026"** que publicó
  [Ignacio Online](https://www.ignacioonline.com.ar/uthgra-como-liquidar-los-sueldos-de-octubre-2026-mientras-sigue-la-negociacion-paritaria/)
  el 30/10/2026, sin membrete ni firmas, da entre $9 y $16 más por categoría
  (septiembre × 1,080309 en vez de × 1,0803). No es oficial y no coincide
  con el 8,03% del acta, así que no se usó.
- **Lo oficial, al 26/11/2026:** la página de escalas de UTHGRA y la de
  FEHGRA siguen mostrando sólo el primer tramo, y el sitio oficial
  [UTHGRA Cerca](https://uthgracerca.com.ar/salario) sigue mostrando
  septiembre en todas las seccionales del 389/04.
- **El ensayo contra la base:** `cargarMes.mjs` sin `--aplicar` crea 2026-10
  y 2026-11 y avisa que las 14 categorías suben 8,0% en octubre y que
  noviembre tiene el mismo básico que octubre. Ese aviso es esperado: el acta
  no prevé aumento en noviembre. Con los dos meses simulados en los fixtures
  pasan los tests.

## Qué pasa con el sueldo

Calculado con el motor, 48 horas, con la tabla de contribuciones de cada
mes (noviembre con la de `docs/acuerdos/contribuciones-2026-11`) y Ganancias
jul–dic 2026 (no corresponde en ningún caso):

| Caso | Septiembre: bruto / neto | Octubre y noviembre: bruto / neto |
|---|---|---|
| Escala A, Nivel 1, sin antigüedad, no afiliado | $1.310.654,54 / $1.119.563,63 | $1.415.900,28 / $1.132.720,22 |
| Escala B, Nivel 6, 5 años, afiliado | $1.744.708,14 / $1.475.867,97 | $1.884.808,80 / $1.498.423,00 |
| Escala A, Nivel 7, 10 años, no afiliado | $2.356.427,52 / $2.006.102,02 | $2.545.648,64 / $2.036.518,91 |

El bruto sube 8% pero el neto sólo entre 1,2% y 1,7%: deja de estar la
suma no remunerativa de septiembre, que no pagaba aportes.

## Cómo se carga

Hacé un respaldo antes (`respaldar.bat`). Desde la terminal, parado en el
repo:

```
node scripts/cargarMes.mjs docs/acuerdos/gastronomicos-2026-10
```

muestra qué haría. Con `--aplicar` al final pide la contraseña de admin y
publica los dos meses de una. Sin terminal: doble clic en `cargar-mes.bat` y
pegarle la ruta de esta carpeta. Después, `node scripts/capturarFixtures.mjs
gastronomicos-cct-389-04` para que los tests vean los meses nuevos.

## Pendiente

- **El acuerdo de verdad.** Cuando UTHGRA y FEHGRA firmen el segundo tramo,
  manda ese acuerdo. Si cambia la base o hay aumento desde octubre, se
  corrigen estos CSV (o se agregan los meses nuevos) y se vuelve a correr la
  carga, que reemplaza los meses. El acta avisa que puede haber diferencias
  retroactivas al 1/10/2026.
- **Diciembre.** Si sigue sin acuerdo, no hace falta cargarlo: la
  calculadora arranca en el último mes cargado anterior al actual
  (noviembre), con los mismos básicos. Pero la tabla de contribuciones se
  elige por ese período, así que conviene cargar diciembre igual a
  noviembre cuando salga la tabla de contribuciones de diciembre.
- **La homologación.** Al 26/11/2026 Trabajo no homologó ningún acuerdo de
  UTHGRA de 2026, tampoco este primer tramo: la elección de autoridades del
  sindicato está judicializada, y UTHGRA marchó el 16/11 para reclamarlo. La
  escala de julio a septiembre ya se había publicado igual.

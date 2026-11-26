# Camioneros: acuerdo del 18/9/2026 (septiembre 2026 a febrero 2027)

Los CSV de esta carpeta son las escalas de Camioneros (CCT 40/89) que ya
salieron de este acuerdo, cada una de una planilla del Sindicato de Choferes
de Camiones:

- **Octubre 2026**, `camioneros-2026-10.csv`: la planilla N° 247, vigente
  desde el 1/10/2026 y publicada el 14/10/2026 en
  [camioneros-ba.org.ar](https://www.camioneros-ba.org.ar/index.php/gremiales/salarios/escalas-salariales/2010-nueva-escala-salarial-octubre-2026).
  **Está publicada en el sitio desde el 29/10/2026** (con `cargarMes.mjs`,
  después del respaldo `respaldos/2026-10-29-174401` de esa PC); lo que
  quedó en la base es idéntico a este `carga.json`, y los fixtures ya se
  recapturaron.
- **Noviembre 2026**, `camioneros-2026-11.csv`: la planilla N° 248, vigente
  desde el 1/11/2026 y publicada el 8/11/2026 en
  [camioneros-ba.org.ar](https://www.camioneros-ba.org.ar/index.php/gremiales/salarios/escalas-salariales/2026-nueva-escala-salarial-noviembre-2026)
  (en la lista de escalas, "Nueva Escala salarial Noviembre 2026" lleva a la
  página "Última escala salarial"). La Federación publicó la misma escala
  el 18/11/2026 como
  [Planilla 11/26](https://www.fedcam.org.ar/index.php/gremiales/planillas-de-sueldos/planillas-de-sueldos/534-planilla-de-sueldos-noviembre-2026-2).
  **Está publicada en el sitio desde el 26/11/2026**, después del respaldo
  `respaldos/2026-11-26-132708`. Se cargó desde `/admin` (Escalas
  paritarias: Buscar, Subir CSV, los 12 valores del período), no con
  `cargarMes.mjs`, y lo que quedó en la base es idéntico, campo por campo, a
  lo que escribiría este `carga.json`. Los fixtures ya se recapturaron.

`camioneros-escala-2026-10.pdf` y `camioneros-escala-2026-11.pdf` son las
dos hojas de cada planilla, tal como las publicó el sindicato (en JPG), para
la pestaña Acuerdos.

Los meses que siguen del mismo acuerdo (diciembre a febrero) se agregan acá
cuando salga cada planilla: su CSV y su entrada en `carga.json`.

## Qué dice el acuerdo

Firmado el 18/9/2026 por la Federación Nacional de Trabajadores Camioneros
con FAETYL y FADEEAC; CATAC no firmó, pero le alcanza igual (art. 5 de la Ley
23.546). Homologado por la Disposición DI-2026-1277-APN-DNRYRT#MCH del
6/10/2026.

- **Primera:** $18.000 no remunerativos **por única vez** con el sueldo de
  septiembre 2026 (ya están en la escala de septiembre). Desde octubre se
  incorporan **$12.252,86 al básico del chofer de primera, y en proporción al
  de todas las categorías**.
- **Segunda:** aumentos de septiembre 2026 a febrero 2027 según las escalas de
  los Anexos A a F. El PDF que publica la Federación no trae los anexos: los
  importes salen de las planillas mensuales del sindicato.
- **Tercera:** revisión en la primera quincena de diciembre 2026 (si
  corresponde, una suma no remunerativa en diciembre que se incorpora en
  enero 2027) y otra en marzo 2027.
- **Cuarta:** la contribución solidaria extraordinaria a las obras sociales
  pasa a **$29.000 por trabajador**, a cargo del empleador, de septiembre 2026
  a febrero 2027.
- **Sexta a novena:** cosas de algunas ramas: 20% sobre la comida y el viático
  especial en caudales (ítem 5.1.23, en dos cuotas del 10%: septiembre 2026 y
  enero 2027), premio por presentismo en residuos patológicos e industriales
  especiales desde septiembre 2026 y en caudales desde febrero 2027 (en
  octubre son $68.644,05, la referencia 205 de la cartilla), y 8% para los
  peones especializados acompañantes de chofer en residuos.
- **Décima:** paz social mientras dure el acuerdo.

Fuentes: [el acuerdo](https://www.fedcam.org.ar/images/sampledata/ja_university/acuerdos/Acuerdo-septiembre2026-febrero2027.pdf),
[la homologación](https://www.fedcam.org.ar/images/sampledata/ja_university/acuerdos/homologacion-acuerdo-septiembre2026-febrero2027.pdf),
[la planilla 247](https://www.camioneros-ba.org.ar/index.php/gremiales/salarios/escalas-salariales/2010-nueva-escala-salarial-octubre-2026)
y la de septiembre, [planilla 246](https://www.camioneros-ba.org.ar/index.php/gremiales/salarios/ultima-escala-salarial).

## Qué cambia en octubre

- **Los 43 básicos** suben 2,82%: 1,7% sobre septiembre más los $12.252,86
  proporcionales. El chofer de primera pasa de $1.095.276,83 a
  $1.095.276,83 × 1,017 + $12.252,86 = **$1.126.149,40**.
- **No hay suma no remunerativa:** los $18.000 eran sólo de septiembre. La
  planilla 246 lo dice en su encabezado; la 247 ya no trae ninguna.
- **Los 12 valores del período** suben lo mismo (× 1,028187). Son los de zona
  general, como en los meses anteriores:

| Clave | Ítem de la planilla | Septiembre | Octubre |
|---|---|---|---|
| `comida` | 4.1.12 | 16.759,49 | 17.231,89 |
| `viatico_especial` | 4.1.13 | 8.409,88 | 8.646,93 |
| `pernoctada` | 4.1.14 | 19.520,15 | 20.070,36 |
| `km_hora_extra` | 4.2.3 (por km) | 87,62403 | 90,09389 |
| `km_viatico` | 4.2.4 (por km) | 87,62403 | 90,09389 |
| `permanencia_fuera_residencia` | 4.2.5 inc. a) | 59.146,64 | 60.813,81 |
| `simple_presencia` | 4.2.5 inc. b) | 31.002,78 | 31.876,66 |
| `cruce_frontera` | 4.2.17 | 40.732,04 | 41.880,15 |
| `ingreso_egreso_tierra_del_fuego` | 4.2.17, columnas coef. 1,2 y 1,4 | 46.445,35 | 47.754,51 |
| `adicional_bitrenes` | hoja 2, adicional bitrenes | 707.767,88 | 727.717,74 |
| `plus_vacacional_dia` | 3.3.2, por día de vacaciones | 25.584,83 | 26.305,99 |
| `choferes_larga_distancia_5_11_3a2` | cartilla, referencia 304 | 344.833,17 | 354.552,98 |

## Qué cambia en noviembre

- **Los 43 básicos** suben 1,7% sobre octubre, sin suma fija. El chofer de
  primera pasa de $1.126.149,40 a $1.126.149,40 × 1,017 = **$1.145.293,94**.
- **Las grúas de más de 35 t** no son exactamente octubre × 1,017: el
  sindicato arma cada tramo de grúa sobre el anterior y redondea en cada
  paso (de 10 a 20 t, × 1,10; los tres que siguen, × 1,04; los seis
  siguientes, × 1,05; más de 300 t, × 1,08). Por eso nueve básicos difieren
  de octubre × 1,017 en 2 a 5 centavos. Vale la planilla, y la cadena
  cierra al centavo en septiembre, octubre y noviembre.
- **No hay suma no remunerativa**, como en octubre.
- **Los 12 valores del período** suben 1,7%:

| Clave | Ítem de la planilla | Octubre | Noviembre |
|---|---|---|---|
| `comida` | 4.1.12 | 17.231,89 | 17.524,83 |
| `viatico_especial` | 4.1.13 | 8.646,93 | 8.793,93 |
| `pernoctada` | 4.1.14 | 20.070,36 | 20.411,56 |
| `km_hora_extra` | 4.2.3 (por km) | 90,09389 | 91,62549 |
| `km_viatico` | 4.2.4 (por km) | 90,09389 | 91,62549 |
| `permanencia_fuera_residencia` | 4.2.5 inc. a) | 60.813,81 | 61.847,64 |
| `simple_presencia` | 4.2.5 inc. b) | 31.876,66 | 32.418,56 |
| `cruce_frontera` | 4.2.17 | 41.880,15 | 42.592,11 |
| `ingreso_egreso_tierra_del_fuego` | 4.2.17, columnas coef. 1,2 y 1,4 | 47.754,51 | 48.566,34 |
| `adicional_bitrenes` | hoja 2, adicional bitrenes | 727.717,74 | 740.088,94 |
| `plus_vacacional_dia` | 3.3.2, por día de vacaciones | 26.305,99 | 26.753,19 |
| `choferes_larga_distancia_5_11_3a2` | cartilla, referencia 304 | 354.552,98 | 360.580,38 |

El premio por presentismo de la referencia 205 de la cartilla (que la
calculadora no usa) pasa de $68.644,05 a $69.811,00.

## Cómo se controló

La planilla sólo existe como imagen, así que los básicos se tipearon. Tres
controles para octubre, los tres sin diferencias:

1. **Cada fila contra sí misma.** La planilla trae cuatro números por
   categoría: el mensual, el jornal (mensual / 24) y las horas extra al 50% y
   al 100% (jornal / 8 × 1,5 y × 2). Los 172 números cierran al centavo.
2. **Cada básico contra septiembre.** Las 43 categorías dan septiembre ×
   1,028187 con a lo sumo un centavo de diferencia: es lo que pide la cláusula
   primera (los $12.252,86 en proporción) más el 1,7%.
3. **El ensayo contra la base**, el 29/10/2026: `cargarMes.mjs` sin
   `--aplicar` crea la escala 2026-10, no borra ninguna categoría (las 43 se
   llaman igual que en septiembre) y avisa que las 43 suben 2,8%. Los tests de
   invariantes corren en verde con octubre agregado a los fixtures.

Para noviembre, el 26/11/2026, sin diferencias:

1. **Cada fila contra sí misma:** los 172 números de la hoja 1 cierran al
   centavo (jornal = mensual / 24; horas extra = jornal / 8 × 1,5 y × 2).
2. **Contra octubre:** 34 básicos dan octubre × 1,017 al centavo y los 9 de
   las grúas de más de 35 t cierran con la cadena de tramos de arriba. Los 12
   valores del período (y la referencia 304 de la cartilla) dan octubre ×
   1,017.
3. **Una segunda lectura de la planilla, a ciegas**, sin ver la primera ni
   los números de octubre: coincide con la primera en las 172 cifras de la
   hoja 1 y en los 12 valores del período.
4. **Contra la Federación:** su Planilla 11/26 del 18/11/2026 es un PDF con
   texto ([el PDF](https://www.fedcam.org.ar/images/joomlart/escalas/planillanoviembre2026_2.pdf)),
   y sus 43 básicos y 12 valores coinciden al centavo con los de esta
   carpeta. Ojo si se lee con `pdftotext`: desde la grúa de 10 a 20 t los
   importes quedan corridos una fila respecto del nombre.
5. **El ensayo contra la base:** `cargarMes.mjs` sin `--aplicar` crea la
   escala 2026-11, reemplaza octubre por lo mismo, no borra ninguna
   categoría y avisa que las 43 suben 1,7%. Con noviembre agregado a los
   fixtures pasan los 941 tests.

## Cómo se carga

Hacé un respaldo antes (`respaldar.bat`). Desde la terminal, parado en el
repo:

```
node scripts/cargarMes.mjs docs/acuerdos/camioneros-2026-09-18
```

muestra qué haría. Con `--aplicar` al final pide la contraseña de admin y
publica las escalas con sus valores del período: crea noviembre y reemplaza
octubre por lo mismo. Sin terminal: doble clic en `cargar-mes.bat` y
pegarle la ruta de esta carpeta. El nombre del período y los valores del
período salen del `carga.json`: no hay nada que tipear. Después, `node
scripts/capturarFixtures.mjs camioneros-cct-40-89` para que los tests vean
el mes nuevo.

La tabla de contribuciones de octubre ya está publicada (FFEP $1.971 y bases
del art. 9 $146.759,98 / $4.769.631,49, las de la carga de Comercio del
27/10). La de noviembre (FFEP $2.010 y bases del art. 9 nuevas) se carga
aparte, desde `docs/acuerdos/contribuciones-2026-11`.

**A mano, desde `/admin`** (si no se puede usar la terminal): Escalas
paritarias → Camioneros → el período (`2026-11`) → Buscar → Subir CSV → en
Valores del período, las 12 claves de la tabla de noviembre con su importe →
Guardar y publicar.

**En la pestaña Acuerdos** quedaron cargadas el 29/10/2026 tres entradas:
"Escala salarial octubre 2026" (escala, 2026-10-01, con
`camioneros-escala-2026-10.pdf` de esta carpeta y la página de la planilla
247 como fuente), el acuerdo (acuerdo, 2026-09-18, vigencia "septiembre 2026
a febrero 2027") y su homologación (homologación, 2026-10-06, la Disposición
DI-2026-1277), estas dos con los PDF de la Federación de "Fuentes", arriba.
Cada mes que siga lleva su entrada de escala, como octubre. La de
noviembre se cargó el 26/11/2026: "Escala salarial noviembre 2026" (escala,
2026-11-01, vigencia "noviembre 2026", con `camioneros-escala-2026-11.pdf`
de esta carpeta), en
[/acuerdos/camioneros-cct-40-89/escala-salarial-noviembre-2026](https://liquidar.ar/acuerdos/camioneros-cct-40-89/escala-salarial-noviembre-2026).
De fuente lleva la página propia de la planilla 248
(`/escalas-salariales/2026-nueva-escala-salarial-noviembre-2026`), que
existe aunque la lista enlace a "Última escala salarial": esa otra cambia
cada mes.

## Para controlar en el sitio

Calculado con el motor, con las tablas de contribuciones de cada mes y
Ganancias jul–dic 2026 (en ninguno de los tres casos corresponde Ganancias):

| Caso | Septiembre: bruto / neto | Octubre: bruto / neto | Noviembre: bruto / neto |
|---|---|---|---|
| Conductor de primera, 44 h, 22 días, 5 años, no afiliado | $1.150.040,67 / $1.486.341,47 | $1.182.456,87 / $1.509.387,25 | $1.202.558,64 / $1.535.046,84 |
| Larga distancia, 8.000 km, 10 años, no afiliado | $1.975.895,98 / $2.306.457,37 | $2.031.590,57 / $2.351.722,15 | $2.066.127,65 / $2.391.701,48 |
| Peón, 20 días, 3 pernoctes, 2 años, afiliado | $1.020.336,08 / $1.380.720,87 | $1.049.096,30 / $1.401.328,07 | $1.066.930,93 / $1.425.150,66 |

El neto del conductor sube 1,55% y no 2,8% porque en octubre ya no están los
$18.000 de septiembre. En noviembre todo sube 1,7%. Noviembre se calculó el
26/11/2026 con la escala de esta carpeta y la tabla de contribuciones de
noviembre (`docs/acuerdos/contribuciones-2026-11`), las dos publicadas ese
día; la misma cuenta da octubre igual que la tabla de arriba.

## Pendiente

- **La asignación extraordinaria del mismo día** ("Bono Camioneros 2027" en
  la página de la Federación,
  [PDF](https://www.fedcam.org.ar/images/sampledata/ja_university/acuerdos/bono2027.pdf)):
  $1.200.000 no remunerativos en cuatro cuotas de $300.000, con los sueldos
  de enero a abril 2027, "sin que sea computable a ningún otro rubro". Es un
  acuerdo aparte, firmado también el 18/9/2026, y no está ni en la pestaña
  Acuerdos ni en el cálculo: cuando se carguen esos meses, la cuota tiene
  que entrar como suma no remunerativa de cada uno.
- **Diciembre a febrero.** Cuando el sindicato publique cada planilla, se
  agrega su CSV y su entrada en `carga.json`. Volver a correr la carga
  reemplaza los meses ya publicados por lo mismo: no pasa nada.
- **La descripción del convenio** (en `/admin` → Convenios) todavía dice
  "planillas 7/26 y 8/26 de la Federación (acta 25/6/2026)" y una contribución
  a OSCHOCA de $25.000: desde septiembre es de $29.000 (cláusula cuarta).
  Sigue sin calcularse, como antes.
- **Lo de las ramas que el acuerdo agrega** (ítem 5.1.23 de caudales,
  presentismo de residuos patológicos e industriales especiales, 8% de los
  acompañantes) tampoco se calcula, igual que el premio de logística y correo
  y los coeficientes zonales que ya figuran como pendientes.
- **Para el vigía, cuando tenga lector de Camioneros:** el sindicato publicó
  octubre en una página nueva y `ultima-escala-salarial`, la que hoy está en
  sus sondas, siguió mostrando septiembre. Con noviembre fue distinto: el
  ítem de la lista (`/index.php/gremiales/salarios/escalas-salariales`)
  enlaza a `ultima-escala-salarial`, no a una página propia
  `/escalas-salariales/<id>-…` como octubre (2010-…) y septiembre (2005-…).
  Un lector que busque ese patrón de link no lo ve: hay que leer el título de
  cada ítem de la lista y seguir su link, sea cual sea.
- **Lo que trae la cartilla y la calculadora no usa:** el bono de inicio de
  temporada de la rama Aguas, Gaseosas y Cervezas, con el sueldo de
  diciembre (referencia 501; la cartilla 248 no trae el importe), y el premio
  por presentismo de los distribuidores de Quilmes y CCU firmado el
  18/11/2026 (sin montos publicados). Son de rama: no tocan la escala
  general.

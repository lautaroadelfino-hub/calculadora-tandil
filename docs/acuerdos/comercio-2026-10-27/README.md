# Comercio: acuerdo del 27/10/2026 (octubre, noviembre y diciembre 2026)

Los tres CSV de esta carpeta son las escalas de Comercio (CCT 130/75) de
octubre, noviembre y diciembre de 2026, listas para subir en `/admin` →
**Escalas paritarias**. Están calculadas desde la escala de septiembre que hoy
está en producción, con la misma cuenta que usó la planilla firmada del
acuerdo de julio. FAECYS todavía no publicó las planillas del acuerdo nuevo:
cuando salgan, hay que compararlas (ver "Pendiente").

## Qué dice el acuerdo

Firmado el 27/10/2026 por FAECYS con CAC, CAME y UDECA:

- **5,7% no acumulativo en tres tramos de 1,9%**: octubre, noviembre y
  diciembre. Cada tramo se calcula sobre el básico de septiembre 2026 **más**
  la suma no remunerativa vigente en septiembre ($120.000), y va al básico.
- **Suma extraordinaria de $50.000**, no remunerativa y por única vez, en dos
  cuotas de $25.000: con el sueldo de octubre y con el de noviembre.
  Proporcional a la jornada.
- **La suma de $120.000 sigue**, y desde diciembre empieza a pasar al básico
  en seis cuotas de $20.000 (diciembre 2026 a mayo 2027), como ya estaba
  pactado: en diciembre el básico suma $20.000 y la suma baja a $100.000.
- Próxima revisión: enero 2027.

Fuentes: [Infobae](https://www.infobae.com/politica/2026/10/27/los-empleados-de-comercio-acordaron-un-nuevo-aumento-salarial-para-el-ultimo-trimestre-y-sumaran-un-bono-de-50-mil/),
[Tributum](https://tributum.news/acuerdo-27-10-2026-empleados-de-comercio-paritaria-cct-130-75-aumento-salarial-del-57-y-suma-extraordinaria-de-50-000/),
[Ignacio Online](https://www.ignacioonline.com.ar/empleados-de-comercio-aumento-del-57-y-un-bono-de-50-000-para-octubre-noviembre-y-diciembre-2026/),
[CAC](https://www.cac.com.ar/noticias/se-firmo-la-revision-paritaria-mercantil-5yny4),
[Calcular Sueldo (incorporación de los $120.000)](https://calcularsueldo.com.ar/sueldos/15517/sueldos-de-comercio-hasta-2027-cuando-y-como-se-incorporan-los-120-000-al-basico.html).

## La cuenta

Para cada categoría, con `B` = básico de septiembre 2026:

| Mes | Básico | No remunerativo | Sin incidencia |
|---|---|---|---|
| Octubre | B + 1 × 1,9% × (B + 120.000) | 120.000 | 25.000 |
| Noviembre | B + 2 × 1,9% × (B + 120.000) | 120.000 | 25.000 |
| Diciembre | B + 3 × 1,9% × (B + 120.000) + 20.000 | 100.000 | — |

Redondeado al peso. Es la misma cuenta que reproduce, desde junio, las
escalas de julio, agosto y septiembre cargadas desde la planilla firmada: 19
de las 21 categorías con menos de $0,50 de diferencia (la planilla trae
centavos que la base no guarda). Las otras dos, Auxiliar Especializado B y
Personal Auxiliar B, no cierran porque **junio 2026 está mal cargado en
producción**, no por la cuenta: julio en adelante están bien (ver
"Pendiente"). Los básicos de octubre coinciden al peso con la escala
estimada que publicó Ignacio Online (Maestranza A $1.208.674,
Administrativo A $1.221.648, Vendedor B $1.251.930, Vendedor D $1.279.611).

Lo único de los CSV que **no sale del acuerdo del 27/10** son los $20.000 de
diciembre: vienen del cronograma pactado en julio, que la prensa da por
vigente pero que nadie cita del acta nueva. Si la circular lo posterga, en
diciembre el básico de las 21 categorías baja $20.000 y la suma vuelve a
$120.000; el total no cambia, pero sí los aportes (Vendedor B, 48 h, 5 años:
neto $1.322.327,58 en vez de $1.318.927,58). Octubre y noviembre no dependen
de eso.

## Cuándo subir cada mes

La calculadora arranca siempre con el período **más nuevo que esté
cargado**, sin mirar el calendario, y la tarjeta de la portada dice ese mes.
Si se publica diciembre hoy, Comercio pasa a "Diciembre 2026" ya mismo y
quien liquida octubre tiene que elegirlo en el desplegable. Por eso, y por
la duda de los $20.000 de arriba: **octubre y noviembre ahora; diciembre el
1/12**, o antes si FAECYS publica las planillas y confirman la incorporación.

## Cómo se carga

Hacé un respaldo antes (`respaldar.bat`). Después, para cada mes, en
`/admin` → **Escalas paritarias** → Empleados de Comercio.

**Ojo con el nombre del período:** al buscar un mes nuevo el panel precarga
todo lo del mes anterior pero **no borra el nombre descriptivo** que quedó
escrito. Si cargás octubre y noviembre en la misma sesión y te salteás ese
paso, noviembre se publica como "Octubre 2026" y así aparece en la portada.

1. Período `2026-10` → **Buscar** (precarga septiembre) → **Subir CSV** →
   `comercio-2026-10.csv`.
2. Nombre del período: `Octubre 2026`.
3. En el campo del nombre de la suma sin incidencia (debajo del período):
   `Asignación Extraordinaria por Única Vez – Revisión Octubre 2026`.
   Es como aparece en el recibo. El nombre es provisorio (en julio la planilla
   decía "… – Revisión 2026"); cuando salga la nueva, usá el de ahí.
4. **Guardar y publicar**. El panel avisa que las 21 categorías suben 2,1%:
   es lo esperado.
5. Lo mismo con `2026-11` / `Noviembre 2026` (el nombre de la suma viene
   precargado de octubre; avisa que suben 2,0%) y `2026-12` /
   `Diciembre 2026`. En diciembre no hay suma sin incidencia: **borrá el
   nombre** que viene precargado de noviembre. Avisa que suben entre 3,5% y
   3,6%, porque se suman los $20.000 que dejan de ser no remunerativos.

## Para controlar en el sitio

Vendedor B, 5 años, jornada 48, no afiliado (los mismos datos del canario del
README), calculado con el motor sobre estas escalas:

| Mes | Bruto | Neto |
|---|---|---|
| Septiembre (hoy en producción) | $1.394.967,70 | $1.251.841,10 |
| Octubre | $1.424.065,99 | $1.300.265,23 |
| Noviembre | $1.453.163,15 | $1.323.688,44 |
| Diciembre | $1.505.011,38 | $1.318.927,58 |

Diciembre da un neto menor que noviembre aunque el bruto sube: se va la
cuota de $25.000 y los $20.000 que pasan al básico pagan aportes.

## Pendiente

- **Las planillas firmadas.** Cuando FAECYS publique la circular con las
  escalas, comparar básico por básico. Si alguna difiere en más de $1, manda
  la planilla: se corrige el CSV y se vuelve a publicar ese mes. Lo primero
  a mirar: diciembre, los $20.000 y los $100.000.
- **La tabla de contribuciones de octubre.** En la base hay hasta
  septiembre; octubre cae en esa con aviso en el recibo. Se carga desde
  Contribuciones → `2026-10` → Cargar valores oficiales → Guardar. El FFEP de
  octubre todavía no salió (el último conocido es el de septiembre, $1.935,
  Disposición SRT 9/2026): cuando la SRT lo publique, se agrega en
  `data/ffep.json` y se vuelve a cargar la tabla. Lo mismo para noviembre y
  diciembre a su tiempo.
- **Junio 2026 está mal en producción**, desde la carga del 20/5/2026:
  Personal Auxiliar B tiene el básico de abril ($1.102.315) y Auxiliar
  Especializado B tiene el que le correspondía a Personal Auxiliar B
  ($1.137.677). Por la progresión abril → mayo → julio, junio debería ser
  Personal Auxiliar B ≈ $1.137.677 y Auxiliar Especializado B ≈ $1.153.743.
  Sólo afecta las liquidaciones de junio; se corrige desde /admin con la
  circular de abril a julio a la vista.
- **El acuerdo en la pestaña Acuerdos**, con el PDF de FAECYS: título
  "Acuerdo paritario del 27 de octubre de 2026 (octubre, noviembre y
  diciembre 2026)", tipo acuerdo, fecha 2026-10-27, vigencia "octubre a
  diciembre 2026". Y la homologación, cuando salga.
- **Recapturar los fixtures** después de publicar
  (`node scripts/capturarFixtures.mjs comercio-cct-130-75`), para que los
  tests sobre datos actuales vean los meses nuevos.

## Auditoría del 28/10/2026, antes de subir

Dos revisiones separadas (una sin acceso a estas conclusiones), con el mismo
resultado:

- Los 63 básicos y las sumas de los tres CSV coinciden con la derivación
  independiente desde septiembre. Las lecturas alternativas del acuerdo
  (base sin los $120.000, acumulativo, el 1,9% de los $120.000 como no
  remunerativo) quedan descartadas por el texto "no acumulativo" y por la
  cuenta que FAECYS aplicó en julio; la única que queda abierta es la de
  diciembre.
- Los CSV pasan por el lector del panel sin errores ni advertencias, con las
  21 categorías con el mismo nombre que septiembre (ninguna se borra), y los
  avisos al publicar son los de arriba.
- Los tests de invariantes del repo corren en verde sobre los tres meses
  (207 tests: neto que cierra, nada negativo, el trabajador cobra lo mismo con
  y sin tabla de contribuciones, las líneas suman los totales con SAC,
  vacaciones, horas extras, jornada 24 y afiliado).
- Los netos de control dan igual calculados como lo hace el sitio, con
  Ganancias jul–dic 2026 y la tabla de contribuciones de septiembre.
  Ganancias no aparece, ni en diciembre con SAC.

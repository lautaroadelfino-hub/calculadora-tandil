# Google: qué está indexado y qué trae visitas

Lo que se ve en Search Console sobre liquidar.ar, con la fecha de cada
revisión, para poder comparar la siguiente. La propiedad es de dominio
(`liquidar.ar`, verificada por DNS) y está en la cuenta `info@liquidar.ar`.

## Cómo se revisa

En [Search Console](https://search.google.com/search-console), con esa cuenta:

- **Indexación → Páginas**: cuántas están indexadas y, de las que no, el
  motivo. Cada motivo se abre y lista las URLs.
- **Indexación → Sitemaps**: que `sitemap.xml` diga "Correcto", cuándo lo
  leyó Google por última vez y cuántas páginas encontró.
- **Rendimiento**, con la solapa Páginas y la solapa Consultas: de dónde
  vienen los clics. Es lo que dice si una página sin indexar importa.
- **Enlaces**: cuántos sitios enlazan a liquidar.ar.
- **Inspección de URLs** (la barra de arriba): el estado de una página y
  "Probar URL publicada", que dice si Google puede leerla hoy.

Los motivos que se van a ver siempre y no son un problema: "Página con
redirección" (`www.liquidar.ar` y `http://` redirigen a `https://liquidar.ar`)
y "No se ha encontrado (404)" para direcciones que nadie enlaza.

## Revisión del 27/11/2026

El informe de páginas tenía datos al 22/11. Google empezó a indexar el sitio
a mediados de octubre de 2026.

| | Páginas | Cuáles |
|---|---|---|
| Indexadas | 14 | La portada, las 3 calculadoras, `/acuerdos`, la lista de acuerdos de cada convenio y 6 acuerdos sueltos |
| Descubierta: actualmente sin indexar | 19 | Todas acuerdos sueltos. Google las conocía por el sitemap y nunca las visitó |
| Rastreada: actualmente sin indexar | 6 | `/novedades` y las tres `/novedades/<convenio>`, que estaban vacías; la escala de Camioneros de mayo 2026; `/favicon.ico` |
| Página con redirección | 2 | `www` y `http` |
| No se ha encontrado (404) | 2 | `/&` y `/$` |

El sitemap se leyó el 26/11 sin errores, con 40 URLs. La prueba en vivo de
un acuerdo sin indexar dio "la página se puede indexar": no había ningún
bloqueo técnico.

**De dónde venían los 184 clics** (desde mediados de octubre):

| Página | Clics | Impresiones | Posición media |
|---|---|---|---|
| `/calcular/camioneros-cct-40-89` | 142 | 1.050 | 4,9 |
| `/calcular/gastronomicos-cct-389-04` | 23 | 437 | 7,8 |
| `/` | 8 | 188 | 18,2 |
| `/calcular/comercio-cct-130-75` | 2 | 299 | 10,5 |
| Los 6 acuerdos sueltos indexados, sumados | 3 | 199 | casi todos en segunda página |

Las tres calculadoras traían 167 de los 184 clics. Las búsquedas eran
"calculadora camioneros", "calculadora sueldo camioneros" y "simulador recibo
de sueldo camioneros". **Enlaces externos: 0.**

### Lo que se concluyó

No era un problema de indexación: todo lo que traía visitas ya estaba
indexado. Las páginas de acuerdos no mostraban ningún número (el título, la
fecha y el botón del PDF), así que ni Google tenía por qué indexarlas ni la
gente por qué quedarse. Y el sitio es nuevo y nadie lo enlaza, que es la
situación en la que Google deja las páginas internas en "Descubierta".

### Lo que se cambió

- **La página de cada acuerdo muestra la escala de sus meses**: los básicos
  por categoría, la variación respecto del mes anterior y los viáticos. La
  regla de qué mes va en qué página está en `lib/escalasDeAcuerdo.js`.
- **Las novedades llevan un detalle** debajo del título, para contar qué
  cambió con cada acuerdo y cada escala. Una página de novedades vacía ya no
  se indexa ni va al sitemap.
- **El sitemap no mueve fechas solo.** La calculadora de Comercio decía que
  había cambiado "recién" en cada lectura, porque su escala más nueva era de
  un mes futuro y esa fecha se reemplazaba por la hora del pedido. Ahora va
  el primer día del mes en curso. Y las páginas de acuerdos que pasaron a
  mostrar la escala llevan la fecha de ese cambio.

### Lo que quedó pendiente

- **Enlaces.** Es lo que más pesa y no se arregla desde el código: la web del
  estudio, perfiles, colegas.
- **La calculadora de Comercio** tiene muchas impresiones y casi ningún clic
  (posición 10,5). Es el convenio más grande y el que peor rinde.
- **Gastronómicos, octubre y noviembre de 2026**: están en la calculadora
  pero no en ninguna página de acuerdos, porque salen del acta de julio y no
  de un documento propio.
- **Comercio, junio de 2026**: dos categorías están mal cargadas (ver
  `docs/acuerdos/comercio-2026-10-27/README.md`, "Pendiente"). Ahora se ve en
  la página "Escalas salariales abril a julio 2026".

## Para la próxima revisión

Mirar primero Rendimiento → Páginas: si los acuerdos sueltos empiezan a
sumar impresiones y clics, el cambio sirvió. El número de "sin indexar"
importa menos: va a bajar solo, y despacio.

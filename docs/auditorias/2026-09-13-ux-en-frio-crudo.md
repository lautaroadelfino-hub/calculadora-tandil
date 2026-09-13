# Auditoría en frío del 13 de septiembre de 2026

Fecha: 2026-09-13 · Sitio: https://liquidar.ar

Auditoría hecha por personas simuladas sin contexto del proyecto (ver `README.md` en esta carpeta). Los hallazgos de severidad media o más los intentó reproducir un verificador fresco; sólo los reproducidos cuentan como confirmados.

## Resumen ejecutivo

- Confirmados: **12** (bloqueantes 0, altos 12, medios 0, bajos 0).
- No reproducidos por el verificador: 0.
- De severidad baja, sin verificar: 72.
- Personas: 6; completaron su tarea: 6.

## Lo que dijo cada persona

### Empleado de comercio que quiere saber cuánto le queda en mano

Tarea completada: sí · minutos: 28 · hallazgos reportados: 13

> Entré sin saber qué era el sitio y en 5 segundos entendí que era una calculadora de sueldo: el título dice "Simulá tu recibo de sueldo en segundos" y abajo hay tres tarjetas de convenios. Encontré el mío sin saber el nombre técnico porque dice "Empleados de Comercio" (el "CCT 130/75" lo ignoré). Cargué Vendedor B, 48 horas y 3 años y en un clic me dio el número: $1.227.994,60 de neto a cobrar para septiembre 2026. Lo que me costó fue leerlo: el recibo arranca con una tabla larga de lo que paga el empleador (SIPA, INSSJP, FFEP, detracción Ley 27.541) y el primer número grande que ves es "Costo laboral total $1.907.953,50", que no es mi plata; tuve que bajar mucho para llegar a "Neto a cobrar". Me quedó desconfianza con dos cosas: que me descuenten dos veces 2% del sindicato si me pongo afiliado, y que el mismo recibo muestre dos importes distintos de ART.

Funcionó bien:

- En 5 segundos entendí para qué sirve: el título 'Simulá tu recibo de sueldo en segundos' y las tres tarjetas de convenios con un botón 'Comenzar' son clarísimos.
- Encontré mi convenio sin saber el nombre técnico: la tarjeta dice 'Empleados de Comercio' en grande y 'CCT 130/75' chiquito abajo. Trabajo en un local de ropa, así que fue obvio.
- La lista de categorías tiene 'Vendedor B' con ese nombre exacto, que es como me lo dijeron en el laburo. No tuve que traducir nada.
- Las horas semanales ya venían en 48, que es justo mi caso, así que no tuve que adivinar.
- En los campos que no entendí (Régimen de contribuciones, Alícuota de ART) hay una ayudita debajo que dice 'Si no sabés, dejá el que está: es el de la mayoría de los empleadores' y 'La típica de esta actividad es 5%'. Eso me destrabó.
- El número final está en un recuadro verde grande que dice 'Neto a cobrar $1.227.994,60'. Cuando llegás ahí, no hay confusión posible sobre cuál es el número.
- El bloque 'CÓMO SE HIZO ESTA CUENTA' me gustó: dice de dónde salió cada cosa, y aclara 'Simulación orientativa... No reemplaza el recibo oficial'. Eso me dio confianza en vez de quitármela.
- En celular (marco de 400 px) la calculadora se acomoda en una sola columna, se puede completar todo y el recibo aparece justo abajo del botón. Me dio el mismo número que en la computadora.
- El recuadro de la derecha dice antes de calcular 'Tu recibo va a aparecer acá', así que sabés dónde mirar.

Preguntas que le quedaron:

- ¿El número que me dio, $1.227.994,60, es lo que me tienen que depositar este mes, o es lo que cobraría si el mes fuera perfecto? Yo un día llegué tarde y me sacaron el presentismo: en la calculadora el 'Presentismo' viene puesto siempre y no encontré manera de sacarlo, así que no sé cómo comparar con mi recibo de verdad.
- ¿Cómo sé si soy 'Afiliado al Sindicato (SEC)'? No tengo idea, y el tilde cambia el neto en $30.000. Mi recibo dice un montón de siglas, pero no encontré en el sitio qué tengo que buscar en el recibo para saber si tildarlo o no.
- ¿Qué pongo en 'Días de vacaciones (plus vacacional)' si no me tomé vacaciones? Dejé 0 porque no se me ocurrió otra cosa, pero no sé si eso es correcto.
- ¿Y si mi sueldo básico no coincide con el que el sitio pone solo? No hay ningún lugar donde cargar lo que dice mi recibo para compararlo, que era la mitad de lo que fui a buscar.
- ¿Quién hace este sitio? Abajo sólo dice '© 2026 LiquidAR.ar' y 'Versión v1.5.0'. No encontré un 'Quiénes somos' ni un contacto, y estoy por creerle una cuenta de plata.
- En el recibo que me armó no aparece ningún descuento de Impuesto a las Ganancias. ¿Es porque no me corresponde, o porque no lo calculó? No lo dice en ningún lado.
- Aparte: en mi navegador la rueda del mouse no movía la página (tuve que moverla de otra manera). No sé si es problema del sitio o de la herramienta con la que estoy navegando, así que lo dejo como duda y no como hallazgo.

### Contador que liquida sueldos y quiere verificar dos recibos

Tarea completada: sí · minutos: 28 · hallazgos reportados: 17

> Entré sin saber qué era y en dos minutos entendí la propuesta: elegís convenio, cargás datos y sale un recibo estimado. Pude armar los dos casos completos —el chofer de larga distancia de Camioneros con 8.000 km y 12 extras al 50%, y el mozo Nivel 6 con medio aguinaldo— y la aritmética me cerró al centavo en los dos, cosa que no esperaba. Lo que no me cierra es la trazabilidad: la tabla del empleador muestra base y porcentaje fila por fila, pero los haberes y las retenciones del trabajador no muestran ninguna base, y ahí encontré dos líneas con el mismo "3%" que usan bases distintas sin decirlo. Peor todavía: la antigüedad de Camioneros contradice el supuesto que el propio recibo escribe al pie, la de Gastronómicos no se mueve entre 5 y 6 años, y los porcentajes del gráfico de "costo laboral" están calculados sobre otro denominador. Con esto no firmo nada: me sirve para tener un orden de magnitud y para discutir con el cliente, pero para verificar un recibo de verdad me faltan las bases de cada línea, las actas de las escalas y alguna forma de guardar o imprimir lo que calculé.

Funcionó bien:

- La aritmética cierra sola en los dos recibos: sumé a mano remunerativos, no remunerativos, retenciones y el subtotal de contribuciones y todo dio exacto hasta el centavo (Camioneros neto $2.304.416,10; Gastronómicos $2.274.229,03). No encontré un solo error de suma.
- La tabla "Contribuciones a cargo del empleador" es exactamente lo que quiero ver: concepto, base de cálculo, unidad e importe, fila por fila. Ojalá el resto del recibo estuviera hecho así.
- Se declara la detracción de la Ley 27.541 ($7.003,68) y se ve que se aplica a SIPA, PAMI, asignaciones y FNE pero no a obra social, que es lo correcto.
- El bloque "Cómo se hizo esta cuenta" existe y es honesto en varios puntos: dice el divisor de horas usado (192 en Camioneros, 200 en Gastronómicos), que la ART del 5% es estimada, de qué mes es la tabla de contribuciones y hasta admite que las 48 hs de Gastronómicos son un "valor por defecto" y no un dato del convenio.
- La leyenda "Un recibo real lleva además CUIT del empleador, CUIL, fecha de ingreso..." y el sello ESTIMADO dejan claro que esto no reemplaza el recibo oficial. No se vende como lo que no es.
- El formulario de Camioneros es sorprendentemente completo para la actividad: plus por combustibles, peligrosos, blindados, larga distancia por kilómetro, noches fuera de residencia. Se nota que alguien leyó el convenio.
- Cada tarjeta de la home dice hasta qué mes están cargadas las escalas, y el selector de período solo ofrece los meses que efectivamente tiene cargados.
- A 400 px el sitio se acomoda bien: el menú pasa a hamburguesa, los campos se apilan y no hay desborde horizontal.
- No apareció ni un solo cartel de alerta en todo el recorrido, y no vi errores de carga: las dos calculadoras respondieron en menos de dos segundos.

Preguntas que le quedaron:

- ¿De dónde sale la escala de antigüedad de Gastronómicos? 5 y 6 años pagan lo mismo (4%), 7 paga 5%, 10 paga 6% y 20 paga 14%. Necesito el acta o el artículo del CCT que fija esos tramos.
- En Camioneros, ¿por qué el ítem 4.2.3 "Horas extraordinarias por km recorrido" ($688.597,52, más que el propio básico) entra en la base de antigüedad pero NO en el valor hora de las horas extras al 50%? Un colega me lo cuestionaría en dos minutos.
- ¿Por qué el valor hora de Camioneros se calcula sobre 192 hs mensuales si la jornada del convenio es de 44 hs semanales? Con el criterio habitual (semanas x 25/6) darían 183,33. Está declarado, pero no dice de dónde sale el 192.
- ¿Cuál es el precio por kilómetro que usó? Los dos ítems por km (4.2.3 y 4.2.4) dieron el mismo importe exacto, $688.597,52 por 8.000 km ($86,07 por km cada uno). ¿Es así el convenio o es que ambos leen la misma celda de la tabla?
- ¿Por qué la obra social del trabajador se calcula sobre remunerativo + no remunerativo en Gastronómicos y solo sobre remunerativo en Camioneros? ¿Es una decisión por convenio o una diferencia no querida?
- ¿Se evaluó Impuesto a las Ganancias en estos casos y dio cero, o directamente no se calculó? Con un bruto de $2,8 M no me alcanza con el silencio.
- ¿De qué fecha son exactamente las escalas de agosto 2026 de Camioneros y de septiembre 2026 de Gastronómicos, y cuál es el acta o resolución de cada una? La home menciona un "acta 25/6/2026" para Camioneros pero el recibo no la cita.
- ¿Por qué la tabla de Ganancias es la de julio de 2026 si estoy liquidando septiembre? ¿Es que no hubo actualización o es que falta cargarla?
- El SAC lo calculó como el 50% de la remuneración de este mes. ¿Cómo lo trataría si el mejor sueldo del semestre fuera otro? ¿Y por qué me deja incluir medio aguinaldo en septiembre sin ningún aviso?
- ¿Qué zonas cubren la Escala A y la Escala B de Gastronómicos?

### Dueño de una PyME que quiere saber cuánto le cuesta un empleado

Tarea completada: sí · minutos: 26 · hallazgos reportados: 13

> Entré sin saber qué era y la home me habló como si yo fuera el empleado ("Simulá tu recibo de sueldo"), así que casi me voy pensando que no era para mí. Entré igual a Empleados de Comercio y ahí sí apareció un bloque "LO QUE PAGA EL EMPLEADOR" que me preguntó las dos cosas que yo no sabía (régimen y alícuota de ART) y me dijo qué dejar si no sabía: eso me salvó. Llegué al número que buscaba: un Administrativo A, jornada completa, sin antigüedad, en septiembre 2026 me cuesta $1.810.875,61 por mes, de los cuales $1.426.346,94 es el bruto del recibo y $384.528,66 son cargas mías; el empleado se lleva $1.166.309,23 de bolsillo. Me quedaron dudas serias: la ART me aparece con dos importes distintos en la misma pantalla, y si cambio un dato el recibo viejo se queda ahí como si nada, sin avisarme que ya no corresponde. Y no encontré manera de ver el costo anual ni el aguinaldo prorrateado, que es lo que yo necesito para decidir si lo tomo.

Funcionó bien:

- Entrar a la calculadora es de un solo clic desde la home y el formulario viene todo precargado con valores razonables (48 hs, 0 años de antigüedad), así que pude calcular sin saber nada.
- El bloque 'LO QUE PAGA EL EMPLEADOR' está separado y explicado en criollo: 'Si no sabés, dejá el que está: es el de la mayoría de los empleadores' y 'La típica de esta actividad es 5%'. Fue exactamente la ayuda que necesitaba en las dos únicas preguntas que no sabía contestar.
- El 'Costo laboral total' aparece ARRIBA del bruto, no escondido al final. Es la primera cifra grande del recibo y es justo la que yo buscaba.
- La tabla de contribuciones desglosa concepto por concepto con la base de cálculo y el porcentaje al lado (SIPA 10,77%, PAMI 1,58%, Asignaciones familiares 4,7%, FNE 0,95%, obra social 6%, ART 5%, más dos sumas fijas). Sumé a mano el subtotal $384.528,66 y me dio exacto.
- Cambiar el régimen de 18% a 20,40% cambió el total de $1.810.875,61 a $1.841.819,86, y la diferencia se corresponde con el 2,4% extra. Me dio confianza de que la cuenta reacciona bien.
- El bloque 'CÓMO SE HIZO ESTA CUENTA' al final dice de qué mes es cada tabla que usó y aclara que la ART es estimada. Para alguien que va a mostrarle esto al contador, está bueno.
- La aclaración 'El Impuesto a las Ganancias no integra el costo laboral: es un impuesto del trabajador que el empleador sólo retiene' me sacó una duda que efectivamente tenía.
- En pantalla de celular (400 px) se ve todo bien: no hay que desplazar para los costados, la tabla de contribuciones entra y el menú pasa a hamburguesa.
- El formulario de 'Reportar error / sugerencia' muestra un desplegable 'Ver contexto técnico que se enviará' antes de mandar nada. Me gustó que me dejen ver qué se envía.

Preguntas que le quedaron:

- ¿Cuánto me cuesta ese empleado al AÑO? Marqué 'Incluir SAC (medio aguinaldo)' y el mes saltó a $2.647.019,65, pero el aguinaldo se paga dos veces al año, no todos los meses. No hay ningún lugar que me dé el costo anual ni el mensual con el aguinaldo prorrateado, que es el número con el que yo decido si puedo tomarlo.
- ¿Cuál de las dos cifras de ART es la que le tengo que decir a mi productor de seguros: $64.817,37 o $66.441,37?
- ¿Con 6 empleados soy 'MiPyME' a los efectos del 18%, o eso depende de la facturación? La ayuda dice 'dejá el que está: es el de la mayoría', pero no me dice cómo confirmarlo.
- La casilla 'Afiliado al Sindicato (SEC)': si la tildo, ¿cambia algo de lo que pago YO o sólo lo que se le descuenta a él? Los descuentos ya traen 'Aporte Solidario Gremial 2%' con la casilla destildada y no entendí qué agrega tildarla.
- ¿El costo laboral incluye la provisión de las vacaciones pagas? Hay un campo 'Días de vacaciones (plus vacacional)' pero no sé si eso me suma costo anual aparte.
- ¿Cada cuánto actualizan las escalas? Vi 'Escalas hasta Septiembre 2026' en la tarjeta, pero si firman una paritaria en octubre, ¿me entero por algún lado o tengo que volver a mirar?
- ¿Qué pasa si el empleado es part-time, digamos 30 hs semanales? Vi el campo 'Horas Semanales' pero no llegué a probar si las sumas fijas (FFEP, seguro de vida) se prorratean o se pagan enteras.
- ¿Puedo guardar o imprimir esto para mostrárselo al contador? Vi 'Descarga del recibo en PDF' listado como 'Próximas actualizaciones', así que entiendo que todavía no.

### Usuario que entra desde el celular

Tarea completada: sí · minutos: 27 · hallazgos reportados: 10

> Entré desde el celular sin saber qué era esto y en menos de un minuto entendí el trato: elegís convenio, cargás cuatro datos y te muestra un recibo estimado. La portada y las tarjetas de convenio están bien resueltas en angosto, y el recibo en sí se lee prolijo. Lo que me frustró fue el camino: bajé más de tres pantallas hasta el botón \"Calcular\" pasando por campos que son del empleador y no míos, y otras tres hasta el \"Neto a cobrar\", que es lo único que fui a buscar. Dos cosas me parecieron serias: la tabla de contribuciones del empleador esconde la columna de importes fuera de pantalla sin avisar que se desliza, y si dejo vacío o en cero el campo de horas calcula igual y el resumen me afirma una jornada completa que yo nunca cargué. El resto son roces: mucho aire desperdiciado arriba de cada página, el título y la ✕ del formulario de reporte tapados por la barra verde, y la lista de categorías de Camioneros ordenada alfabéticamente, con la de 110 toneladas antes que la de 20. No mandé ningún formulario ni entré a /admin.

Funcionó bien:

- El menú hamburguesa abre y cierra bien: los dos ítems (Calculadora, Novedades) son grandes, con buen contraste, y tocarlos lleva a donde dicen.
- No hay scroll horizontal en ninguna página: nada se me escapa hacia el costado salvo la tabla del hallazgo R1, que está dentro de su propio recuadro.
- El recibo en sí se lee muy bien en angosto: "Haberes remunerativos", "No remunerativos" y "Descuentos y retenciones" son concepto a la izquierda e importe a la derecha, sin cortes ni encimados.
- Después de tocar "Calcular" el resultado aparece justo abajo del botón, sin saltos raros ni recarga: no tuve que buscar dónde quedó.
- Los campos traen valores por defecto razonables (48 hs, 0 de antigüedad, ART 5%) y textos de ayuda honestos como "Si no sabés, dejá el que está: es el de la mayoría de los empleadores".
- El bloque "Cómo se hizo esta cuenta" y el aviso de que es una simulación orientativa que no reemplaza el recibo oficial me dieron confianza.
- Las tarjetas de convenio de la portada son grandes, fáciles de tocar con el pulgar, y cada una avisa hasta qué mes están cargadas las escalas.
- Novedades carga rápido y se lee cómodo: una tarjeta por novedad, con etiqueta (release/acuerdo) y fecha, de la más nueva a la más vieja.

Preguntas que le quedaron:

- ¿Por qué la calculadora me pide datos que son del empleador (régimen de contribuciones, alícuota de ART, cuota fija de ART) si yo sólo quiero saber cuánto cobro? ¿No convendría esconderlos atrás de un "opciones avanzadas"?
- Si dejo vacías las horas y el sitio asume jornada completa, ¿asume también otras cosas sin decirlo? Me quedé sin saber cuánto de lo que muestra es lo que cargué y cuánto lo completó él.
- ¿Se puede guardar, compartir o mandar por WhatsApp el resultado? Después de calcular no encontré ningún botón para eso, y es lo primero que querría hacer desde el celular.
- El pie dice "Versión v1.5.0" y las novedades están fechadas en 2026, pero no encontré quién está atrás del sitio ni una página de contacto más allá del formulario de reporte. ¿Quién lo hace?
- Vi "3 convenios con escalas cargadas" y las novedades hablan de Hoteles y Gastronomía y de Camioneros. ¿Cada cuánto se actualizan las escalas, y cómo me entero de que la que usé quedó vieja?
- En el código de la página aparece una barra flotante con "Admin" y "Salir" (el enlace apunta a /admin), aunque no llegó a verse en pantalla. ¿Debería estar ahí para alguien que entra de visita? No entré a esa ruta.

### Auditor de accesibilidad

Tarea completada: sí · minutos: 28 · hallazgos reportados: 16

> Entré sin saber qué era y en dos minutos entendí el sitio: una calculadora de sueldos por convenio, con tres convenios cargados y un listado de novedades. Pude completar y disparar un cálculo de Empleados de Comercio usando sólo el teclado, y el modal de reporte de errores me sorprendió para bien: atrapa el foco, cierra con Escape y lo devuelve al botón que lo abrió. Ese cuidado no llegó al formulario principal: los quince campos de la calculadora no tienen ni un label asociado, así que un lector de pantalla anuncia \"0, edición\" cuatro veces seguidas sin decir cuál es horas extras al 50% y cuál al 100%. Y lo más grave para mi criterio: cuando el recibo aparece, no se anuncia nada —no hay una sola región aria-live en toda la página—, con lo cual el resultado, que es todo el motivo del sitio, le llega en silencio a quien no ve la pantalla. Sumado a eso, el foco desaparece dos veces al empezar a tabular (una barra Admin invisible que sigue siendo enfocable, y lo mismo con el menú de celular plegado) y los rótulos de sección y toda la microcopia de ayuda están en un gris de 2,6:1 que a 11 px cuesta leer aun con buena vista. Son arreglos chicos y bien localizados; la base estructural (encabezados, landmarks salvo el main duplicado, lang, alt) está mucho mejor de lo que suelo encontrar.

Funcionó bien:

- El modal "Reportar error / sugerencia" está muy bien hecho para teclado: se abre con Enter desde el botón, el foco entra solo en el primer campo, el Tab da la vuelta dentro del modal sin escaparse, Escape lo cierra y el foco vuelve exactamente al botón que lo abrió. Tiene role=dialog, aria-modal=true y aria-labelledby apuntando a un título que sí existe.
- Los dos campos del modal (email y descripción) sí están envueltos en <label>, así que ahí sí hay nombre accesible. Es el patrón correcto que falta en la calculadora.
- Se puede completar y enviar el cálculo entero SÓLO con teclado: Tab hasta el selector de categoría, flechas para elegir, Tab y escribir la antigüedad, Enter, y el recibo se genera. Ningún control exige mouse.
- El orden de Tab dentro del formulario sigue el orden visual (arriba a abajo, izquierda a derecha en las filas de dos columnas) y la página va acompañando el foco con scroll.
- Las tarjetas de convenio de la portada tienen un outline de foco de 3 px bien oscuro, perfectamente visible, y su nombre accesible incluye convenio, CCT y hasta qué mes están las escalas.
- El botón de menú de celular está bien construido: texto sr-only "Abrir menú", aria-expanded que cambia de false a true, aria-controls apuntando al menú y el ícono SVG con aria-hidden=true.
- La jerarquía de encabezados no tiene saltos: h1 único y descriptivo por página, h2 por sección y h3 dentro del recibo. En /novedades cada novedad es un h2 bajo el h1 "Novedades".
- El único <img> de la página (el logo) tiene alt="LiquidAR" y no encontré ningún botón ni enlace sin nombre accesible (fuera del caso oculto de R3).
- El documento declara lang="es", lo que hace que el lector use la voz correcta.
- A 400 px de ancho la página se reordena en una sola columna sin desbordes horizontales (scrollWidth 364 sobre 394 de ancho) y no hay que hacer scroll lateral.
- El sitio no tira ningún alert(), confirm() ni prompt(): window.__alertas quedó vacío en las tres páginas que recorrí.
- El texto explicativo es claro en lenguaje llano ("Si no sabés, dejá el que está: es el de la mayoría de los empleadores") y el bloque "Cómo se hizo esta cuenta" transparenta los supuestos del cálculo.

Preguntas que le quedaron:

- ¿La barra flotante con "Admin" y "Salir" tendría que existir en la página para alguien que no inició sesión? Yo entré sin sesión y aunque está invisible, sus controles están en el HTML y reciben foco con Tab.
- ¿El recibo se puede guardar o compartir? Vi "Descarga del recibo en PDF" en "Próximas actualizaciones", así que supongo que todavía no; para alguien con lector de pantalla poder exportarlo sería la forma más cómoda de releerlo.
- Cuando cambio un dato del formulario después de haber calculado, ¿el recibo que sigue en pantalla queda desactualizado? No vi ningún aviso de "estos números ya no corresponden", y sin anuncio sonoro nadie se enteraría.
- El campo "Cuota fija de la ART" dice "si tu póliza la tiene": ¿qué pasa si no la tiene, se deja en 0 o vacío? El texto de ayuda no lo aclara y además está en el gris que casi no se lee.
- ¿Por qué la fecha de una misma novedad difiere un día entre la portada y /novedades? ¿Cuál de las dos es la correcta?
- ¿Hay algún plan de que las novedades tipo "release" enlacen a la calculadora que anuncian?

### Usuario que carga cualquier cosa y toca todo

Tarea completada: sí · minutos: 28 · hallazgos reportados: 15

> Entré sin saber qué era y en dos minutos entendí el sitio: elegís convenio, completás cuatro datos y te arma un recibo estimado, bastante bien explicado. Lo apreté a propósito (campos vacíos, ceros, negativos, 200 años de antigüedad, 1.000 horas extras, texto en campos numéricos) y aguantó sin romperse: nunca vi un NaN, un neto negativo ni una pantalla en blanco, y nunca me saltó un cartel de alerta del navegador. Lo que me preocupa es otra cosa: dos veces me quedé mirando un botón que no hacía nada sin decirme por qué (basta escribir 36,5 en horas semanales, o un negativo en un campo que quedó lejos), y sobre todo que si cambio el período después de calcular, el recibo cambia el título al mes nuevo pero deja los pesos del mes viejo, sin avisar. Eso es lo más peligroso que encontré, porque no parece un error: parece un resultado. Después hay cosas más chicas pero feas de ver: un mensaje que me manda a /admin, una 404 negra en inglés y las fechas de las novedades corridas un día entre el inicio y /novedades.

Funcionó bien:

- Calcular sin tocar nada funciona de una: entrás, apretás "Calcular liquidación" y sale un recibo completo con valores por defecto sensatos (48 hs, Administrativo A, el mes corriente). No te obliga a completar nada antes.
- En ningún momento vi un NaN, un undefined, un $0,00 fuera de lugar ni un neto negativo, y eso que cargué 200 años de antigüedad, 1.000 horas extras, 999 pernoctes y números negativos. Tampoco vi una pantalla en blanco ni un error crudo en inglés dentro de la calculadora.
- Los negativos y los vacíos no rompen nada: se toman como 0 (o como el valor por defecto) y el cálculo sigue.
- El recibo explica de dónde salen los números. La sección "CÓMO SE HIZO ESTA CUENTA" dice qué tabla de Ganancias usó, de qué mes son las contribuciones, que la ART es estimada y cuánto sale la hora y el día. Y avisa cuando tuvo que usar la tabla de otro mes ("Ojo: no hay tabla de contribuciones de abril de 2026. Se usó la de septiembre de 2026, que puede tener otras bases o alícuotas"), que es exactamente lo que promete el inicio.
- La aclaración de que es una estimación está bien puesta y repetida: el sello "ESTIMADO" arriba del recibo, la línea de que un recibo real lleva CUIT y CUIL, y el cierre "No reemplaza el recibo oficial emitido por el empleador".
- El formulario de reporte de errores se porta bien: tiene el email como opcional, deja ver antes qué se manda, se cierra con Cancelar o con la X sin ningún cartel molesto, y si lo vuelvo a abrir conserva lo que había escrito. No perdí el texto.
- En 400 px la calculadora se usa perfecto: una sola columna, menú hamburguesa, la página no se va de costado y se puede calcular entero desde el celular (salvo la tabla de contribuciones, R7).
- Cada tarjeta del inicio dice hasta qué mes tiene escalas cargadas ("Escalas hasta Agosto 2026"), y cuando entrás a Camioneros el período arranca en Agosto 2026, no en Septiembre. Es un detalle chico que muestra que el dato es real.
- Las categorías y los adicionales están escritos como los conoce la gente del gremio, con el número de ítem del convenio al lado ("Adicional transporte de caudales (20%, ítem 5.1.13)"), así que se pueden chequear.
- El sitio nunca me tiró un cuadro de alerta del navegador: window.__alertas quedó vacío en todas las páginas que recorrí.

Preguntas que le quedaron:

- ¿Por qué en el código de la página hay un link "Admin" que apunta a /admin y un botón "Salir", si yo nunca inicié sesión? En la pantalla no llegué a verlos dibujados en la barra de arriba (ahí solo se ven "Calculadora" y "Novedades"), pero están puestos en la página. No entré a /admin. Puede ser que este navegador ya tuviera una sesión abierta de antes y por eso aparezcan, no lo puedo afirmar.
- Si cambio el período y el recibo no se actualiza del todo (R1), ¿el sitio espera que yo vuelva a apretar Calcular? Porque nada me lo dice, y el encabezado sí se actualiza, así que parece que ya está listo.
- ¿Por qué las horas semanales no admiten decimales si media jornada de 36,5 o 37,5 hs es de lo más común? ¿Es a propósito o se les coló?
- ¿Qué significa exactamente "Régimen de contribuciones" y cómo sé cuál me toca? El texto dice "si no sabés, dejá el que está", pero no dice qué cambia en mi recibo si elijo mal. Probé los dos y el neto del trabajador no se movía; parecería que solo afecta lo que paga el empleador, pero no estoy seguro.
- En el inicio dice "3 convenios con escalas cargadas" y la novedad del 13/09 anuncia Camioneros, pero otra novedad de noviembre anuncia "Hoteles y Gastronomía (UTGHRA–FEHGRA)" y en la lista la tarjeta se llama "Gastronómicos (UTHGRA)", con las siglas escritas distinto en cada lado (UTHGRA vs UTGHRA). ¿Son lo mismo?
- El bloque "Próximas actualizaciones" promete calculadora de aguinaldo, de indemnización y descarga del recibo en PDF, pero no hay ninguna fecha ni forma de avisarme cuando salgan. ¿Hay manera de enterarse?
- ¿Por qué el recibo dice "Ganancias: tabla de julio de 2026" cuando estoy liquidando septiembre de 2026? Lo avisa, que está bien, pero no me queda claro si eso hace que el número esté mal o si es lo correcto.

## Hallazgos confirmados

| Severidad | Tipo | Dónde | Observado | Sugerencia | Lo vio | Evidencia |
|---|---|---|---|---|---|---|
| **alta** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — panel del recibo (columna derecha en escritorio, debajo del botón en celular) | El recibo empieza con 'CONTRIBUCIONES A CARGO DEL EMPLEADOR': una tabla de 8 filas con SIPA, INSSJP, FFEP, Seguro Colectivo de Vida, 'detracción', porcentajes y bases de cálculo. El primer número grande y en negrita que aparece es 'Costo laboral total $1.907.953,50', que no es mi sueldo ni se parece. Recién después vienen mis haberes y, mucho más abajo, 'Neto a cobrar $1.227.994,60'. Medí en la vista de celular de 400 px: desde el título 'Simulación de recibo' hasta 'Neto a cobrar' hay unos 1.700 px, casi 3 pantallas de scroll. Un compañero que mire rápido se puede llevar el 1.9 millones en la cabeza. | Poner el 'Neto a cobrar' arriba de todo, apenas termina el encabezado del recibo, y dejar las contribuciones del empleador abajo o plegadas en un '¿Cuánto le cuesto a mi empleador?' que se abra si uno quiere. Si igual quieren mostrar el costo laboral primero, aclarar al lado en letra normal: 'Esto no es tu sueldo'. | empleado | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789337629367-50.jpg (recibo recién calculado: arranca con 'CONTRIBUCIONES A CARGO DEL EMPLEADOR', las 8 filas y el cierre 'Costo laboral total $1.907.953,50'; 'HABERES REMUNERATIVOS' apenas asoma al pie). Mediciones de posición tomadas en pantalla: celular 394 px → 'Simulación de recibo' y=2030, 'Costo laboral total' y=3022, 'Neto a cobrar' y=3799 (1.769 px de diferencia); escritorio 1366 px → y=352, y=1009 y y=1670 (1.318 px). Tamaños: costo laboral 14px/700, neto 30px/900.` |
| **alta** | funcional | https://liquidar.ar/calcular/camioneros-cct-40-89 — bloque "CÓMO SE HIZO ESTA CUENTA" vs. "HABERES REMUNERATIVOS" del recibo | La antigüedad da $107.591,04, que es exactamente el 10% del básico solo. Los $543.935,26 no remunerativos quedaron afuera, mientras el pie del recibo afirma lo contrario. Es decir: el supuesto escrito y el número no coinciden. | O corregir el cálculo, o corregir la leyenda por convenio. Y mejor: poner la base al lado de la línea ("Antigüedad · 1% x 10 años sobre $1.075.910,44"), como ya se hace en la tabla del empleador. | contador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789337773335-52.jpg (recibo: Sueldo Básico $1.075.910,44, Antigüedad $107.591,04, no remunerativos $362.189,30 + $181.745,96). Complemento con el pie del recibo: C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789337764553-51.jpg ("CÓMO SE HIZO ESTA CUENTA": "Las sumas no remunerativas generan antigüedad, presentismo y adicionales.")` |
| **alta** | funcional | https://liquidar.ar/calcular/camioneros-cct-40-89 — tabla "CONTRIBUCIONES A CARGO DEL EMPLEADOR", fila "Obra social (contribución 6%)" | La base que muestra es $2.058.367,62 (solo el total remunerativo) y el importe $123.502,06. Deja afuera el viático no remunerativo de $688.597,52, o sea ~$41.316 menos de contribución. En la calculadora de Gastronómicos la misma fila sí usa rem + no rem ($2.800.664,09), así que una de las dos está mal. | Unificar el criterio entre convenios y, si en Camioneros es a propósito, cambiar el texto de la columna a "Remunerativo" para que la etiqueta no contradiga el número. | contador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789337916133-53.png (zoom de la tabla CONTRIBUCIONES A CARGO DEL EMPLEADOR: se ve la fila "Obra social (contribución 6%)" con base $2.058.367,62, leyenda "Remunerativo + no remunerativo" e importe $123.502,06)` |
| **alta** | funcional | Los dos recibos — bloque "COMPOSICIÓN DEL COSTO LABORAL" | Los porcentajes son sobre la suma de las cargas (sindical + seg. social + OS + PAMI + ART + otros), no sobre el costo laboral. Suman 100% entre ellos. Decirle a un cliente que la seguridad social es el 51,7% de su costo laboral es un error grueso y el gráfico invita a eso. | Cambiar el título a "Composición de las cargas sociales" o recalcular los % sobre el costo laboral total. Y aclarar el denominador en una línea al pie del bloque. | contador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789338086320-54.jpg` |
| **alta** | funcional | https://liquidar.ar/calcular/gastronomicos-cct-389-04 — línea "Antigüedad" de HABERES REMUNERATIVOS | Con 5 y con 6 años da exactamente $57.199,24 y el neto no se mueve ($2.274.229,03). Probando más valores: 5→4% del básico, 6→4%, 7→5%, 10→6%, 20→14%. Es una escala por tramos que no está escrita en ninguna parte y que además no es lineal. Sin la regla a la vista no hay forma de auditar la línea, y de entrada parece un error. | Mostrar el tramo aplicado en la propia línea ("Antigüedad · tramo 5-6 años: 4% sobre $1.429.981,00") y linkear la fuente del tramo. | contador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789338299957-56.jpg — se ve en la misma pantalla el campo "Años de Antigüedad" en 6 (izquierda) y la línea "Antigüedad $57.199,24" sobre "Sueldo Básico $1.429.981,00" (derecha), el mismo importe que con 5 años.` |
| **alta** | ux | Los dos recibos — bloques HABERES REMUNERATIVOS, HABERES NO REMUNERATIVOS y DESCUENTOS Y RETENCIONES | Los haberes no muestran ni base ni porcentaje ni valor unitario: "Antigüedad $176.450,80", "Horas extraordinarias por km recorrido (8000 km) $688.597,52", "Horas Extras 50% (12 hs) $117.408,87" — sin valor por km ni valor hora. Las retenciones muestran solo el %, sin la base, y ahí está lo peligroso: en Gastronómicos "Ley 19.032 PAMI (3%)" da $81.079,92 y "Obra Social (3%)" da $84.019,92; el mismo 3% con dos bases distintas (una sobre remunerativo, la otra sobre rem + no rem) y el recibo no lo dice. No hay tooltips. | Agregar a haberes y retenciones las mismas columnas BASE / UNIDAD que ya existen en la tabla del empleador. Es el cambio que más haría por la confianza del recibo. | contador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789338462592-57.jpg — se ve en la misma pantalla la fila del empleador "ART (estimada) $1.498.873,13 Remunerativo 5% $74.943,66" (con base y porcentaje) y, debajo, los bloques del trabajador: HABERES REMUNERATIVOS sin base ni unidad, y DESCUENTOS Y RETENCIONES con "Ley 19.032 PAMI (3%) − $44.966,19" y "Obra Social (3%) − $47.186,19".` |
| **alta** | ux | Los dos formularios — el recibo de la derecha queda desactualizado respecto de los campos | El recibo queda idéntico, sin ninguna marca, y en la misma pantalla conviven un dato de entrada y un resultado que no se corresponden. Si estoy comparando escenarios y me distraigo, copio un número que no es el del caso que tengo cargado. | Al detectar un cambio en el formulario, atenuar el recibo y mostrar "Los datos cambiaron — recalculá" sobre el bloque de resultados. | contador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789338755111-59.jpg (captura única: a la izquierda "Años de Antigüedad: 20", a la derecha la cabecera del recibo "Antigüedad: 10 años" con los importes anteriores)` |
| **alta** | funcional | https://liquidar.ar/calcular/comercio-cct-130-75 — panel del recibo a la derecha | El recibo queda idéntico: sigue diciendo 'ART (estimada) 5% $64.817,37' y 'Costo laboral total $1.841.819,86', sin ninguna marca de que está desactualizado, mientras el campo en pantalla dice 12. Me pasó lo mismo al cambiar el régimen de contribuciones de 18% a 20,40%: el recibo siguió mostrando 'Régimen: Resto de actividades y MiPyME (18%)'. Es el error más fácil de cometer acá: mirás el número de la derecha creyendo que corresponde a lo que tenés escrito a la izquierda, y no. | Al primer cambio en cualquier campo, atenuar el recibo y poner arriba un aviso 'Datos modificados — volvé a calcular', o directamente recalcular al vuelo. | empleador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789338891272-60.jpg` |
| **alta** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — bloque "CONTRIBUCIONES A CARGO DEL EMPLEADOR" del resultado | En 400 px sólo entran "CONCEPTO" y "BASE DE CÁLCULO". Las columnas "UNIDAD" e "IMPORTE" quedan afuera y no hay ninguna señal de que la tabla se desliza. Si la deslizo aparecen los importes pero desaparece el nombre del concepto, así que nunca veo los dos juntos: veo "$145.843,14" sin saber de qué es. Es la única tabla del recibo con este problema. | En pantallas angostas mostrar estas contribuciones como fichas apiladas (concepto arriba, importe grande abajo, base y alícuota en chico), igual que "HABERES REMUNERATIVOS", en vez de una tabla de 4 columnas. | celular | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789339054490-62.jpg — marco de 400 px (borde rojo) con la tabla ya arrastrada hacia la izquierda: se ven base, porcentaje e importe, y la columna "Concepto" desapareció por completo, así que los importes quedan sin nombre.` |
| **alta** | funcional | https://liquidar.ar/calcular/camioneros-cct-40-89 y /calcular/comercio-cct-130-75 — campo "Horas semanales" | Calcula igual, sin ningún aviso, y el recibo afirma "Jornada: 44 hs de 44 semanales" (en Comercio, "48 hs de 48 semanales") con el sueldo básico entero. O sea: el resumen dice un dato que yo no cargué. Comprobé que el campo sí funciona cuando pongo un número (con 24 hs en Comercio el básico bajó a la mitad y el resumen dijo "24 hs"), así que el problema es sólo con vacío y con 0. Alguien que trabaja medio tiempo y borra el campo se va con un neto de jornada completa creyendo que es el suyo. | Hacer el campo obligatorio y rechazar el 0; si se decide seguir asumiendo la jornada completa, decirlo en el recibo con un aviso visible ("no cargaste horas: se calculó jornada completa de 44 hs"). | celular | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789339167859-63.jpg (Camioneros: a la izquierda el campo "Horas semanales" vacío, a la derecha el recibo ya calculado diciendo "Jornada: 44 hs de 44 semanales")` |
| **alta** | accesibilidad | https://liquidar.ar/calcular/comercio-cct-130-75 — panel izquierdo, los 15 campos del formulario (Período a liquidar, Categoría, Horas Semanales, Años de Antigüedad, Horas Extras 50/100, Días de vacaciones, Régimen de contribuciones, Alícuota de ART, Cuota fija de ART, Cónyuge, Hijos...) | El texto visible ("Categoría", "Horas Semanales (Jornada)", "Alícuota de ART"...) está en un <span>/<div> hermano sin ninguna relación programática. El lector anuncia sólo el valor actual: "Administrativo A, cuadro combinado", "48, edición", "0, edición", "0, edición", "5, edición". Con cuatro campos numéricos seguidos que dicen "0" es imposible saber cuál es horas extras al 50% y cuál al 100%. Lo mismo en /calcular/camioneros-cct-40-89 (15 de 25 campos sin label). | Poner id en cada control y <label for="..."> en el texto que ya está escrito, o envolver el control con el <label> (como ya hacen bien con los checkboxes "Afiliado al Sindicato" e "Incluir SAC"). Es el mismo texto, sólo cambia la etiqueta HTML. | accesibilidad | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789339320058-64.jpg — muestra las cuatro casillas numéricas consecutivas (48, 0, 0, 0) cuyo texto ("Horas Semanales (Jornada)", "Años de Antigüedad", "Horas Extras al 50%", "Horas Extras al 100%") está sólo arriba, sin vínculo con el campo. Además, el árbol de accesibilidad devuelve literalmente: combobox "Septiembre 2026" y combobox "Administrativo A", sin ningún nombre de campo; y los 9 inputs numéricos no aparecen con nombre. En /calcular/camioneros-cct-40-89: 25 controles, 15 sin vínculo.` |
| **alta** | accesibilidad | https://liquidar.ar/calcular/comercio-cct-130-75 — columna derecha, el recibo que aparece tras "Calcular liquidación" | No hay ninguna región viva en toda la página y el foco no se mueve. Quien usa lector de pantalla pulsa Enter, no oye absolutamente nada y no tiene forma de saber si el cálculo se hizo, si falló o si se está cargando. Tiene que salir a explorar la página a ciegas para descubrir que apareció contenido nuevo. Es justo la información por la que entró al sitio. | Envolver el contenedor del recibo en role="status" aria-live="polite" con un resumen corto al principio, o mover el foco al h2 "Simulación de recibo" (tabindex="-1") después de calcular. | accesibilidad | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789339452233-65.jpg (recibo ya generado en la columna derecha con "Antigüedad: 7 años" mientras el cursor sigue en el campo "Años de Antigüedad" con el 7 tipeado). Consultas ejecutadas en la página: document.querySelectorAll('[aria-live],[role=status],[role=alert],[role=log],[aria-busy],[role=progressbar]').length = 0; document.querySelectorAll('[tabindex="-1"]').length = 0; document.activeElement = INPUT name="antiguedad_años" value="7".` |

### empleado:R1 · alta · ux

**Dónde:** https://liquidar.ar/calcular/comercio-cct-130-75 — panel del recibo (columna derecha en escritorio, debajo del botón en celular)

**Pasos:**

1) Entrar a liquidar.ar. 2) Tocar 'Comenzar' en la tarjeta 'Empleados de Comercio'. 3) Elegir Categoría 'Vendedor B', Años de Antigüedad 3, Horas Semanales 48. 4) Tocar 'Calcular liquidación'. 5) Leer el recibo desde arriba hacia abajo.

**Esperado:** Que lo primero que vea sea cuánto me queda en mano, porque es lo único que fui a buscar.

**Observado:** El recibo empieza con 'CONTRIBUCIONES A CARGO DEL EMPLEADOR': una tabla de 8 filas con SIPA, INSSJP, FFEP, Seguro Colectivo de Vida, 'detracción', porcentajes y bases de cálculo. El primer número grande y en negrita que aparece es 'Costo laboral total $1.907.953,50', que no es mi sueldo ni se parece. Recién después vienen mis haberes y, mucho más abajo, 'Neto a cobrar $1.227.994,60'. Medí en la vista de celular de 400 px: desde el título 'Simulación de recibo' hasta 'Neto a cobrar' hay unos 1.700 px, casi 3 pantallas de scroll. Un compañero que mire rápido se puede llevar el 1.9 millones en la cabeza.

**Sugerencia:** Poner el 'Neto a cobrar' arriba de todo, apenas termina el encabezado del recibo, y dejar las contribuciones del empleador abajo o plegadas en un '¿Cuánto le cuesto a mi empleador?' que se abra si uno quiere. Si igual quieren mostrar el costo laboral primero, aclarar al lado en letra normal: 'Esto no es tu sueldo'.

**Evidencia:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789332936216-15.jpg`

**Verificador:** reproducido · severidad propia: media · Seguí los pasos tal cual (liquidar.ar → 'Comenzar' en Empleados de Comercio → Vendedor B, 3 años, 48 hs → 'Calcular liquidación') y el orden del recibo es exactamente el que describe: después del título 'Simulación de recibo' y una ficha con convenio/período/categoría/jornada, lo primero que aparece es 'CONTRIBUCIONES A CARGO DEL EMPLEADOR' con 8 filas (SIPA, INSSJP, Asignaciones familiares, FNE, Obra social, FFEP, Seguro Colectivo de Vida, ART), y ese bloque cierra con 'Costo laboral total $1.907.953,50'. Recién después vienen HABERES REMUNERATIVOS ($1.226.349,00 de básico), los no remunerativos, los descuentos y al final 'Neto a cobrar $1.227.994,60'. Los dos importes que cita coinciden al centavo.

También verifiqué la distancia: en la vista de 400 px (marco de 394 px de ancho útil) medí desde 'Simulación de recibo' (y=2030) hasta 'Neto a cobrar' (y=3799) = 1.769 px, o sea ~2,8 pantallas de 640 px. En escritorio (1366 px) son 1.318 px. La medición de "unos 1.700 px" es correcta.

Dónde matizo: el '$1.907.953,50' NO es el número más grande de la página. Medí los estilos: 'Costo laboral total' y su importe son de 14 px en negrita, del mismo tamaño que el resto de la tabla; el 'Neto a cobrar $1.227.994,60' se muestra en 30 px con peso 900 en escritorio (24 px en celular), y es con diferencia el texto más grande de todo el recibo. Así que el "primer número grande y en negrita" está exagerado: es el primer subtotal en negrita, pero visualmente pesa mucho menos que el neto. Además el bloque no es un descuido: la página aclara "Desde el 01/06/2026 el recibo muestra las contribuciones del empleador", con opciones propias (régimen de contribuciones, alícuota y cuota fija de ART), o sea es una función buscada, y cada importe está bien rotulado.

Aun así el problema existe y lo comparto: quien entra a una calculadora de sueldos va a buscar el neto, y el neto está sepultado al final de tres pantallas detrás de una tabla que habla de plata que no es suya. En el celular, entre que el panel del recibo queda debajo del formulario y que el bloque del empleador va primero, hay que scrollear 1.883 px desde el botón 'Calcular liquidación' hasta ver el neto. El riesgo de que alguien se lleve 1,9 millones en la cabeza es real aunque el número esté bien explicado.

Le bajo de alta a media: no hay error de cálculo, no hay dato mal rotulado, la tarea se completa y el neto está presente, correcto y tipográficamente destacado; lo que hay es un orden de lectura que pone lo secundario primero. Es fricción clara, no una confusión con dato equivocado. Un resumen fijo arriba del recibo ('Neto a cobrar' + bruto + costo laboral) lo resolvería sin tocar el detalle.

Otras dos cosas que vi de paso, fuera del alcance de este reporte: (1) en la barra superior de la página del cálculo aparecen un enlace 'Admin' (a /admin) y un botón 'Salir' sin que yo haya iniciado sesión — solo lo anoto, no entré; (2) el recibo dice 'Jornada: 48 hs de 48 semanales' y la nota al pie aclara el valor hora sobre 200 hs mensuales, lo cual está bien explicado.

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789337629367-50.jpg (recibo recién calculado: arranca con 'CONTRIBUCIONES A CARGO DEL EMPLEADOR', las 8 filas y el cierre 'Costo laboral total $1.907.953,50'; 'HABERES REMUNERATIVOS' apenas asoma al pie). Mediciones de posición tomadas en pantalla: celular 394 px → 'Simulación de recibo' y=2030, 'Costo laboral total' y=3022, 'Neto a cobrar' y=3799 (1.769 px de diferencia); escritorio 1366 px → y=352, y=1009 y y=1670 (1.318 px). Tamaños: costo laboral 14px/700, neto 30px/900.`

**Lo reportó:** empleado

### contador:R1 · alta · funcional

**Dónde:** https://liquidar.ar/calcular/camioneros-cct-40-89 — bloque "CÓMO SE HIZO ESTA CUENTA" vs. "HABERES REMUNERATIVOS" del recibo

**Pasos:**

1) Entrar a la calculadora de Camioneros. 2) Dejar Conductor de primera categoría, 44 hs, Agosto 2026. 3) Poner 10 en Años de Antigüedad. 4) NO tildar "chofer de larga distancia". 5) Calcular liquidación. 6) Mirar la línea Antigüedad y después el último bloque "Cómo se hizo esta cuenta".

**Esperado:** Si el recibo declara "Las sumas no remunerativas generan antigüedad, presentismo y adicionales", la antigüedad se tiene que calcular sobre el básico más los no remunerativos: $1.075.910,44 + $181.745,96 (viático) + $362.189,30 (comida) = $1.619.845,70 → 10% = $161.984,57.

**Observado:** La antigüedad da $107.591,04, que es exactamente el 10% del básico solo. Los $543.935,26 no remunerativos quedaron afuera, mientras el pie del recibo afirma lo contrario. Es decir: el supuesto escrito y el número no coinciden.

**Sugerencia:** O corregir el cálculo, o corregir la leyenda por convenio. Y mejor: poner la base al lado de la línea ("Antigüedad · 1% x 10 años sobre $1.075.910,44"), como ya se hace en la tabla del empleador.

**Evidencia:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789334452506-29.jpg`

**Verificador:** reproducido · severidad propia: alta · Se reproduce tal cual. Pasos: entré a https://liquidar.ar/calcular/camioneros-cct-40-89 (la página tarda unos segundos mostrando "Conectando con la base de datos..."), dejé Agosto 2026, Conductor de primera categoría y 44 hs, puse 10 en "Años de Antigüedad", NO tildé "¿Es chofer de larga distancia?" y toqué "Calcular liquidación".

Lo que muestra el recibo:
- HABERES REMUNERATIVOS: Sueldo Básico $1.075.910,44 · Antigüedad $107.591,04
- HABERES NO REMUNERATIVOS: Comida (ítem 4.1.12) (22 días) $362.189,30 · Viático especial (ítem 4.1.13) (22 días) $181.745,96 · Total no remunerativo + $543.935,26
- Neto a cobrar $1.484.818,94
- Último bloque "CÓMO SE HIZO ESTA CUENTA", segunda viñeta: "Las sumas no remunerativas generan antigüedad, presentismo y adicionales."

La antigüedad ($107.591,04) es exactamente el 10% del básico solo ($1.075.910,44). Si valiera la frase del pie, con los no remunerativos adentro daría $161.984,57 (10% de $1.619.845,70), unos $54.000 más. O sea: el supuesto escrito y el número no coinciden. Confirmo el hallazgo de la otra persona.

Por qué le dejo "alta" y no "media": es una calculadora de sueldos, el número es todo el producto, y acá el propio sitio explica la cuenta de una manera y la hace de otra. Como usuario no tengo forma de saber cuál de las dos está bien, y la diferencia es plata concreta en el recibo. No es bloqueante porque la liquidación se completa y se ve entera.

Detalle extra que noté (no es el hallazgo, pero apoya la confusión): la propia tabla de contribuciones del empleador distingue bases con cuidado —Obra social 6% se calcula sobre "$1.183.501,48 Remunerativo + no remunerativo"—, así que el sitio sí sabe sumar los no remunerativos cuando quiere. Eso hace más raro que la antigüedad los ignore justo donde el pie dice que no los ignora.

Lo que funcionó bien: el recibo es claro, cada línea dice su base de cálculo y su alícuota, y el bloque de "cómo se hizo" es una buena idea (por eso duele que contradiga al número). Supongo, sin poder verificarlo desde la pantalla, que la frase del pie es un texto fijo que se muestra siempre y no refleja lo que el cálculo hace en este convenio.

Pregunta que me queda: ¿cuál es la correcta, la frase o el número? Si la correcta es el número (antigüedad sobre básico), lo que hay que arreglar es el texto del pie; si la correcta es la frase, está mal el cálculo y también quedaría por revisar el "presentismo y adicionales" que menciona.

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789337773335-52.jpg (recibo: Sueldo Básico $1.075.910,44, Antigüedad $107.591,04, no remunerativos $362.189,30 + $181.745,96). Complemento con el pie del recibo: C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789337764553-51.jpg ("CÓMO SE HIZO ESTA CUENTA": "Las sumas no remunerativas generan antigüedad, presentismo y adicionales.")`

**Lo reportó:** contador

### contador:R2 · alta · funcional

**Dónde:** https://liquidar.ar/calcular/camioneros-cct-40-89 — tabla "CONTRIBUCIONES A CARGO DEL EMPLEADOR", fila "Obra social (contribución 6%)"

**Pasos:**

1) Camioneros, Agosto 2026, Conductor de primera, 10 años, 12 hs extras al 50%, afiliado al sindicato. 2) Tildar "chofer de larga distancia" y poner 8000 km. 3) Calcular. 4) Leer la fila "Obra social (contribución 6%)" y compararla con el subtotal "Remuneración bruta + no remunerativo".

**Esperado:** La columna dice "Remunerativo + no remunerativo", así que la base debería ser $2.746.965,14 (los mismos $2.746.965,14 que el recibo muestra tres filas más abajo como "Remuneración bruta + no remunerativo"), y la contribución $164.817,91.

**Observado:** La base que muestra es $2.058.367,62 (solo el total remunerativo) y el importe $123.502,06. Deja afuera el viático no remunerativo de $688.597,52, o sea ~$41.316 menos de contribución. En la calculadora de Gastronómicos la misma fila sí usa rem + no rem ($2.800.664,09), así que una de las dos está mal.

**Sugerencia:** Unificar el criterio entre convenios y, si en Camioneros es a propósito, cambiar el texto de la columna a "Remunerativo" para que la etiqueta no contradiga el número.

**Evidencia:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789333858155-20.png`

**Verificador:** reproducido · severidad propia: alta · Se reproduce exactamente, con los mismos números que reportó la otra persona.

Pasos que seguí (1 minuto): entrar a https://liquidar.ar/calcular/camioneros-cct-40-89 (esperar unos segundos, la página muestra "Conectando con la base de datos..."), dejar Agosto 2026 y "Conductor de primera categoría", poner Años de Antigüedad = 10, Horas Extras al 50% = 12, tildar "Afiliado al sindicato de Camioneros (cuota 3%)", tildar "¿Es chofer de larga distancia (más de 100 km)?", poner 8000 en "Kilómetros recorridos en el mes (larga distancia)", y apretar "Calcular liquidación".

Lo que vi en la tabla CONTRIBUCIONES A CARGO DEL EMPLEADOR:
- Obra social (contribución 6%) → base $2.058.367,62, con la leyenda "Remunerativo + no remunerativo", unidad 6%, importe $123.502,06.
- Tres filas más abajo, el subtotal "Remuneración bruta + no remunerativo" dice $2.746.965,14.
- En el recibo: "Total remunerativo $2.058.367,62" y "Total no remunerativo + $688.597,52". O sea que la base que usa la fila de obra social es EXACTAMENTE el total remunerativo solo; el no remunerativo (viático por km, $688.597,52) queda afuera, a pesar de que el propio renglón dice "Remunerativo + no remunerativo".
- 6% de $2.746.965,14 daría $164.817,91; la diferencia contra lo que muestra es de $41.315,85.

Lo que me convence de que es un error y no una interpretación: la contradicción es visible dentro de la misma pantalla, sin saber nada de leyes. El renglón anuncia una base y usa otra. Y la fila de al lado, ART (estimada), usa esa misma cifra pero está rotulada "Remunerativo" a secas, que sí coincide.

También verifiqué la comparación con Gastronómicos: en https://liquidar.ar/calcular/gastronomicos-cct-389-04, apretando "Calcular liquidación" con los valores que vienen por defecto, la fila "Obra social (contribución 6%)" muestra base $1.384.654,54 con la leyenda "Remunerativo + no remunerativo", mientras que la fila ART, rotulada "Remunerativo", muestra $1.310.654,54. Es decir, ahí la base de obra social sí suma $74.000 de no remunerativo. Las dos calculadoras hacen cosas distintas con el mismo concepto y el mismo rótulo.

No puedo saber desde la pantalla cuál de las dos es la correcta según el convenio (eso lo supongo fuera de mi alcance), pero una de las dos está mal, y el rótulo de Camioneros describe algo que el número no hace. Como el sitio se vende como "simulación de recibo" y el total de abajo, "Costo laboral total $3.393.095,68", arrastra ese número, un empleador que use esto se lleva un costo subestimado sin ninguna señal de alerta.

Por qué "alta" y no "bloqueante": la tarea se completa, el recibo sale entero y el resto de las filas cierra. Pero el resultado es incorrecto o al menos incoherente consigo mismo, y no hay forma de que el usuario lo note salvo que haga la cuenta a mano.

Lo que funcionó bien: el formulario es claro, los tildes de adicionales se explican solos, cada contribución muestra base + alícuota + importe (por eso mismo se pudo detectar el problema), y el recibo aparece al instante sin recargar.

Preguntas que me quedaron: ¿qué convenio tiene razón, Camioneros o Gastronómicos? ¿El viático por km del ítem 4.2.4 está excluido a propósito de la base de obra social y entonces lo que sobra es el rótulo? Además noté en el encabezado un enlace "Admin" y un botón "Salir" visibles sin haber iniciado sesión; no entré, solo lo anoto.

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789337916133-53.png (zoom de la tabla CONTRIBUCIONES A CARGO DEL EMPLEADOR: se ve la fila "Obra social (contribución 6%)" con base $2.058.367,62, leyenda "Remunerativo + no remunerativo" e importe $123.502,06)`

**Lo reportó:** contador

### contador:R3 · alta · funcional

**Dónde:** Los dos recibos — bloque "COMPOSICIÓN DEL COSTO LABORAL"

**Pasos:**

1) Calcular cualquiera de los dos casos. 2) Ir al bloque "Composición del costo laboral". 3) Anotar "Seguridad social $563.254,40 · 51,7%" (Camioneros) o "$739.920,49 · 56,2%" (Gastronómicos). 4) Compararlo con el "Costo laboral total" que figura arriba en la tabla del empleador.

**Esperado:** Bajo un título que dice "composición del costo laboral", los porcentajes deberían ser sobre el costo laboral total ($3.393.095,68 y $3.591.104,63). Seguridad social sería 16,6% y 20,6%.

**Observado:** Los porcentajes son sobre la suma de las cargas (sindical + seg. social + OS + PAMI + ART + otros), no sobre el costo laboral. Suman 100% entre ellos. Decirle a un cliente que la seguridad social es el 51,7% de su costo laboral es un error grueso y el gráfico invita a eso.

**Sugerencia:** Cambiar el título a "Composición de las cargas sociales" o recalcular los % sobre el costo laboral total. Y aclarar el denominador en una línea al pie del bloque.

**Evidencia:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789333878421-21.png`

**Verificador:** reproducido · severidad propia: alta · Se reproduce en los dos recibos, aunque con números distintos a los del reporte (yo usé las categorías y el período que vienen por defecto, sin tocar nada; el que reportó debe haber cargado otros datos). El fenómeno es idéntico.

Pasos que seguí (1 minuto): entrar a liquidar.ar, tocar "Comenzar" en Camioneros, y sin cambiar ningún campo tocar "Calcular liquidación". Bajar hasta el bloque "COMPOSICIÓN DEL COSTO LABORAL".

Camioneros (Agosto 2026, Conductor de primera categoría, 44 hs, ART 5%, régimen 18%):
- Arriba, en la tabla del empleador: "Costo laboral total $1.981.063,66".
- Abajo, bajo el título "Composición del costo laboral": "Seguridad social $293.864,64 · 50,5%".
- $293.864,64 sobre $1.981.063,66 da 14,8%, no 50,5%.

Gastronómicos (mismo procedimiento, todo por defecto):
- "Costo laboral total $1.769.972,31".
- "Seguridad social $358.231,47 · 55,1%".
- La cuenta real sobre el costo laboral da 20,2%.

Verifiqué de dónde sale el porcentaje sumando a mano los seis renglones del bloque. En Camioneros: 86.072,84 + 293.864,64 + 96.831,94 + 49.166,04 + 55.419,52 + 424,62 = 581.779,60, y 293.864,64 sobre eso sí da 50,5%. En Gastronómicos la suma da 650.408,69 y 358.231,47 sobre eso da 55,1%. O sea: la base es la suma de las cargas del propio bloque, no el costo laboral. Los seis porcentajes suman 100% entre ellos.

Por qué me parece alta y no gusto personal: el título del bloque dice "costo laboral" con todas las letras y el "Costo laboral total" está unos renglones más arriba, en el mismo recibo, a la vista. Un lector no tiene forma de leer ese 50,5% como otra cosa que "la mitad de lo que me cuesta el empleado es jubilación". Y hay un agravante que noté yo: la base real ($581.779,60 / $650.408,69) no figura en ninguna parte de la pantalla — no es el "Subtotal contribuciones" ($361.217,96 y $385.317,77, que son sólo la parte del empleador) ni ningún otro número visible. Así que ni siquiera tocando la calculadora se puede reconstruir de dónde salió el porcentaje: no hay leyenda, nota al pie ni tooltip que lo aclare. El único texto explicativo del bloque habla de Ganancias.

No lo pongo bloqueante porque la liquidación se completa y todos los importes en pesos del bloque parecen consistentes con el resto del recibo (los pares Empleador/Trabajador cuadran con las líneas de contribuciones y de descuentos). El problema es exclusivamente el porcentaje y el largo de las barras, que acompañan la lectura equivocada.

Lo que funcionó bien: el sitio carga rápido, la calculadora anda con los valores por defecto sin pedir nada, el recibo es muy detallado y el bloque "CÓMO SE HIZO ESTA CUENTA" explica supuestos (jornada, tabla de contribuciones, ART estimada) — justo el tipo de transparencia que le falta a este bloque.

Preguntas que me quedaron: ¿la intención era mostrar el reparto interno de las cargas (y entonces sobra la palabra "costo laboral" en el título), o el peso de cada carga sobre el costo laboral (y entonces está mal la cuenta)? Supongo lo primero por cómo suman 100%, pero es una suposición mía. Tampoco sé por qué en Gastronómicos "Sindical" da Empleador $0,00 y en Camioneros $48.415,97; no lo miré en detalle.

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789338086320-54.jpg`

**Lo reportó:** contador

### contador:R4 · alta · funcional

**Dónde:** https://liquidar.ar/calcular/gastronomicos-cct-389-04 — línea "Antigüedad" de HABERES REMUNERATIVOS

**Pasos:**

1) Gastronómicos, Septiembre 2026, Escala A, Nivel 6 (Mozo - Maître), 48 hs. 2) Poner 5 en Años de Antigüedad. 3) Calcular: Antigüedad = $57.199,24. 4) Cambiar a 6 años. 5) Calcular de nuevo.

**Esperado:** Un año más de antigüedad tiene que mover el número, o el recibo tiene que explicar por qué no (tramos, se cuenta desde el 2º año, etc.).

**Observado:** Con 5 y con 6 años da exactamente $57.199,24 y el neto no se mueve ($2.274.229,03). Probando más valores: 5→4% del básico, 6→4%, 7→5%, 10→6%, 20→14%. Es una escala por tramos que no está escrita en ninguna parte y que además no es lineal. Sin la regla a la vista no hay forma de auditar la línea, y de entrada parece un error.

**Sugerencia:** Mostrar el tramo aplicado en la propia línea ("Antigüedad · tramo 5-6 años: 4% sobre $1.429.981,00") y linkear la fuente del tramo.

**Evidencia:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789334227508-24.jpg`

**Verificador:** reproducido · severidad propia: alta · Se reproduce tal cual. Pasos que seguí en https://liquidar.ar/calcular/gastronomicos-cct-389-04 (la página tarda unos segundos con el cartel "Conectando con la base de datos…"): Septiembre 2026, Escala A, Nivel 6 (Mozo - Maître), 48 hs, "Años de Antigüedad" = 5, botón "Calcular liquidación". En HABERES REMUNERATIVOS: Sueldo Básico $1.429.981,00 y Antigüedad $57.199,24 (exactamente 4% del básico). Cambio el campo a 6 y vuelvo a calcular: el encabezado del recibo sí se actualiza ("Antigüedad: 6 años"), o sea que recalculó, pero la línea Antigüedad sigue en $57.199,24 y el neto no se mueve.

Seguí probando y confirmo los tramos que describe: 7 años → $71.499,05 (5%), 10 → $85.798,86 (6%), 20 → $200.197,34 (14%). Es una escala por tramos, no lineal (de 10 a 20 salta 8 puntos, de 5 a 6 no salta nada).

Dos aclaraciones sobre el reporte original: (a) el neto que a mí me dio es $1.535.500,85, no $2.274.229,03 — debe haber tenido alguna opción distinta marcada (SAC, vacaciones, escala), pero eso no afecta el hallazgo; (b) el resto de los datos sí coinciden al peso.

Por qué le dejo "alta" y no lo bajo a "no es problema": el número podría estar perfectamente bien (los convenios suelen tener antigüedad por tramos), pero el sitio no lo dice en ningún lado. Miré el campo "Años de Antigüedad": no tiene ayuda, ni ícono de info, ni texto debajo. Y el recibo tiene un bloque "CÓMO SE HIZO ESTA CUENTA" que explica la jornada ("Valor hora sobre 200 hs mensuales"), Ganancias, contribuciones, ART y SAC — explica todo menos justamente la antigüedad. Para alguien que entra a controlar su recibo, poner 6 y ver el mismo peso que con 5, sin ninguna nota, se lee como que la calculadora ignoró el dato. La tarea se completa, pero la confusión es seria y la línea no se puede auditar.

Sugerencia (mía, no la vi en pantalla): que la línea diga algo como "Antigüedad (4% — tramo 5 a 6 años)" o que el bloque "CÓMO SE HIZO" liste la escala.

Lo que funcionó bien: el recibo es muy completo y transparente en el resto (base de cálculo y porcentaje al lado de cada contribución del empleador, detracción Ley 27.541 declarada, ART marcada como estimada, aclaración de que no reemplaza el recibo oficial). El recálculo es instantáneo y el encabezado refleja los parámetros usados, que es lo que me permitió descartar que no hubiera recalculado.

Dudas que me quedaron: ¿los tramos son los del CCT 389/04 o una interpretación del sitio? ¿Desde qué año arranca a contar? (con 0 años no probé a fondo). También noté en el menú un enlace "Admin" a /admin y un botón "Salir" visibles sin haber iniciado sesión; no entré, solo lo dejo anotado.

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789338299957-56.jpg — se ve en la misma pantalla el campo "Años de Antigüedad" en 6 (izquierda) y la línea "Antigüedad $57.199,24" sobre "Sueldo Básico $1.429.981,00" (derecha), el mismo importe que con 5 años.`

**Lo reportó:** contador

### contador:R5 · alta · ux

**Dónde:** Los dos recibos — bloques HABERES REMUNERATIVOS, HABERES NO REMUNERATIVOS y DESCUENTOS Y RETENCIONES

**Pasos:**

1) Calcular cualquiera de los dos casos. 2) Comparar la tabla "Contribuciones a cargo del empleador" (tiene columnas CONCEPTO / BASE DE CÁLCULO / UNIDAD / IMPORTE) con los bloques de haberes y retenciones del trabajador. 3) Pasar el mouse por encima de cualquier línea de haberes buscando un tooltip.

**Esperado:** Que cada línea del recibo diga sobre qué base y con qué porcentaje se calculó, igual que la tabla del empleador.

**Observado:** Los haberes no muestran ni base ni porcentaje ni valor unitario: "Antigüedad $176.450,80", "Horas extraordinarias por km recorrido (8000 km) $688.597,52", "Horas Extras 50% (12 hs) $117.408,87" — sin valor por km ni valor hora. Las retenciones muestran solo el %, sin la base, y ahí está lo peligroso: en Gastronómicos "Ley 19.032 PAMI (3%)" da $81.079,92 y "Obra Social (3%)" da $84.019,92; el mismo 3% con dos bases distintas (una sobre remunerativo, la otra sobre rem + no rem) y el recibo no lo dice. No hay tooltips.

**Sugerencia:** Agregar a haberes y retenciones las mismas columnas BASE / UNIDAD que ya existen en la tabla del empleador. Es el cambio que más haría por la confianza del recibo.

**Evidencia:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789334091559-23.png`

**Verificador:** reproducido · severidad propia: alta · Se reproduce tal cual, con mis propios datos (no los de la otra persona).

Pasos que seguí: entré a https://liquidar.ar, toqué "Gastronómicos (UTHGRA) CCT 389/04", dejé todo por defecto (Septiembre 2026, Escala A, Nivel 1) y sólo puse Años de Antigüedad = 10 y Horas Extras al 50% = 12, y toqué "Calcular liquidación".

Lo que vi:
- La tabla "CONTRIBUCIONES A CARGO DEL EMPLEADOR" sí tiene las cuatro columnas: p. ej. "ART (estimada) · $1.498.873,13 Remunerativo · 5% · $74.943,66" y "Obra social (contribución 6%) · $1.572.873,13 Remunerativo + no remunerativo · 6% · $94.372,39". Se entiende de dónde sale cada número.
- Los bloques del trabajador, en cambio, son sólo concepto + importe: "Sueldo Básico $1.074.307,00", "Antigüedad $64.458,42", "Complemento de Servicio (12%) $128.916,84", "Asistencia Perfecta (10%) $107.430,70", "Horas Extras 50% (12 hs) $123.760,17". La antigüedad no dice ni años ni porcentaje por año; las horas extras dicen la cantidad de horas pero no el valor hora.
- En DESCUENTOS Y RETENCIONES aparece el punto fuerte del reporte: "Ley 19.032 PAMI (3%) − $44.966,19" y "Obra Social (3%) − $47.186,19". Dos líneas que dicen el mismo 3% y dan importes distintos. Haciendo la cuenta con los totales que el propio recibo muestra más abajo, PAMI va sobre el total remunerativo ($1.498.873,13) y Obra Social sobre remunerativo + no remunerativo ($1.572.873,13) — pero el recibo no lo dice en ningún lado. Para alguien que está controlando su sueldo, eso se lee como un error del sitio.
- Pasé el mouse por encima de "Antigüedad" y de las líneas de retenciones y esperé: no aparece ningún tooltip ni nada.
- Verifiqué que no sea sólo de este convenio: en Camioneros (CCT 40/89) el bloque de haberes tiene la misma forma (leyendo la estructura de la página, la línea "Sueldo Básico" sólo tiene concepto e importe, sin campo de base ni unidad).

Matices a favor del sitio, para no inflar: hay un bloque "CÓMO SE HIZO ESTA CUENTA" que sí aclara algunas cosas (jornada de 48 hs, "Valor hora sobre 200 hs mensuales", que las sumas no remunerativas no generan antigüedad ni presentismo, qué tabla de contribuciones usó). O sea, parte de la información existe, pero está lejos de la línea y no cubre ni la base de cada retención ni el porcentaje de antigüedad ni el valor hora en pesos.

Mi lectura: no es gusto personal ni es bloqueante — la liquidación se completa y los totales cierran. Pero el sitio se presenta como una calculadora para entender el recibo, y ya demostró en la tabla del empleador que sabe mostrar base/unidad/importe. Que dos líneas con el mismo "3%" den importes distintos sin explicación es una confusión seria y concreta, del tipo que hace que la persona desconfíe del número o discuta mal con su empleador. Coincido con severidad alta, y el arreglo mínimo (mostrar la base al lado de cada retención) parece mucho más chico que el problema.

Preguntas que me quedaron: ¿por qué la decisión de mostrar base y unidad sólo del lado del empleador? ¿Y el "Complemento de Servicio (12%)" y "Asistencia Perfecta (10%)" se calculan sobre el básico solo o sobre básico + antigüedad? Tampoco pude saberlo desde la pantalla.

Aparte, algo que no era parte de este reporte pero vi en pantalla: en el encabezado del sitio aparecen un link "Admin" y un botón "Salir", como si hubiera una sesión abierta. No entré ahí, sólo lo anoto.

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789338462592-57.jpg — se ve en la misma pantalla la fila del empleador "ART (estimada) $1.498.873,13 Remunerativo 5% $74.943,66" (con base y porcentaje) y, debajo, los bloques del trabajador: HABERES REMUNERATIVOS sin base ni unidad, y DESCUENTOS Y RETENCIONES con "Ley 19.032 PAMI (3%) − $44.966,19" y "Obra Social (3%) − $47.186,19".`

**Lo reportó:** contador

### contador:R6 · alta · ux

**Dónde:** Los dos formularios — el recibo de la derecha queda desactualizado respecto de los campos

**Pasos:**

1) Camioneros, cargar el caso completo (10 años, 12 hs extras, larga distancia, 8000 km) y tocar "Calcular liquidación". 2) Sin tocar nada más, cambiar Años de Antigüedad de 10 a 20. 3) Mirar la pantalla: a la izquierda el campo dice 20, a la derecha el recibo sigue diciendo "Antigüedad: 10 años" y los mismos importes.

**Esperado:** O recalcula solo, o el recibo se marca como desactualizado (gris, "datos cambiados, volvé a calcular") hasta que aprieto el botón.

**Observado:** El recibo queda idéntico, sin ninguna marca, y en la misma pantalla conviven un dato de entrada y un resultado que no se corresponden. Si estoy comparando escenarios y me distraigo, copio un número que no es el del caso que tengo cargado.

**Sugerencia:** Al detectar un cambio en el formulario, atenuar el recibo y mostrar "Los datos cambiaron — recalculá" sobre el bloque de resultados.

**Evidencia:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789333848775-19.jpg`

**Verificador:** reproducido · severidad propia: media · Se reproduce exactamente como lo contaron. Pasos que seguí: en liquidar.ar toqué "Comenzar" en la tarjeta Camioneros (CCT 40/89), quedé en /calcular/camioneros-cct-40-89 con Agosto 2026 y "Conductor de primera categoría"; puse Años de Antigüedad = 10, Horas Extras al 50% = 12, tildé "¿Es chofer de larga distancia (más de 100 km)?" y Kilómetros recorridos = 8000; toqué "Calcular liquidación". Salió el recibo a la derecha: "Antigüedad: 10 años", Neto a cobrar $2.341.119,91.

Después, sin tocar nada más, borré el 10 del campo Antigüedad y escribí 20. En la MISMA pantalla, sin scrollear, se ven juntos: a la izquierda el campo con "20" y a la derecha, en la cabecera del recibo, "Antigüedad: 10 años" con todos los importes viejos. Esperé, hice clic afuera para que el campo pierda el foco, esperé 3 segundos más: el recibo no cambió ni se atenuó. Busqué en todo el texto de la página palabras tipo "desactualizado", "volvé a calcular", "recalcular": no aparece ninguna. El botón tampoco cambia (sigue diciendo "Calcular liquidación", mismo color, sin destacarse), así que nada te avisa de que lo que estás mirando ya no corresponde a los datos cargados.

La diferencia no es cosmética: cuando después toqué "Calcular liquidación", pasó a "Antigüedad: 20 años" y Neto a cobrar $2.494.880,23, o sea unos $153.760 más. Ese es el número que te podés llevar equivocado si te distraés.

Por qué le bajo la severidad de alta a media (y no la descarto): el modelo "cargo datos y aprieto el botón" es entendible y el resultado está titulado "Simulación de recibo"; nadie te obliga a nada y con un clic se arregla. Pero la pantalla es de dos columnas, entrada y resultado se ven al mismo tiempo, y ahí conviven sin ninguna marca un dato de entrada y un resultado que no se corresponden: eso es fricción clara y una confusión posible, sobre todo comparando escenarios. Con marcar el recibo en gris o poner "datos cambiados, volvé a calcular" alcanzaría. No es bloqueante ni alta para mí porque la tarea se completa bien y sin error si apretás el botón.

Lo que funcionó bien: el cálculo es rápido (instantáneo al apretar el botón), el recibo es muy detallado (contribuciones del empleador, composición del costo laboral y un bloque "CÓMO SE HIZO ESTA CUENTA" que dice de qué mes es cada tabla), y el estado inicial vacío dice claramente "Tu recibo va a aparecer acá / Completá los datos del puesto y tocá Calcular liquidación".

Cosas raras / preguntas que me quedaron (no las reporto como hallazgo porque no las verifiqué a fondo): (1) al leer la estructura de la página aparecieron un enlace "Admin" (/admin) y un botón "Salir" que no vi dibujados en pantalla; no entré. (2) La casilla de larga distancia me costó tildarla: los primeros intentos la dejaron destildada y recién al tercer clic quedó marcada; puede haber sido mi puntería, no lo doy por hallazgo. (3) El campo "Kilómetros recorridos" se puede completar aunque la casilla de larga distancia esté destildada, lo que también deja la pantalla en un estado medio contradictorio.

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789338755111-59.jpg (captura única: a la izquierda "Años de Antigüedad: 20", a la derecha la cabecera del recibo "Antigüedad: 10 años" con los importes anteriores)`

**Lo reportó:** contador

### empleador:R2 · alta · funcional

**Dónde:** https://liquidar.ar/calcular/comercio-cct-130-75 — panel del recibo a la derecha

**Pasos:**

1) Calcular con los valores por defecto (ART 5%). 2) Sin tocar nada más, cambiar el campo 'Alícuota de ART' de 5 a 12. 3) Mirar el recibo de la derecha sin volver a apretar 'Calcular liquidación'.

**Esperado:** Que el recibo se recalcule solo, o que se atenúe / muestre un cartel tipo 'cambiaste datos, volvé a calcular'.

**Observado:** El recibo queda idéntico: sigue diciendo 'ART (estimada) 5% $64.817,37' y 'Costo laboral total $1.841.819,86', sin ninguna marca de que está desactualizado, mientras el campo en pantalla dice 12. Me pasó lo mismo al cambiar el régimen de contribuciones de 18% a 20,40%: el recibo siguió mostrando 'Régimen: Resto de actividades y MiPyME (18%)'. Es el error más fácil de cometer acá: mirás el número de la derecha creyendo que corresponde a lo que tenés escrito a la izquierda, y no.

**Sugerencia:** Al primer cambio en cualquier campo, atenuar el recibo y poner arriba un aviso 'Datos modificados — volvé a calcular', o directamente recalcular al vuelo.

**Evidencia:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789335408293-36.jpg`

**Verificador:** reproducido · severidad propia: alta · Se reproduce tal cual, y no solo con ART. Pasos (1 minuto): abrir https://liquidar.ar/calcular/comercio-cct-130-75, bajar y apretar "Calcular liquidación" con los valores por defecto; el panel derecho arma el recibo (en mi corrida: "ART (estimada) ... 5% $64.817,37", "Costo laboral total $1.810.875,61", "Régimen: Resto de actividades y MiPyME (18%)"). Después, sin tocar el botón, cambiar "Alícuota de ART" de 5 a 12 y elegir "Servicios y comercio, empresas grandes (20,40%)" en "Régimen de contribuciones". Esperaba que el recibo se recalculara solo o que avisara que quedó viejo.

Lo que pasó: el recibo quedó exactamente igual. Esperé 3 segundos y volví a mirar: sigue diciendo 5% / $64.817,37, "Costo laboral total $1.810.875,61" y "Régimen: Resto de actividades y MiPyME (18%)", mientras el formulario de la izquierda dice 12 y 20,40%. No aparece ningún cartel, ningún cambio de color, ningún atenuado del panel, ninguna leyenda del tipo "volvé a calcular"; busqué en todo el texto de la página las palabras desactualizado/recalcular/volvé a calcular y no hay ninguna. Tampoco hubo mensajes emergentes.

Confirmé que los datos sí se usan cuando uno aprieta el botón: al volver a apretar "Calcular liquidación" el recibo pasó a "12% $155.561,68", "Costo laboral total $1.932.564..." y "Régimen: Servicios y comercio, empresas grandes (20,40%)". O sea, el cálculo está bien; lo que falla es que la pantalla muestra a la vez dos cosas que se contradicen y no avisa cuál vale.

Por qué me parece alta y no media: las dos mitades están una al lado de la otra en la misma pantalla, el número de la derecha es el que uno anota o le pasa a un cliente (costo laboral), y nada en la pantalla te dice que corresponde a otros datos. Es un error silencioso y fácil de cometer, no una simple fricción. No lo pondría bloqueante porque la tarea se completa apretando el botón otra vez.

Detalle menor: mis importes por defecto no dan iguales a los de quien reportó ($1.810.875,61 vs $1.841.819,86); supongo que es por alguna diferencia de período o de defaults, pero el comportamiento reportado es el mismo.

Lo que funcionó bien: la página carga rápido, el recibo es muy legible y explica de dónde sale cada cosa ("CÓMO SE HIZO ESTA CUENTA"), y aclara que la ART es estimada. Me quedó la duda de si el botón "Calcular liquidación" se ve siempre en pantalla o hay que buscarlo: en mi ventana tuve que bajar para encontrarlo, así que si el recibo quedó viejo y estás mirando la derecha, el botón ni siquiera está a la vista.

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789338891272-60.jpg`

**Lo reportó:** empleador

### celular:R1 · alta · ux

**Dónde:** https://liquidar.ar/calcular/comercio-cct-130-75 — bloque "CONTRIBUCIONES A CARGO DEL EMPLEADOR" del resultado

**Pasos:**

1) En el celular abrí liquidar.ar y tocá "Empleados de Comercio". 2) Dejá todo como viene y tocá "Calcular liquidación". 3) Bajá hasta el recuadro "CONTRIBUCIONES A CARGO DEL EMPLEADOR". 4) Mirá qué columnas se ven. 5) Arrastrá la tabla hacia la izquierda con el dedo.

**Esperado:** Ver el concepto y su importe al mismo tiempo, como en el resto del recibo (nombre a la izquierda, plata a la derecha).

**Observado:** En 400 px sólo entran "CONCEPTO" y "BASE DE CÁLCULO". Las columnas "UNIDAD" e "IMPORTE" quedan afuera y no hay ninguna señal de que la tabla se desliza. Si la deslizo aparecen los importes pero desaparece el nombre del concepto, así que nunca veo los dos juntos: veo "$145.843,14" sin saber de qué es. Es la única tabla del recibo con este problema.

**Sugerencia:** En pantallas angostas mostrar estas contribuciones como fichas apiladas (concepto arriba, importe grande abajo, base y alícuota en chico), igual que "HABERES REMUNERATIVOS", en vez de una tabla de 4 columnas.

**Evidencia:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789336132236-38.png y C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789336152208-39.png`

**Verificador:** reproducido · severidad propia: alta · Se reproduce tal cual, y hasta es un poco peor de lo que describieron.

Pasos que seguí (pantalla de 400 px de ancho): entré a liquidar.ar, toqué "Empleados de Comercio", no cambié ningún dato y toqué "Calcular liquidación". El recibo aparece bien; bajé hasta el recuadro "Contribuciones a cargo del empleador".

Lo que vi:
1) De entrada sólo entran "Concepto" y "Base de cálculo". "Unidad" se ve cortada a la mitad e "Importe" queda entera afuera. O sea: en el único bloque que dice cuánto paga el empleador, no se ve ni un solo importe sin hacer algo extra.
2) No hay ninguna señal de que se desliza: ni flecha, ni sombra en el borde, ni barrita. Una persona que no sabe que la tabla se arrastra se queda leyendo "SIPA (jubilación) $1.289.343,66" y se lleva la idea de que la contribución de jubilación es 1,29 millones, cuando ese número es la BASE, no el importe (el importe real es $193.401,55, que está escondido). Eso ya no es sólo incomodidad, es leer mal la cifra.
3) Si arrastro la tabla hacia la izquierda aparecen "Unidad" e "Importe", pero la columna "Concepto" se va por completo del recuadro: quedan filas tipo "$1.289.343,66 | 4,7% | $60.599,15" sin nombre al lado. Nunca se ven el concepto y su importe juntos, exactamente como reportaron.
4) Confirmé que es el único bloque del recibo con este problema: el resto de las secciones (remunerativos, no remunerativos, descuentos, totales) entran completas en 400 px, con el nombre a la izquierda y la plata a la derecha. Así que además rompe el patrón de todo el resto de la página.

Números que medí desde la pantalla: el recuadro que se desliza mide 243 px de ancho visible y la tabla mide 357 px, o sea quedan 114 px afuera.

Coincido con "alta". No es sólo fricción: se muestra bien visible una cifra grande (la base) en el lugar donde el ojo busca el importe, y el importe verdadero está oculto sin aviso. La única razón por la que no lo pongo bloqueante es que el dato existe y se puede llegar a él arrastrando, si uno adivina que hay que arrastrar.

Sugerencia de quien lo mira de afuera (esto es opinión mía, no hallazgo): en celular ese bloque podría mostrarse como el resto del recibo — concepto arriba, base y % como texto chico debajo, e importe a la derecha — en vez de como tabla de 4 columnas.

Lo que funcionó bien: la calculadora carga rápido, el resultado sale sin pedir nada, y todos los demás bloques del recibo se leen perfecto en 400 px.

Cosas que me quedaron en duda: en el menú del celular aparecen un enlace "Admin" y un botón "Salir", así que parece que el navegador tenía una sesión abierta; no entré ahí, sólo lo anoto. Tampoco envié ningún formulario ("Reportar error / sugerencia" lo dejé sin tocar).

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789339054490-62.jpg — marco de 400 px (borde rojo) con la tabla ya arrastrada hacia la izquierda: se ven base, porcentaje e importe, y la columna "Concepto" desapareció por completo, así que los importes quedan sin nombre.`

**Lo reportó:** celular

### celular:R2 · alta · funcional

**Dónde:** https://liquidar.ar/calcular/camioneros-cct-40-89 y /calcular/comercio-cct-130-75 — campo "Horas semanales"

**Pasos:**

1) Abrí una calculadora (probé Camioneros y Comercio). 2) Borrá el contenido del campo "Horas semanales" y dejalo vacío (o escribí 0). 3) Bajá y tocá "Calcular liquidación". 4) Leé la línea "Jornada:" del recibo y el "Sueldo Básico".

**Esperado:** Que me avise que falta el dato (o que 0 no sirve) y no me deje calcular, o al menos que me diga "como no pusiste horas, calculamos jornada completa".

**Observado:** Calcula igual, sin ningún aviso, y el recibo afirma "Jornada: 44 hs de 44 semanales" (en Comercio, "48 hs de 48 semanales") con el sueldo básico entero. O sea: el resumen dice un dato que yo no cargué. Comprobé que el campo sí funciona cuando pongo un número (con 24 hs en Comercio el básico bajó a la mitad y el resumen dijo "24 hs"), así que el problema es sólo con vacío y con 0. Alguien que trabaja medio tiempo y borra el campo se va con un neto de jornada completa creyendo que es el suyo.

**Sugerencia:** Hacer el campo obligatorio y rechazar el 0; si se decide seguir asumiendo la jornada completa, decirlo en el recibo con un aviso visible ("no cargaste horas: se calculó jornada completa de 44 hs").

**Evidencia:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789336598277-45.png`

**Verificador:** reproducido · severidad propia: alta · Se reproduce tal cual, en las dos calculadoras, con vacío y con 0.

Pasos exactos que seguí (1 minuto):
1) Abrí https://liquidar.ar/calcular/camioneros-cct-40-89 (tarda unos segundos con el cartel "Conectando con la base de datos…").
2) Triple clic en el campo "Horas semanales (jornada completa del CCT: 44)" y Supr. Queda vacío.
3) Bajé y toqué "Calcular liquidación".
Resultado: calcula sin ningún aviso, sin marcar el campo en rojo, sin alertas del navegador (revisé window.__alertas y estaba vacío). El recibo dice "Jornada: 44 hs de 44 semanales" y "Sueldo Básico $1.075.910,44" (neto $1.399.284,06). Abajo, en "CÓMO SE HIZO ESTA CUENTA", repite "Jornada completa del convenio: 44 hs semanales (la declara el convenio); el puesto: 44 hs".
4) Repetí con 0 en el mismo campo: idéntico, "Jornada: 44 hs de 44 semanales" y el mismo básico entero.
5) Control de que el campo sí funciona: puse 22 y recalculé → "Jornada: 22 hs de 44 semanales" y el básico bajó a la mitad ($537.955,22 aprox.). Así que el fallback silencioso es sólo con vacío/0.
6) En https://liquidar.ar/calcular/comercio-cct-130-75, borré "Horas Semanales (Jornada)" (venía 48) y calculé: mismo comportamiento, "Jornada: 48 hs de 48 semanales", sin aviso.

Por qué le dejo severidad alta y no la bajo: el problema no es que exista un valor por defecto (48/44 es un default razonable), es que el recibo AFIRMA como dato propio algo que yo no cargué, y en una pantalla donde todo lo demás que toco se refleja fiel. La línea "Jornada: 44 hs de 44 semanales" se lee como "esto es lo tuyo", no como "asumimos jornada completa". Alguien de media jornada que borra el campo (o pone 0 pensando "no sé") se lleva un neto de jornada completa y nada en pantalla le avisa. Además el campo ya empieza relleno con el valor del convenio, así que el único motivo para borrarlo es justamente querer cargar otra cosa.

Dos agravantes que noté y que el reportante no menciona:
- En Comercio el rótulo es sólo "Horas Semanales (Jornada)", sin la aclaración "(jornada completa del CCT: 48)" que sí tiene Camioneros. Ahí el usuario ni siquiera sabe de dónde salió el 48.
- Con 0 esperaría, si se acepta, un básico 0 o un error; que 0 signifique "jornada completa" es lo menos intuitivo posible.

Lo que sí funciona bien: el cálculo con un número válido es coherente y proporcional; el bloque "CÓMO SE HIZO ESTA CUENTA" es muy bueno y explica el valor hora y las tablas usadas; el pie aclara que es orientativo y no reemplaza el recibo oficial.

Pregunta que me queda: ¿el campo vacío debería impedir calcular, o alcanzaría con que el recibo dijera "Jornada: 44 hs (jornada completa del convenio, no cargaste horas)"? Con lo segundo me daría por servido.

Aclaraciones de método: no envié ningún formulario que mande datos a terceros (el botón sólo recalcula en pantalla); no inicié sesión; todo lo de arriba salió de la pantalla. Supongo —no lo verifiqué— que vacío y 0 caen en la misma rama de código, porque dan resultados idénticos.

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789339167859-63.jpg (Camioneros: a la izquierda el campo "Horas semanales" vacío, a la derecha el recibo ya calculado diciendo "Jornada: 44 hs de 44 semanales")`

**Lo reportó:** celular

### accesibilidad:R1 · alta · accesibilidad

**Dónde:** https://liquidar.ar/calcular/comercio-cct-130-75 — panel izquierdo, los 15 campos del formulario (Período a liquidar, Categoría, Horas Semanales, Años de Antigüedad, Horas Extras 50/100, Días de vacaciones, Régimen de contribuciones, Alícuota de ART, Cuota fija de ART, Cónyuge, Hijos...)

**Pasos:**

1. Abrir https://liquidar.ar/calcular/comercio-cct-130-75
2. Tabular hasta el primer desplegable del formulario (6 Tab desde el inicio).
3. Leer el árbol de accesibilidad (read_page filtro "interactive"): el combo del período figura como combobox "Septiembre 2026" y el de categoría como combobox "Administrativo A".
4. En consola, sobre cada input/select: no tienen id, ni atributo name asociado a un label[for], ni aria-label, ni aria-labelledby, ni están envueltos en <label>. Verifiqué los 15 y ninguno tiene vínculo.

**Esperado:** Que un lector de pantalla anuncie "Categoría, cuadro combinado, Administrativo A" y "Horas semanales (jornada), edición numérica, 48". El texto visible ya existe arriba de cada campo; sólo falta conectarlo.

**Observado:** El texto visible ("Categoría", "Horas Semanales (Jornada)", "Alícuota de ART"...) está en un <span>/<div> hermano sin ninguna relación programática. El lector anuncia sólo el valor actual: "Administrativo A, cuadro combinado", "48, edición", "0, edición", "0, edición", "5, edición". Con cuatro campos numéricos seguidos que dicen "0" es imposible saber cuál es horas extras al 50% y cuál al 100%. Lo mismo en /calcular/camioneros-cct-40-89 (15 de 25 campos sin label).

**Sugerencia:** Poner id en cada control y <label for="..."> en el texto que ya está escrito, o envolver el control con el <label> (como ya hacen bien con los checkboxes "Afiliado al Sindicato" e "Incluir SAC"). Es el mismo texto, sólo cambia la etiqueta HTML.

**Verificador:** reproducido · severidad propia: alta · Se reproduce, con una corrección de detalle.

Qué hice (1 minuto): abrí https://liquidar.ar/calcular/comercio-cct-130-75, pedí el árbol de accesibilidad filtrado por elementos interactivos y recorrí los controles del panel izquierdo.

Qué vi:
- El árbol de accesibilidad devuelve los dos desplegables nombrados sólo por su valor: combobox "Septiembre 2026" y combobox "Administrativo A". No aparece en ningún lado "Período a liquidar" ni "Categoría" como nombre del control.
- Los 9 campos numéricos ni siquiera figuran con nombre en ese listado.
- Recorriendo cada control del formulario: ninguno tiene id con un label[for=...] que lo apunte, ninguno tiene aria-label ni aria-labelledby, ninguno tiene title ni placeholder. El texto visible ("Horas Semanales (Jornada)", "Años de Antigüedad", "Horas Extras al 50%", "Horas Extras al 100%", "Alícuota de ART"...) está en un elemento hermano, sin relación programática.
- En pantalla se ven, uno al lado del otro, cuatro casillas numéricas con el mismo contenido: 48, 0, 0, 0 (antigüedad, extras 50%, extras 100%) y más abajo otras con 0 y 5. Sin el texto de arriba no hay forma de distinguirlas; un lector de pantalla en modo formulario anuncia el valor y nada más.
- En /calcular/camioneros-cct-40-89 conté 25 controles, de los cuales 15 no tienen ningún vínculo con su texto. Coincide exacto con lo que reportaron.

Corrección al reporte original: no son "los 15 sin label". De los 15 controles de la página de comercio, 12 están sin vínculo; los 3 checkboxes (Afiliado al Sindicato, Incluir SAC, Cónyuge a cargo) SÍ están envueltos en <label> y se anuncian bien. El resto del reporte es exacto.

Por qué le pongo alta y no media: para quien ve la pantalla no hay ningún problema, el formulario está bien ordenado y los textos son claros; esto no rompe nada visualmente. Pero para quien usa lector de pantalla, la tarea se puede "completar" y aun así quedar mal: el riesgo concreto es cargar las horas extras al 100% en el campo del 50% sin enterarse, y el resultado es un recibo de sueldo con números equivocados que parece correcto. Eso encaja con "se completa pero con una confusión seria". No lo pongo bloqueante porque, leyendo la página de corrido (modo navegación), el texto visible igual se escucha antes de cada campo, así que con paciencia se puede inferir cuál es cuál.

Lo que funcionó bien: la página carga rápido, el formulario se entiende a la vista, el panel derecho explica qué falta ("Tu recibo va a aparecer acá"), y los textos de ayuda bajo los campos de ART son útiles. No hubo ninguna alerta ni mensaje inesperado (window.__alertas quedó vacío).

Pregunta que me queda: en la barra superior vi un enlace "Admin" a /admin y un botón "Salir" visibles para mí sin haber iniciado sesión. No entré, sólo lo anoto: podría ser que la sesión de este navegador ya estuviera abierta, o podría ser que esos controles se muestran a cualquiera. No lo verifiqué.

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789339320058-64.jpg — muestra las cuatro casillas numéricas consecutivas (48, 0, 0, 0) cuyo texto ("Horas Semanales (Jornada)", "Años de Antigüedad", "Horas Extras al 50%", "Horas Extras al 100%") está sólo arriba, sin vínculo con el campo. Además, el árbol de accesibilidad devuelve literalmente: combobox "Septiembre 2026" y combobox "Administrativo A", sin ningún nombre de campo; y los 9 inputs numéricos no aparecen con nombre. En /calcular/camioneros-cct-40-89: 25 controles, 15 sin vínculo.`

**Lo reportó:** accesibilidad

### accesibilidad:R2 · alta · accesibilidad

**Dónde:** https://liquidar.ar/calcular/comercio-cct-130-75 — columna derecha, el recibo que aparece tras "Calcular liquidación"

**Pasos:**

1. Abrir la calculadora de Comercio.
2. Sólo con teclado: Tab hasta "Años de Antigüedad", escribir 7 y pulsar Enter.
3. El recibo se dibuja en la columna derecha (reemplaza el cartel "Tu recibo va a aparecer acá").
4. Consultar dónde quedó el foco y si hay regiones vivas: document.activeElement sigue siendo el input de antigüedad, y document.querySelectorAll('[aria-live],[role=status],[role=alert]').length devuelve 0 en toda la página.

**Esperado:** Que al generarse el resultado se anuncie algo ("Simulación de recibo lista, neto a cobrar $X") vía aria-live/role=status, o que el foco se mueva al encabezado del recibo con tabindex=-1.

**Observado:** No hay ninguna región viva en toda la página y el foco no se mueve. Quien usa lector de pantalla pulsa Enter, no oye absolutamente nada y no tiene forma de saber si el cálculo se hizo, si falló o si se está cargando. Tiene que salir a explorar la página a ciegas para descubrir que apareció contenido nuevo. Es justo la información por la que entró al sitio.

**Sugerencia:** Envolver el contenedor del recibo en role="status" aria-live="polite" con un resumen corto al principio, o mover el foco al h2 "Simulación de recibo" (tabindex="-1") después de calcular.

**Verificador:** reproducido · severidad propia: alta · Se reproduce exactamente. Pasos que seguí (1 minuto): abrí https://liquidar.ar/calcular/comercio-cct-130-75 (tarda unos segundos mostrando "Conectando con la base de datos..."), y sin tocar el mouse pulsé Tab 9 veces hasta caer en el campo "Años de Antigüedad" (name=antiguedad_años); escribí 7 y pulsé Enter.

Qué esperaba: que al aparecer el resultado el sitio avisara algo, o que el foco se moviera al recibo.
Qué pasó: la columna derecha, que antes decía "Tu recibo va a aparecer acá", pasó a mostrar el recibo completo (Convenio Empleados de Comercio CCT 130/75, Período Septiembre 2026, "Antigüedad: 7 años", contribuciones patronales, etc.) y la página incluso se desplazó sola hacia abajo. Pero:
- document.activeElement sigue siendo el input antiguedad_años (value "7"): el foco no se movió.
- document.querySelectorAll('[aria-live],[role=status],[role=alert],[role=log],[aria-busy],[role=progressbar]').length devuelve 0 en toda la página, antes y después del cálculo.
- No hay ningún elemento con tabindex="-1" (0 en total), así que tampoco existe un destino al que mover el foco.
- El único .sr-only de la página es "Abrir menú": no hay texto oculto de anuncio.
- No hubo ningún alert (window.__alertas quedó vacío).

Mi lectura: el reporte es correcto y la severidad "alta" me parece bien puesta, no exagerada. Quien usa lector de pantalla aprieta Enter y no escucha nada: ni "calculando", ni "listo", ni el neto. El contenido nuevo aparece lejos del foco (otra columna) y encima la página scrollea sola, cosa que un lector de pantalla no transmite; hay que salir a explorar a ciegas para descubrir que el resultado existe. Y es justo el dato por el que uno entra al sitio. No lo marco como bloqueante porque el contenido sí está en el DOM y es alcanzable navegando con el lector, pero la falta de aviso es una confusión seria.

Detalle extra que noté (no es el hallazgo, pero suma): el cálculo parece dispararse solo al cambiar el valor, sin necesidad de tocar "Calcular liquidación", así que el resultado puede cambiar varias veces mientras alguien tipea, y ninguna de esas veces se anuncia. También vi que el input de antigüedad no tiene un <label> asociado que devuelva a.labels[0] (dio null), aunque en pantalla el texto "Años de Antigüedad" está arriba del campo; eso lo menciono como observación, no lo verifiqué a fondo.

Lo que funcionó bien: la calculadora en sí responde rápido, es 100% operable por teclado (llegué a todos los campos con Tab), el recibo es detallado y claro visualmente, y el orden de tabulación sigue el orden visual.

Pregunta que me queda: ¿hay algún modo o página alternativa pensada para lectores de pantalla? No vi ninguna indicación en pantalla.

**Evidencia del verificador:** `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789339452233-65.jpg (recibo ya generado en la columna derecha con "Antigüedad: 7 años" mientras el cursor sigue en el campo "Años de Antigüedad" con el 7 tipeado). Consultas ejecutadas en la página: document.querySelectorAll('[aria-live],[role=status],[role=alert],[role=log],[aria-busy],[role=progressbar]').length = 0; document.querySelectorAll('[tabindex="-1"]').length = 0; document.activeElement = INPUT name="antiguedad_años" value="7".`

**Lo reportó:** accesibilidad

## Reportados y no reproducidos

Ninguno.

## De severidad baja (sin verificar)

| Severidad | Tipo | Dónde | Observado | Sugerencia | Lo vio | Evidencia |
|---|---|---|---|---|---|---|
| **alta** | accesibilidad | Todo el sitio — barra flotante gris abajo a la derecha con "Admin" y "Salir" (invisible) | Las dos primeras paradas de Tab son un enlace "Admin" (/admin) y un botón "Salir" que están dentro de un contenedor con opacity:0, pointer-events:none y aria-hidden="true". Es decir: están ocultos a la vista y ocultos al lector de pantalla, pero siguen en el orden de tabulación. El foco desaparece dos veces al empezar, y además es una contradicción (aria-hidden sobre un elemento enfocable). Se reproduce igual en /calcular/... y en /novedades. | Cuando la barra está oculta, sacar sus controles del foco: atributo inert en el contenedor, o display:none / visibility:hidden en vez de opacity:0. (Nota aparte: no sé si esa barra debería verse o no; yo entré sin sesión y aun así los controles existen en la página.) | accesibilidad | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789336819724-46.jpg` |
| **alta** | accesibilidad | Todo el sitio en ancho de celular (~400 px) — menú hamburguesa del encabezado, contenedor #mobile-menu | Con el menú cerrado el foco entra igual en dos enlaces invisibles y recortados. En pantalla no se ve nada moverse durante dos Tab seguidos, y si el usuario pulsa Enter navega sin entender a dónde. Además, el botón mantiene el texto para lector "Abrir menú" incluso cuando ya está abierto. | Agregar inert (o hidden) al #mobile-menu mientras aria-expanded sea false, y cambiar el texto sr-only a "Cerrar menú" cuando está abierto. | accesibilidad | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789337290049-47.jpg` |
| **alta** | accesibilidad | https://liquidar.ar/calcular/comercio-cct-130-75 — rótulos de sección en gris claro y todas las ayudas de 11 px | 2,5–2,6:1 en 6 rótulos de sección y 9 bloques de ayuda. A simple vista el gris claro sobre blanco a 11 px se lee con esfuerzo incluso con buena vista; con visión reducida se pierde toda la microcopia explicativa, que es justamente la que dice qué poner en "Régimen de contribuciones" y en "Alícuota de ART". En el pie de la portada, "Versión v1.5.0" queda en 2,4:1 y "© 2026 LiquidAR.ar" en 4,35:1 (también por debajo). | Bajar el gris de los rótulos y las ayudas a un slate-600 (#475569 ≈ 7:1) o slate-500 (#64748B ≈ 4,8:1). El resto del sitio ya usa contrastes buenos, es un solo token de color. | accesibilidad | — |
| **alta** | funcional | https://liquidar.ar/calcular/comercio-cct-130-75 — selector "PERÍODO A LIQUIDAR" y encabezado del recibo de la derecha | El recibo se actualiza a medias: el encabezado pasa a decir "Empleados de Comercio · Septiembre 2026" y "Período: Septiembre 2026", pero la plata sigue siendo la de abril (Sueldo Básico $1.090.613,00; con Calcular apretado da $1.196.632,00). Abajo aparece además una nota que habla de abril ("no hay tabla de contribuciones de abril de 2026") dentro de un recibo que dice Septiembre. No hay ningún cartel de "volvé a calcular". Si me distraigo, me llevo un número de abril creyendo que es de septiembre. | O borrar el recibo apenas cambio cualquier dato (y volver al estado "Tu recibo va a aparecer acá"), o dejarlo gris/opaco con un cartel "Datos cambiados: volvé a calcular". Lo que no puede pasar es que el título diga un mes y los números sean de otro. | rompedor | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789331763025-7.jpg y C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789331763026-8.jpg` |
| **alta** | funcional | https://liquidar.ar/calcular/comercio-cct-130-75 — campo "Horas Semanales (Jornada)" y botón "Calcular liquidación" | El botón no hace absolutamente nada visible. No aparece ningún mensaje, el recibo viejo queda intacto (sigue diciendo "Jornada: 36 hs" mientras el campo dice 36,5) y el campo queda con borde verde, que parece de campo correcto. La página salta hacia arriba sin explicar por qué. Lo mismo pasa si el recibo todavía no existía: quedás mirando "Tu recibo va a aparecer acá" apretando un botón muerto. Las jornadas de 36,5 / 37,5 hs son comunes, así que no es un valor raro. | Aceptar decimales (con coma y con punto) en horas semanales y en años de antigüedad; si de verdad tienen que ser enteros, mostrar un mensaje en rojo debajo del campo diciéndolo, en vez de que el botón quede mudo. | rompedor | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789331400636-4.jpg` |
| **alta** | ux | https://liquidar.ar/calcular/camioneros-cct-40-89 — campo "Kilómetros recorridos" (arriba) y botón "Calcular liquidación" (abajo de todo) | No pasa nada: no sale recibo, no sale ningún texto de error en la pantalla, y el formulario simplemente no se manda. El campo culpable está muchos scrolls más arriba que el botón, así que desde donde estoy parado el botón parece roto. Me pasó lo mismo con el decimal de R2: es el mismo problema, un campo inválido lejos del botón deja al botón mudo. | Al tocar Calcular, si algo está mal: pintar el campo en rojo, escribir el error debajo de él y mostrar arriba del botón un resumen tipo "Revisá: Kilómetros recorridos". Nunca dejar que el botón no haga nada y nada más. | rompedor | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789332110197-12.jpg` |
| **media** | funcional | https://liquidar.ar/calcular/comercio-cct-130-75 — descuentos del recibo, con el tilde 'Afiliado al Sindicato (SEC)' | Aparecen juntos 'Cuota Afiliado Sindical (2%) − $30.045,93' y 'Aporte Solidario Gremial (2%) − $30.045,93', más 'Aporte FAECyS (0,5%)' y 'Aporte Fijo OSECAC'. El neto baja de $1.227.994,60 a $1.197.948,67. Como empleado, ver dos descuentos del 2% con nombre casi igual y el mismo importe me da desconfianza: parece que me cobran dos veces lo mismo. No sé si está bien o mal, pero no hay una sola palabra que lo explique. | Si las dos corresponden, poner una nota corta al lado: 'el aporte solidario lo pagan todos; la cuota sindical sólo los afiliados'. Si no corresponden juntas, que al tildar afiliado se reemplace una por la otra. | empleado | — |
| **media** | funcional | https://liquidar.ar/calcular/comercio-cct-130-75 — 'CONTRIBUCIONES A CARGO DEL EMPLEADOR' vs 'COMPOSICIÓN DEL COSTO LABORAL', en el mismo recibo | Arriba dice 'ART (estimada) ... 5% ... $68.419,84' y abajo dice 'A.R.T. $70.043,84 · 10,3% — Empleador $70.043,84'. Son $1.624 de diferencia (justo lo que figura arriba como 'FFEP'), pero en ningún lado dice que se sumaron. Si el sitio se contradice consigo mismo en un número, uno empieza a dudar del resto, incluido el neto. | Usar el mismo importe en las dos tablas, o aclarar en la fila de abajo 'A.R.T. + FFEP'. | empleado | — |
| **media** | funcional | https://liquidar.ar/calcular/comercio-cct-130-75 — bloque 'CÓMO SE HIZO ESTA CUENTA' al pie del recibo | El encabezado dice 'Período: Abril 2026' pero abajo, en letra chica gris, dice 'Contribuciones: tabla de septiembre de 2026' (y 'Ganancias: tabla de enero de 2026'). No hay ningún cartel, ningún color, ningún aviso: hay que ir a leer la letra chica del final para enterarse. La promesa de la portada no se cumple. | Mostrar un cartel amarillo arriba del recibo cuando alguna tabla no es la del período: 'Ojo: para las contribuciones usamos la tabla de septiembre 2026, no la de abril 2026'. | empleado | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789333329736-18.jpg` |
| **media** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — el recibo queda viejo cuando cambiás un dato | El recibo sigue mostrando los números viejos, sin ningún aviso, aunque el formulario ya dice otra cosa. Me pasó de creer que el tilde no servía para nada, porque el número no se movía. Recién al volver a apretar el botón cambió (el neto pasó a $1.778.774,35). Si alguien saca una foto de la pantalla en ese momento, se lleva un número que no corresponde a lo que cargó. | Recalcular solo al cambiar un dato; si no, grisar el recibo y poner 'Cambiaste un dato: tocá Calcular liquidación de nuevo'. | empleado | — |
| **media** | copy | https://liquidar.ar/calcular/comercio-cct-130-75 — formulario y recibo completos | No entendí, y no hay dónde averiguarlo dentro del sitio: 'remunerativo' y 'no remunerativo' (la palabra aparece en los dos títulos más grandes del recibo), 'SAC', 'plus vacacional', 'presentismo', 'alícuota de ART', 'detracción Ley 27.541', 'FFEP', 'SIPA', 'INSSJP', 'FAECyS', 'OSECAC', 'SEC', 'MiPyME', 'Aporte Solidario Gremial'. Sí hay ayuda en 'Régimen de contribuciones' y en 'Alícuota de ART', así que el sitio sabe hacerlo: sólo que no lo hace en el resto. | Poner un signo de pregunta al lado de cada título del recibo con una frase de una línea ('no remunerativo: plata que cobrás pero sobre la que no te descuentan jubilación'), o un glosario al pie. | empleado | — |
| **media** | funcional | https://liquidar.ar/novedades y el listado 'Últimas novedades' de https://liquidar.ar/ | Están corridas un día. La noticia de Camioneros figura '13/09' en la portada y '12 sept 2026' en /novedades. La de Hoteles y Gastronomía figura '15/11' en la portada y '14 nov 2025' en /novedades. La de Empleados de Comercio, '03/11' contra '2 nov 2025'. En un sitio que vive de decir 'esta escala está actualizada hasta tal mes', que las fechas no coincidan entre dos pantallas suyas me hace dudar de las fechas de las escalas. | Unificar de dónde sale la fecha en las dos pantallas. | empleado | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789333158991-16.jpg` |
| **media** | funcional | Los dos recibos — falta cualquier línea de Impuesto a las Ganancias | No hay ninguna línea ni mención en las retenciones. El único rastro es un bullet al pie que dice "Ganancias: tabla de julio de 2026" (liquidando septiembre 2026) y otro que aclara que Ganancias no integra el costo laboral. Nunca sé si se evaluó y dio cero, o si directamente no se calculó. Y el formulario tiene cargas de familia "por si corresponde", lo que refuerza que debería decir algo. | Mostrar siempre la línea de Ganancias, aunque sea en $0,00, con el motivo ("no alcanzado por la deducción especial") y con el período de la tabla usada al lado. | contador | — |
| **media** | funcional | Los dos recibos — la ART figura con dos importes distintos | Difieren en $1.624,00, que es exactamente el FFEP (Fondo Fiduciario de Enfermedades Profesionales) que la tabla lista como fila aparte. O sea, el gráfico lo mete adentro de ART y la tabla lo saca. Nada lo explica. Lo mismo pasa en Gastronómicos ($135.133,20 vs $136.757,20). | Renombrar el ítem del gráfico a "Riesgos del trabajo (ART + FFEP)" o dejar la ART sola en los dos lados. | contador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789333878421-21.png` |
| **media** | funcional | Los dos convenios — se retiene un aporte sindical aunque el trabajador no esté afiliado, sin explicación | Aparece "Contribución Solidaria UTHGRA (2%) − $36.035,52". En Camioneros pasa lo mismo: sin tildar afiliado aparece "Contribución solidaria (2%, tope Ley 27.802)". Puede estar bien (la solidaria alcanza a no afiliados), pero el usuario que destildó "afiliado" ve un descuento sindical igual y no hay una línea que lo justifique. Además la base de la solidaria en Gastronómicos son $1.801.776,00 (el remunerativo SIN el SAC), distinta de la de todo lo demás, y eso tampoco se ve. | Agregar una nota al pie de la línea: "Corresponde también a no afiliados (art. 9 Ley 23.551 / acuerdo X)" y mostrar la base usada. | contador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789334091559-23.png` |
| **media** | funcional | Todo el sitio — no hay forma de guardar, imprimir, compartir ni volver a un cálculo | Ningún botón de guardar/imprimir/compartir. La URL no cambia con los datos, así que no puedo mandarle el caso a un colega ni volver a él. Al recargar se pierde todo: el formulario vuelve a cero y el recibo desaparece. La home lista "Descarga del recibo en PDF" como algo futuro, así que ya lo saben, pero el permalink (que es gratis) tampoco está. | Reflejar los parámetros en la query string y agregar un botón "Copiar link de esta simulación" + una hoja de estilos de impresión, mientras llega el PDF. | contador | — |
| **media** | ux | El botón "Reportar error / sugerencia" está solo en la home (pie), no en la pantalla del recibo | El reporte solo se puede abrir desde la home, donde ya perdí el cálculo. Y el "contexto técnico que se enviará" muestra literalmente "{}" — vacío —, aunque el modal promete "Incluimos contexto técnico para ayudarte más rápido". El que reciba el reporte no va a saber de qué liquidación hablo. (No envié el formulario.) | Poner el botón "Reportar" dentro del recibo y precargar el contexto con convenio, período, categoría, antigüedad y el JSON de entradas. | contador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789334351975-27.png` |
| **media** | copy | Fechas de las novedades: home ("Últimas novedades") vs https://liquidar.ar/novedades | En /novedades las mismas entradas dicen 12 sept 2026, 12 sept 2026, 14 nov 2025, 11 nov 2025 y 2 nov 2025. Todas corridas un día respecto de la home. En un sitio cuyo valor es justamente la fecha de vigencia de cada acuerdo, una fecha que cambia según la pantalla me hace desconfiar del resto. | Formatear las fechas siempre en la misma zona horaria (parece un UTC vs local) y mostrar el año también en la home. | contador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789334295695-25.jpg` |
| **media** | ux | https://liquidar.ar/calcular/gastronomicos-cct-389-04 — campo "Zona / Escala" | No hay ninguna explicación, ni al lado del campo ni en el recibo (que solo repite "Escala A"). Liquidando para clientes del interior no tengo cómo saber cuál me toca, y elegir mal cambia todos los números del recibo. | Agregar un "?" con el detalle de zonas de cada escala y repetir la aclaración en el encabezado del recibo. | contador | — |
| **media** | funcional | https://liquidar.ar/calcular/comercio-cct-130-75 — recibo: tabla 'CONTRIBUCIONES A CARGO DEL EMPLEADOR' y bloque 'COMPOSICIÓN DEL COSTO LABORAL' | Arriba dice ART (estimada) 5% = $64.817,37. Abajo dice A.R.T. $66.441,37 (Empleador $66.441,37). Son $1.624,00 de diferencia, justo el importe de la fila 'FFEP (Fondo Fiduciario de Enfermedades Profesionales)'. Supongo que abajo se le suma el FFEP a la ART, pero en ningún lado lo aclara y arriba el FFEP figura como fila aparte. Si le muestro esto al contador o al de la ART, no sé cuál de los dos números decirle. | Usar el mismo importe en los dos lugares, o rotular la fila de abajo como 'A.R.T. + FFEP' con una nota que diga qué incluye. | empleador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789334855504-31.jpg` |
| **media** | funcional | https://liquidar.ar/calcular/comercio-cct-130-75 — campo 'Alícuota de ART' en 'LO QUE PAGA EL EMPLEADOR' | Con el campo vacío calcula igual y usa 5% ($64.817,37), sin ningún cartel. El único lugar donde lo dice es una viñeta al final de todo, en 'CÓMO SE HIZO ESTA CUENTA'. Lo comprobé escribiendo 0 en el mismo campo: ahí sí pone 0% y $0,00, y el costo total baja a $1.746.058,24. O sea que vacío y cero dan resultados distintos sin que nada lo anticipe. Encima acepta 0% de ART sin chistar, y la ART no es opcional. | Si el campo queda vacío, mostrar en el recibo una línea visible al lado de la ART: 'estimada al 5% porque no cargaste tu alícuota'. Y avisar si se carga 0%. | empleador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789334901687-32.jpg` |
| **media** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — bloque 'COMPOSICIÓN DEL COSTO LABORAL' | No lo es. $354.308,44 sobre $1.810.875,61 da 19,6%, no 55%. Sumando todas las filas del bloque me da $644.566,38 y ahí sí el 55% cierra, pero ese total no aparece en ninguna parte de la pantalla. Me quedé un rato tratando de entender de qué era el 55% y llegué sumando a mano. Además el bloque mezcla lo que pago yo con lo que le descuentan a él, que no es lo mismo para mi bolsillo. | Mostrar la fila de total ('Total de aportes y contribuciones $644.566,38 = 100%') y cambiar el título por algo como 'Composición de las cargas (empleador + trabajador)'. | empleador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789334855504-31.jpg` |
| **media** | copy | https://liquidar.ar/ — encabezado y tarjetas de convenio | Todo está escrito para el empleado: 'Simulá TU recibo de sueldo en segundos', 'Elegí TU convenio', 'obtené una liquidación estimada'. La palabra empleador no aparece por ningún lado salvo enterrada en una novedad de la columna lateral ('El recibo ahora muestra el costo laboral total del empleador'). Yo entré buscando cuánto me cuesta tomar a alguien y estuve a punto de cerrar la página creyendo que era una calculadora de recibos para trabajadores. | Agregar una línea en la bajada del tipo '¿Sos empleador? También te muestra el costo laboral total: sueldo más cargas, ART y sumas fijas.' | empleador | — |
| **media** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — desplegable 'Categoría' en 'DATOS DEL PUESTO' | Hay 21 opciones (Administrativo A a F, Auxiliar Especializado, Cajero, Maestranza, Personal Auxiliar, Vendedor A a D) y ni una línea de explicación. Yo sé que voy a tomar un administrativo, pero no tengo idea de si le corresponde A, B, C, D, E o F. Dejé la que venía (Administrativo A) sin saber si estaba bien. Probé con Administrativo C para ver cuánto cambiaba: el costo pasa de $1.810.875,61 a $1.825.114,69, así que la diferencia es chica, pero eso lo descubrí probando, no porque el sitio me lo dijera. | Poner debajo del desplegable una ayuda con las tareas típicas de cada categoría, o un '?' que muestre el texto del convenio. Y, ya que las diferencias son chicas, ofrecer comparar dos categorías lado a lado. | empleador | — |
| **media** | funcional | https://liquidar.ar/ (bloque 'Antes de liquidar') vs. el recibo en /calcular/comercio-cct-130-75 | Dice, en una viñeta gris igual a todas las demás, 'Ganancias: tabla de julio de 2026' mientras estoy liquidando septiembre 2026. No hay ningún cartel ni resaltado. Si el sitio promete avisarme, yo confío en que la ausencia de aviso significa que está todo al día, y no lo está. (Puede ser que la promesa se refiera sólo a las escalas salariales y no a Ganancias, pero eso desde la pantalla no se distingue.) | Resaltar en ámbar toda tabla cuyo mes no coincida con el período liquidado, o aclarar en la home que el aviso cubre sólo las escalas del convenio. | empleador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789335427449-37.jpg` |
| **media** | ux | https://liquidar.ar/ — diálogo "Reportar error / sugerencia" | La barra verde del sitio queda dibujada encima del cuadro: tapa el título "Reportar error / sugerencia" y la ✕. Lo primero que leo es una frase suelta a mitad de oración. Donde está la ✕ en realidad toco el botón del menú del sitio, y el cuadro no se cierra. Sí se cierra tocando "Cancelar" o el fondo oscuro, pero lo descubrí probando. | Que el cuadro quede por encima del encabezado (o que el encabezado se oculte mientras el cuadro está abierto), para que el título y la ✕ se vean y se puedan tocar. | celular | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789336460237-42.png y C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789336485738-43.png` |
| **media** | ux | Todo el sitio (portada, /novedades, /calcular/...) — franja entre el encabezado y el primer contenido | Hay una franja vacía grande: en Novedades el título tarda 128 px en aparecer, con la barra verde de 80 px encima. Entre las dos cosas me como más de 200 px de pantalla en blanco en cada página antes de leer nada, en un celular donde el alto es lo que falta. En la portada pasa igual: el bloque del título arranca bien abajo. | Sacar el espacio extra de arriba en pantallas angostas (parece que se reserva el alto del encabezado dos veces) y dejar un margen de 16-24 px. | celular | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789336325928-41.png` |
| **media** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — formulario y resultado | El botón "Calcular" está a unos 1.900 px del inicio: bajé unas 3 pantallas y media pasando por 16 campos, muchos de los cuales (régimen de contribuciones, alícuota de ART, cuota fija) no tengo idea y no son míos. Después de calcular, el "Neto a cobrar" está otros 1.900 px más abajo, porque primero viene todo el costo del empleador. Para cambiar un dato hay que volver a subir todo a dedo: no hay botón de "volver al formulario" ni nada fijo en pantalla. (Vi en Novedades que mostrar el costo del empleador antes del bruto es a propósito, por una norma; igual el problema de distancia queda.) | Agrupar/colapsar los campos del empleador (que ya traen valores por defecto) y dejar visibles sólo categoría, período y horas; poner el botón "Calcular" fijo abajo mientras se completa; y arriba del resultado un resumen con el neto, con el detalle debajo. | celular | — |
| **media** | ux | https://liquidar.ar/calcular/camioneros-cct-40-89 — desplegable "Categoría" | Está ordenada alfabéticamente y eso rompe los números: aparece "Administrativo de cuarta categoría" antes que "de primera", y en las grúas viene "de más de 10 y hasta 20 tn", después "de más de 110 y hasta 140 tn", "de más de 140...", "de más de 170...", "de más de 300 tn" y recién ahí "de más de 20 y hasta 35 tn". En una lista larga y en el celular, buscar la mía es un rompecabezas. | Ordenar por escalafón/tonelaje real (primera, segunda, tercera, cuarta; 10, 20, 35, 45...) y agrupar por familia (Administrativos, Choferes, Grúas) con separadores. | celular | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789336557390-44.png` |
| **media** | ux | https://liquidar.ar/calcular/camioneros-cct-40-89 — desplegable "Categoría" ya elegido | El campo es más angosto que la tarjeta y el texto se corta justo en el número: se lee "Conductor de grúas de más de 1". No puedo saber si elegí la de 110-140 o la de 10-20 tn, que es lo único que cambia el sueldo. En el recibo sí aparece completo, pero recién después de calcular. | Que el desplegable ocupe todo el ancho de la tarjeta y, si igual no entra, mostrar debajo la categoría elegida completa en dos líneas. | celular | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789336557390-44.png` |
| **media** | accesibilidad | Todo el sitio — estructura de landmarks: elemento <main> y elementos <nav> | Hay un <main> anidado dentro de otro <main>. En la lista de regiones de un lector de pantalla aparecen dos "principal", y saltar al contenido principal deja de ser un movimiento único y predecible. Los dos <nav> aparecen como dos "navegación" con los mismos dos enlaces, sin forma de distinguirlos. | Dejar un solo <main> (el exterior puede ser un <div>) y poner aria-label="Principal" / aria-label="Menú móvil" en los <nav>. | accesibilidad | — |
| **media** | accesibilidad | Todo el sitio — no hay enlace "saltar al contenido" | No existe. En la portada el encabezado es corto y se tolera, pero en la calculadora hay que atravesar 5 paradas de encabezado (2 de ellas invisibles, ver R3) en cada carga antes de llegar al formulario, y no hay atajo para saltar del formulario al recibo ni al revés. | Agregar un "Saltar al contenido" como primer elemento enfocable, y en la calculadora un segundo salto "Ir al recibo". | accesibilidad | — |
| **media** | accesibilidad | https://liquidar.ar/calcular/comercio-cct-130-75 — indicador de foco de los inputs y selects del formulario | Los campos llevan outline:none y lo reemplazan por un borde verde (#10b981, ≈2:1 contra el blanco) más un halo de 2 px en verde casi blanco (#e0f5e8, ≈1,1:1 contra el blanco). Se nota, pero es sutil: la diferencia real con un campo sin foco es un borde fino que cambia de gris a verde. En cambio las tarjetas de convenio de la portada sí tienen un outline de 3 px bien oscuro y se ven perfectas, así que el sitio ya sabe hacerlo. | Usar en los campos el mismo outline sólido y oscuro de 2–3 px que ya usan las tarjetas, o subir el halo a emerald-400/500. | accesibilidad | — |
| **media** | funcional | https://liquidar.ar/calcular/comercio-cct-130-75 — campo "Horas Semanales (Jornada)" | Con 999 calcula sin chistar y muestra un recibo de más de 3 millones con la leyenda "Jornada: 999 hs de 48 semanales". Con el campo vacío también calcula y el recibo dice "Jornada: 48 hs de 48 semanales": rellena 48 por su cuenta sin decírselo a nadie. No hay ningún mensaje de error en toda la página, ni aria-invalid, ni aria-describedby, ni max en el input (sólo min=0). | Poner max razonable (48) y un mensaje de validación con aria-describedby + aria-invalid; si el campo vacío toma 48 por defecto, decirlo en el recibo como "asumido". | accesibilidad | — |
| **media** | funcional | Fecha de la misma novedad en la portada (tarjeta "Últimas novedades") vs https://liquidar.ar/novedades | La portada dice 13/09 y /novedades dice "12 sept 2026". Un día de diferencia para el mismo ítem (pasa con los dos ítems más nuevos). Parece un problema de zona horaria: supongo que una pantalla formatea en UTC y la otra en hora local, pero es sólo una suposición mía desde lo que veo. | Formatear la fecha en un único lugar y con la misma zona horaria en ambas pantallas. | accesibilidad | — |
| **media** | ux | https://liquidar.ar — tarjeta "Últimas novedades" de la portada | Las fechas van sin año, así que la lista parece desordenada (13 de septiembre arriba y 15 de noviembre debajo). Recién entrando a /novedades descubrí que las tres de noviembre son de 2025 y las de septiembre de 2026. En la portada no hay forma de saberlo. Con lector de pantalla es peor: son textos sueltos "13/09", sin elemento <time datetime> ni fecha legible. | Mostrar el año cuando no es el año en curso ("15/11/2025") y envolver la fecha en <time datetime="2025-11-15">. | accesibilidad | — |
| **media** | accesibilidad | Título del documento (pestaña del navegador) en la portada y en las calculadoras | Las tres páginas comparten exactamente el mismo título: "LiquidAR — Calculadora de sueldos por convenio colectivo". Un lector de pantalla anuncia el título al cargar cada página, así que al pasar de la portada a la calculadora de Comercio y de ahí a la de Camioneros se oye siempre lo mismo, sin confirmación de que la navegación funcionó. Con varias pestañas abiertas tampoco se distinguen. /novedades sí tiene título propio ("Novedades — LiquidAR"), así que el patrón bueno ya existe. | Título por página: "Empleados de Comercio (CCT 130/75) — LiquidAR". | accesibilidad | — |
| **media** | copy | https://liquidar.ar/calcular/comercio-cct-130-75 — bloque amarillo dentro del recibo, sección "CONTRIBUCIONES A CARGO DEL EMPLEADOR" | Dice textual: "Desde el 01/06/2026 el recibo tiene que mostrar las contribuciones del empleador, y para abril de 2026 no hay tabla cargada. Se carga en /admin → Contribuciones." Eso es una instrucción para el que administra el sitio, no para mí: yo no tengo ningún /admin ni puedo cargar nada. Además me confunde, porque el propio mensaje dice que la obligación empieza el 01/06/2026 y yo estoy liquidando abril, o sea un mes anterior a esa fecha: no entiendo si me falta algo, si el sitio está roto, o si el dato simplemente no corresponde. | Para el visitante: "Para abril de 2026 todavía no hay tabla de contribuciones cargada, así que este recibo no las muestra." Y si el período es anterior al 01/06/2026, directamente no mostrar el aviso. La referencia a /admin va a los logs, no a la pantalla. | rompedor | — |
| **media** | ux | https://liquidar.ar/una-pagina-que-no-existe — página de error 404 | Aparece una pantalla negra con "404" y "This page could not be found.", en inglés, con tipografía y colores que no tienen nada que ver con el resto del sitio (todo verde y blanco). Parece la pantalla de error crudo del framework, no del sitio. No hay ningún link para volver al inicio dentro del cuerpo. | Hacer una 404 propia: mismo diseño, en castellano ("No encontramos esta página") y un botón "Ver las calculadoras". | rompedor | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789331844871-9.jpg` |
| **media** | funcional | https://liquidar.ar/ (columna "Últimas novedades") vs https://liquidar.ar/novedades | En el inicio dice 13/09 y en /novedades dice "12 sept 2026". No es un caso aislado: las cinco novedades están corridas un día. Inicio 13/09 → 12 sept 2026; inicio 15/11 → 14 nov 2025; inicio 12/11 → 11 nov 2025; inicio 03/11 → 2 nov 2025. En un sitio donde la fecha de un acuerdo salarial es el dato que define qué escala te toca, dos fechas distintas para la misma novedad me hacen desconfiar de todo lo demás. | Unificar cómo se arma la fecha en las dos pantallas (parece un tema de zona horaria: una la muestra en UTC y la otra en hora local). De paso, en el inicio la fecha va sin año y mezcla 13/09 (2026) con 15/11 (2025) en la misma lista, así que en orden se lee raro. | rompedor | — |
| **media** | ux | Vista de 400 px de ancho (celular) en https://liquidar.ar/calcular/gastronomicos-cct-389-04 — tabla "CONTRIBUCIONES A CARGO DEL EMPLEADOR" | La tabla queda metida en un recuadro angosto de unos 240 px dentro de una pantalla de 400: los nombres se parten en cuatro o cinco renglones ("FFEP (Fondo Fiduciario de Enfermedades Profesionales)") y la columna de la derecha queda cortada al medio (se ve "— s" donde debería decir "suma fija", y los importes no entran). Hay que arrastrar de costado un cajoncito chiquito para ver cuánto paga el empleador. El resto del recibo sí se adapta bien, así que esta tabla desentona. | En pantallas chicas mostrar esa tabla como lista apilada (concepto arriba, base y alícuota chiquitas debajo, importe alineado a la derecha), igual que ya hacen las secciones de haberes y descuentos. | rompedor | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789332031090-11.png` |
| **media** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 y https://liquidar.ar/calcular/camioneros-cct-40-89 — campos numéricos del formulario | Calcula todo sin decir una palabra y arma un recibo de apariencia formal. Comercio me da un neto de $25.081.084,56 con 1.000 horas extras en un mes (un mes tiene 720 horas). Camioneros me pone "Plus vacacional (365 días)", "Pernoctada (999 días)" y "Comida (99 días)" cuando el propio campo dice "en el mes", y me da un neto de $24.588.614,66. Para bien: en ningún caso salió NaN, undefined ni un $0,00 fuera de lugar, y los negativos se toman como 0. Pero si me equivoco tipeando un 99 en vez de un 9, el sitio me deja irme con un recibo absurdo y con cara de correcto. | Poner topes razonables (antigüedad hasta ~60, horas extras hasta ~200, días del mes hasta 31, pernoctes hasta 31, vacaciones hasta 35) y, si me paso, un aviso amarillo tipo "999 pernoctes en un mes no es posible". Llama la atención que el campo rechace 36,5 horas (R2) pero acepte 365 días de vacaciones en un mes: la validación está puesta donde molesta y falta donde importa. | rompedor | — |
| **media** | ux | https://liquidar.ar/calcular/loquesea — cuerpo de la página | La página queda casi vacía: solo un texto chiquito en rojo en el medio que dice "Convenio no encontrado." y nada más. Ningún botón, ninguna lista, ninguna sugerencia. Lo único para salir es el link "Calculadora" de la barra de arriba, que no se lee como "volver". Encima el título del navegador sigue siendo el normal del sitio, así que ni por ahí me entero de que es un error. | Debajo del mensaje, listar los 3 convenios disponibles con sus links, o un botón "Ver convenios disponibles". | rompedor | — |
| **baja** | ux | https://liquidar.ar/ — recuadro 'Últimas novedades' | Dice '13/09', '13/09', '15/11', '12/11', '03/11', sin año. Leído así parece desordenado o parecen fechas futuras; recién entrando a /novedades descubrí que las primeras son de 2026 y las otras de 2025. | Mostrar el año, aunque sea chiquito, o poner 'hace 2 días' / 'nov 2025'. | empleado | — |
| **baja** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — campo 'Horas Semanales (Jornada)' | Calcula igual y da un recibo completo. En el encabezado dice 'Jornada: 48 hs de 48 semanales', pero el campo del formulario sigue vacío en la pantalla. O sea, la pantalla y el recibo dicen cosas distintas, y yo no sé si el número que estoy leyendo es por 48 horas o por las que yo hago. | O marcar el campo en rojo con 'Completá las horas', o rellenarlo automáticamente con 48 y avisar 'usamos la jornada completa del convenio'. | empleado | — |
| **baja** | copy | https://liquidar.ar/ — ventana 'Reportar error / sugerencia' (botón del recuadro 'Antes de liquidar', y también el link '¿No está tu convenio? Pedinos que lo agreguemos') | El ejemplo dice 'Ej: El presentismo de SISP en 2025-10 categoría 8 no coincide...'. No sé qué es SISP ni existe ninguna 'categoría 8' en esta calculadora (acá son 'Vendedor B', 'Cajero A'...). 'Ver contexto técnico que se enviará' se abre y muestra literalmente '{}'. Y 'Pedinos que lo agreguemos' abre exactamente la misma ventana genérica de reportar error, sin ningún campo ni texto que hable de convenios faltantes. (No mandé el formulario.) | Poner un ejemplo con palabras del sitio ('Ej: soy Vendedor B y mi recibo de septiembre me da $20.000 menos que acá'); si el contexto técnico está vacío, esconder el desplegable; y que el link de convenio faltante abra el formulario con el texto 'Falta el convenio: ____'. | empleado | — |
| **baja** | rendimiento | https://liquidar.ar/calcular/comercio-cct-130-75 — pantalla de carga inicial | Se queda un rato largo con el cartel 'Conectando con la base de datos…' y el formulario vacío: a los 5 segundos todavía estaba así, y tardó del orden de 10 segundos en aparecer. 'Conectando con la base de datos' es lenguaje de programador y, cuando tarda, suena a que algo se rompió. | Cambiar el texto por 'Cargando las escalas del convenio…' y mostrar el formulario aunque las escalas todavía estén viniendo. | empleado | — |
| **baja** | accesibilidad | https://liquidar.ar/calcular/comercio-cct-130-75 — barra flotante abajo a la derecha, invisible en pantalla | En el recorrido aparecen un link 'Admin' (que lleva a /admin) y un botón 'Salir' que en pantalla no se ven, porque están con transparencia total. Yo, como visitante común, no tengo nada que hacer ahí, pero me los encuentro navegando con el teclado. Sólo lo anoto, no entré. Supongo que es una barra de administración que debería aparecer sólo si estás logueado. | No incluir esa barra en la página cuando no hay sesión iniciada, en vez de dejarla puesta e invisible. | empleado | — |
| **baja** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — bloque 'COMPOSICIÓN DEL COSTO LABORAL' | Hay una fila 'Cámaras y entidades empresariales' cuyo único contenido es un guion '—'. Y los porcentajes de ese bloque (5,5% + 55% + 19,9% + 9,2% + 10,3% + 0,1%) no son porcentajes del 'Costo laboral total' que se muestra más arriba, así que no pude atar un bloque con el otro. | Esconder las filas vacías y aclarar sobre qué total están calculados esos porcentajes. | empleado | — |
| **baja** | copy | https://liquidar.ar/calcular/camioneros-cct-40-89 — bloque "CÓMO SE HIZO ESTA CUENTA" | Aparece el bullet "El SAC integra la base de contribuciones" aunque no se liquidó ningún SAC. Es ruido que hace dudar de si el SAC entró en algún lado sin verse. | Mostrar ese bullet solo cuando el SAC está incluido. | contador | — |
| **baja** | copy | Nombre del convenio gastronómico: home y calculadora vs /novedades | Se lo llama "Gastronómicos (UTHGRA)" en un lado y "Hoteles y Gastronomía (UTGHRA–FEHGRA)" en el otro, con la sigla escrita de dos formas distintas (UTHGRA / UTGHRA; una de las dos está mal tipeada). No queda claro si son la misma calculadora. | Unificar el nombre y la sigla, y usar el mismo en novedades, tarjeta y recibo. | contador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789334295695-25.jpg` |
| **baja** | ux | Cabecera del sitio (todas las páginas) — link "Admin" y botón "Salir" | Visualmente la cabecera solo muestra "Calculadora" y "Novedades", pero en el árbol de elementos de la página aparecen antes un link "Admin" (a /admin) y un botón "Salir". No entré a /admin. Puede ser que estén ocultos solo por CSS; para alguien que navega con teclado o lector de pantalla serían dos paradas confusas. | No renderizar esos elementos cuando no hay sesión, en lugar de esconderlos. | contador | — |
| **baja** | ux | https://liquidar.ar/calcular/gastronomicos-cct-389-04 — checkbox "¿Tuvo asistencia perfecta este mes?" | Viene tildado por defecto y suma "Asistencia Perfecta (10%)" = $142.998,10 al bruto. Si no lo miro, liquido de más. El recibo lo lista como un haber más, sin marcarlo como supuesto por defecto. | Dejarlo apagado por defecto, o listarlo entre los supuestos del bloque "Cómo se hizo esta cuenta". | contador | — |
| **baja** | funcional | https://liquidar.ar/ (columna 'Últimas novedades') vs https://liquidar.ar/novedades | Están corridas un día. La home dice 13/09, 13/09, 15/11, 12/11, 03/11; la página de novedades dice, para las mismas entradas, 12 sept 2026, 12 sept 2026, 14 nov 2025, 11 nov 2025, 2 nov 2025. Además la home no muestra el año, así que ver '13/09' arriba de '15/11' me hizo dudar de si la lista estaba bien ordenada. En un sitio cuyo valor es 'hasta qué mes están cargadas las escalas', las fechas tienen que cerrar. | Unificar el formateo de fecha (parece un corrimiento de zona horaria) y mostrar el año también en la home. | empleador | — |
| **baja** | ux | https://liquidar.ar/ — botón 'Reportar error / sugerencia' y su ventana | La página de la calculadora no tiene pie ni botón de reporte: hay que volver a la home. Y ahí la ventana dice 'Incluimos contexto técnico para ayudarte más rápido' pero al desplegarlo muestra solamente '{}'. O sea que tengo que escribir a mano convenio, período, categoría y el número que no me cerró. | Poner el botón de reportar dentro del recibo y precargar el contexto con los datos de la liquidación en pantalla. | empleador | — |
| **baja** | copy | https://liquidar.ar/calcular/comercio-cct-130-75 — última viñeta de 'CÓMO SE HIZO ESTA CUENTA' | $9.054,38 x 8 = $72.435, pero el costo por día dice $60.362,52. Es que la hora se saca sobre 200 hs mensuales y el día sobre 30 días corridos: dos bases distintas pegadas en el mismo renglón. Para mí, que quiero saber cuánto me cuesta un día de trabajo, las dos cifras se contradicen. | Aclarar la base en cada una: 'por hora trabajada (200 hs/mes)' y 'por día corrido (30 días)', o agregar además el costo por día trabajado. | empleador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789335427449-37.jpg` |
| **baja** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — fila 'Cámaras y entidades empresariales' en 'COMPOSICIÓN DEL COSTO LABORAL' | La fila aparece con un guión y nada más, sin barra ni porcentaje ni aclaración. Como empleador me quedé con la duda de si eso significa que no me corresponde pagar nada a la cámara, o que el sitio todavía no lo calcula. | Mostrar '$0,00 — no corresponde en este convenio' o esconder la fila cuando está vacía. | empleador | — |
| **baja** | accesibilidad | https://liquidar.ar/calcular/comercio-cct-130-75 — encabezado de la página | Las dos primeras paradas del tabulador son un enlace 'Admin' (apunta a /admin) y un botón 'Salir' que yo no veo por ninguna parte de la pantalla. Como visitante me desconcertó: navegando con teclado quedás dos veces en controles invisibles antes de llegar a nada útil. No entré a /admin. Supongo que este navegador ya tenía una sesión abierta del dueño del sitio y por eso me aparecen, pero desde la pantalla no lo puedo saber. | Si esos controles no se muestran, sacarlos del orden de tabulación; si se muestran, que se vean. Y revisar que no aparezcan para quien no tiene sesión. | empleador | — |
| **baja** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — jerarquía visual del recibo | El único número en caja grande y con color es 'Neto a cobrar $1.166.309,23'. El 'Costo laboral total $1.810.875,61', que es el que yo vine a buscar, va en una fila chica dentro de un recuadro gris. Se encuentra, pero hay que ir a buscarlo; el ojo se va al neto. | Dar al 'Costo laboral total' el mismo destaque que al neto, o un selector arriba del recibo tipo 'Ver como empleado / Ver como empleador' que ordene el recibo según quién mira. | empleador | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789334798521-30.jpg` |
| **baja** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — bloque de totales y caja verde "Neto a cobrar" | En "Total no remunerativo" el "+" queda solo en un renglón y el "$136.499,58" cae en el de abajo, como si fueran dos datos. Y en la caja verde el texto se parte en tres renglones de una palabra cada uno: "Neto" / "a" / "cobrar", apretado contra el número. Se entiende, pero el dato más importante del sitio se ve amontonado. | En angosto poner el rótulo arriba y el importe abajo (o dejar que "Neto a cobrar" ocupe el ancho completo en una línea), y no separar nunca el signo del número. | celular | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789336195658-40.png` |
| **baja** | copy | Resultado de cualquier calculadora — línea "Jornada:" del resumen | Dice "Jornada: 48 hs de 48 semanales". Leído al pasar no se entiende qué es cada 48; parece un error de redacción. Con 24 queda "24 hs de 48 semanales", que suena a que trabajo 24 horas durante 48 semanas. | Algo como "Jornada: 24 hs semanales sobre una jornada completa de 48 hs". | celular | — |
| **baja** | copy | Etiqueta del campo de horas en /calcular/comercio-cct-130-75 vs /calcular/camioneros-cct-40-89 | En Camioneros dice "Horas semanales (jornada completa del CCT: 44)", que me dice exactamente qué poner. En Comercio dice sólo "Horas Semanales (Jornada)" y tengo que adivinar contra qué se compara (recién en el resultado me entero de que la base son 48). | Usar en todos los convenios la fórmula de Camioneros, con la jornada completa del CCT entre paréntesis. | celular | — |
| **baja** | accesibilidad | https://liquidar.ar/calcular/comercio-cct-130-75 — bloque "PERÍODO A LIQUIDAR" (primera sección del formulario) | "Período a liquidar" está maquetado igual que las otras secciones pero no es un encabezado, es texto suelto. Navegando por encabezados (tecla H) se saltea la primera sección del formulario, que es la que define el mes que se liquida. El resto de la jerarquía está bien (h1 → h2 → h3, sin saltos). | Convertirlo en h2 como los demás, o mejor: usar <fieldset><legend> para cada grupo del formulario. | accesibilidad | — |
| **baja** | accesibilidad | https://liquidar.ar/calcular/comercio-cct-130-75 — recibo, tabla "Contribuciones a cargo del empleador" | Es la única tabla real del recibo y los cuatro <th> no declaran scope. Con una sola fila de encabezados la mayoría de los lectores lo infiere, así que el impacto es chico, pero es una línea de código. Aparte, el resto del recibo (Haberes remunerativos, Descuentos y retenciones) no es tabla sino pares de <span> en flex: se lee como "Sueldo Básico, $1.222.103,00, Antigüedad, $85.547,21..." en corrido, lo cual funciona pero no permite navegar por columnas. | Agregar scope="col" a los <th>; y si se puede, dar a los bloques de haberes/descuentos estructura de <dl> o de tabla para que se naveguen igual que la de contribuciones. | accesibilidad | — |
| **baja** | accesibilidad | https://liquidar.ar — modal "Reportar error / sugerencia", contenido de fondo | El Tab sí queda atrapado dentro del modal (eso funciona bien), pero el contenido de fondo no está marcado como inerte, así que un lector de pantalla en modo exploración puede seguir recorriendo y leyendo la página de atrás como si el modal no existiera. | Poner inert (o aria-hidden="true") en el contenedor de la página mientras el modal está abierto. | accesibilidad | — |
| **baja** | ux | https://liquidar.ar/novedades — los ítems del listado | La novedad anuncia una calculadora nueva pero no se puede ir a ella desde ahí: hay que volver a Calculadora y buscarla en la portada. Para quien navega con teclado son varias paradas extra por algo que el texto mismo está ofreciendo. | Enlazar al menos las novedades de tipo "release" a la calculadora correspondiente. | accesibilidad | — |
| **baja** | copy | https://liquidar.ar/ — modal "Reportar error / sugerencia", bloque desplegable "Ver contexto técnico que se enviará" | Se despliega y muestra literalmente "{}" — dos llaves vacías. O sea que en el inicio no se envía ningún contexto, pero el texto igual promete que sí. Y "{}" es jerga de programador, no algo que yo tenga que ver. | Si no hay contexto, escribir "Desde esta pantalla no se envía información técnica" y sacar el desplegable. Y cuando sí hay, mostrarlo como lista legible (Convenio: …, Período: …, Categoría: …), no como JSON. | rompedor | `C:\Users\Victoria\AppData\Local\Temp\claude-chrome-screenshots-bpRxND\screenshot-1789331928558-10.png` |
| **baja** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — campos "Horas Semanales (Jornada)" y "Años de Antigüedad" | Calcula igual, en silencio, como si hubiera puesto 48 horas y 0 años: el resultado es idéntico al de los valores por defecto. El único lugar donde me entero es una línea chica del encabezado del recibo ("Jornada: 48 hs de 48 semanales"), mientras el campo del formulario sigue mostrando 0 o -20. Quedan dos números distintos en pantalla al mismo tiempo. No es grave porque el recibo termina siendo correcto, pero me deja dudando de cuál se usó. | Cuando reemplacen lo que escribí por un valor por defecto, decirlo debajo del campo: "Usamos 48 hs (jornada completa del convenio)", y devolver el campo a 48 para que no queden dos verdades en pantalla. | rompedor | — |
| **baja** | ux | https://liquidar.ar/empleador | Me manda derecho al inicio (la URL queda en https://liquidar.ar/) sin decir nada. Si llegué ahí por un link viejo o un favorito, no tengo forma de saber si la sección se mudó, se borró, o si escribí mal. Curioso: /calcular/loquesea sí avisa (R9) y /una-pagina-que-no-existe tira 404 (R5), o sea que hay tres comportamientos distintos para tres direcciones inexistentes. | Unificar: o 404 propia para todo lo que no existe, o si es una redirección a propósito, avisarlo con una franja arriba ("Esta sección ya no existe, te llevamos al inicio"). | rompedor | — |
| **baja** | funcional | https://liquidar.ar/ — botón "Reportar error / sugerencia" | La primera vez no se abrió nada y no pasó nada durante varios segundos; recién al segundo click apareció el modal. Después, con la página ya asentada, abrió siempre al primer toque (lo probé tres veces más y tardó poco más de un segundo). Lo anoto como lo vi una sola vez: parece que si tocás el botón enseguida de cargar, el click se pierde. | Si el botón todavía no está listo, dejarlo deshabilitado o mostrarle algún estado de "cargando", así el click no se pierde en el aire. | rompedor | — |
| **baja** | ux | https://liquidar.ar/calcular/comercio-cct-130-75 — formulario completo y barra de direcciones | Se borra todo y vuelve a los valores iniciales (Septiembre 2026, antigüedad 0, casillas destildadas). Además la URL nunca cambia mientras uso la calculadora, así que un recibo que armé no se puede guardar en favoritos ni pasarle a nadie. Si me recargó sin querer después de cargar diez campos, los cargo de nuevo todos. | Guardar los datos en la propia dirección (por ejemplo ?periodo=2026-07&categoria=...&antiguedad=17) o recordar lo último cargado en el navegador. De paso queda el "compartir mi liquidación", que para este sitio suena útil. | rompedor | — |
| **baja** | funcional | https://liquidar.ar/calcular/comercio-cct-130-75 — sección "DESCUENTOS Y RETENCIONES" del recibo | Me aparecen dos descuentos gremiales del 2% al mismo tiempo: "Cuota Afiliado Sindical (2%) − $42.735,12" y "Aporte Solidario Gremial (2%) − $42.735,12". Si destildo la casilla queda solo el Aporte Solidario. Tenía entendido que el aporte solidario es justamente lo que se le cobra al que NO está afiliado, así que verlos juntos me hace ruido. Aparte, el "Aporte Fijo OSECAC" de $100 lo suman en el bloque "Sindical" del costo laboral y no en "Obra social", aunque OSECAC sea la obra social. | Si es correcto que se cobren los dos, agregar una aclaración de una línea; si no, dejar solo el que corresponde según la casilla. Y revisar en qué grupo del costo laboral cae el aporte fijo de OSECAC. | rompedor | — |

## Límites del método

- Son personas simuladas: encuentran fricción evidente y errores reproducibles, no el gusto ni la historia de un usuario real.
- Corrieron de a una en una sola ventana de Chrome, a 1366 px; el celular se simuló con un marco de 400 px.
- Nada de lo listado se arregló en esta pasada: primero se decide qué vale la pena.

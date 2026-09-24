# Auditoría integral del 23 de septiembre de 2026

Informe final. Lo escribí después de leer los seis mapas de subsistema, los
hallazgos juzgados, el informe en frío del 13/9 y `docs/criterio.md`, y después
de verificar a mano las líneas de los hallazgos que propongo tocar primero.

## Cómo se hizo

Seis agentes mapearon el proyecto por subsistemas (motor y cálculo, panel y
datos, pantalla y recibo, seguridad e infraestructura, tests y criterio,
producto y normativa). Sobre esos mapas se pasaron **doce lentes**: cálculo,
normativa, seguridad, UX, criterio, tests, infraestructura, datos, flujo de
punta a punta, continuidad operativa, lo legal y lo público, y los 84 hallazgos
del crudo del 13/9.

Cada hallazgo lo juzgaron **tres verificadores independientes**, con la
instrucción explícita de refutar: de 147 propuestos, **138 quedaron confirmados
por mayoría**, **2 quedaron plausibles** (sin mayoría) y **7 fueron refutados**.
En este informe los 138 están consolidados: varios llegaron dos veces por
lentes distintos (la base de Ganancias apareció en `calculo` y en `normativa`;
la columna Base del celular, en `ux` y en el triage del crudo), así que las
filas de abajo agrupan duplicados sin perder ninguna evidencia. Unos dieciocho
quedaron en severidad alta.

Lo que verifiqué yo, además de leer: corrí `npx vitest run` completo (**36
archivos, 576 tests, verde, 9,8 s, vitest 4.1.10**), leí las líneas citadas en
los diez primeros hallazgos y revisé el `git log` del 23/9. Todo lo que
spot-chequeé coincidió con lo reportado, y por eso trato el resto del corpus
como confiable. Lo que **no** pude verificar está en "Límites del método", al
final. Como manda `docs/auditorias/README.md`: nada se arregla en esta pasada.

## En una mirada

| | |
|---|---|
| Hallazgos confirmados | 138 (por mayoría de 3 jueces) |
| Plausibles / refutados | 2 / 7 |
| Severidad alta | ~18 |
| Suite | 36 archivos, 576 tests, verde en 9,8 s |
| Importes mal calculados con los datos de hoy | ninguno encontrado |
| Respaldo de Firestore | no hay |
| CI | no hay |
| Última entrada en `criterio.md` | 13/9, y el recibo cambió tres veces el 23/9 |

## Estado

El motor está sano y el envoltorio está flojo.

La suite corre completa en 9,8 s y el canario de `test/calculoContribuciones.test.js:43`
compara contra un recibo real externo (legajo 12427, Nacional Sistema) y cierra
al centavo: no es un test escrito contra el propio motor. Ni los seis agentes
de esta pasada ni las seis personas de la auditoría en frío encontraron un
importe mal calculado con las escalas cargadas hoy.

Lo frágil está alrededor. **Cargar el mes es peligroso**: publicar una escala de
Camioneros desde `/admin` sin volver a tipear los valores del período deja el
convenio sin recibo para todos (`components/admin/EscalasTab.jsx:99` y `:225`),
y un adicional al que se le olvida el porcentaje se descarta en silencio
mientras el panel dice "¡Cambios guardados!" (`lib/convenioForm.js:415-438`).
**La infraestructura arrastra tres cosas serias**: `next` 16.0.1 tiene una RCE
crítica, la única cuenta que puede escribir en Firestore es
`admin@csueldos.com` sobre un dominio que el proyecto no registró
(`firestore.rules:40`), y nada corre los tests antes de pushear a main. No hay
respaldo automático, ni deshacer, ni restaurar desde el panel.

En cálculo hay unos quince criterios sin decidir. Cuatro mueven pesos de verdad
—obra social de la jornada parcial, base de los aportes de convenio, base del
SAC, Camioneros larga distancia— y son preguntas para el dueño, no bugs para
arreglar solos.

Y hay una lección de proceso: los tres commits del 23/9 (`66190c9`, `d939ce1`,
`ac4883a`) reescribieron el recibo y **reabrieron tres de los trece temas que
el informe del 13/9 declaró "Hecho"**, mientras `criterio.md` no tiene ninguna
entrada posterior al 13/9. Lo que se hizo hoy no está anotado en la
constitución del proyecto.

## Lo que está bien (con evidencia)

1. **La red de tests es real.** 576 tests en 36 archivos, verdes en 9,8 s. El
   canario contrasta con un recibo externo, no con el propio motor.
2. **Un solo motor, y no de palabra.** El commit `b1f7b31` borró 3.726 líneas de
   calculadoras paralelas; `test/criterio.test.js` y `test/vocabulario.test.js`
   hacen cumplir dos de las cuatro reglas. Las reglas tienen test, no sólo prosa.
3. **"O entiende, o avisa" está implementado** donde importa:
   `lib/motorLiquidacion.js:670-674`, `lib/calculoContribuciones.js:62-76`, y
   `lib/motorLiquidacion.js:436`, que corta antes de devolver un número que no
   puede justificar.
4. **Cada línea trae su detalle** (tipo, alícuota, base, `baseLabel`) y
   `lib/explicarLinea.js` lo traduce; el layout sigue el Anexo III del Decreto
   407/2026, con el costo del empleador antes del bruto. Se puede auditar un
   importe sin abrir el código.
5. **SSR por REST** con `lib/firestoreRest.js`: revalidate de 60 s, `AbortSignal`
   de 5 s, máscara de campos. El SDK de Firebase sólo entra en `/admin` y
   `/login`.
6. **Degradación pensada**: `app/sitemap.js:33` y `app/page.js:37` sobreviven a
   Firestore caído, las tablas del período pueden ser `null`, y `periodoDeTabla`
   nunca toma una tabla posterior al mes liquidado.
7. **Los criterios contables discutibles son datos, no código**:
   `data/contribuciones.seed.json:42-46` (`sac_integra_base_contribuciones`,
   `obra_social_trabajador_prorratea_jornada`, `tope_art9_en_aportes`). Cambiar
   de criterio es cambiar un dato, no desplegar.
8. **La documentación no esconde la deuda**: `docs/criterio.md:175-181` anticipa
   casi todos los hallazgos normativos de esta auditoría.
9. **El panel ya tiene las piezas buenas**: siete rubros declarados,
   `convenioForm` ida y vuelta sin pérdida, `revisarEscalaAntesDePublicar`, y
   `parsearNumero` que distingue "ilegible" de "cero". Falta validación, no una
   reescritura.
10. **Ninguna de las ~150 miradas encontró un importe mal** con los datos de hoy.

## Los diez primeros

Ordenados por consecuencia por facilidad.

| # | Hallazgo | Sev. | Archivo | Qué hacer |
|---|---|---|---|---|
| 1 | Publicar una escala borra los valores del período y el convenio queda sin recibo | alta | `components/admin/EscalasTab.jsx:62,99,214-230`; `lib/escalaCsv.js:225-254` | Precargar del mes anterior, `setDoc` con merge, y que la revisión previa reciba el convenio y frene si falta un input que el motor necesita |
| 2 | Adicional sin porcentaje descartado en silencio con cartel de éxito | alta | `lib/convenioForm.js:415-438` | Devolverlo como error de validación; no guardar hasta que esté el porcentaje o se borre la fila |
| 3 | RCE crítica en `next` 16.0.1 (GHSA-9qr9-h5gf-34mp / CVE-2025-55182) y siete advisories más | alta | `package.json:15` | Subir a 16.3.3 como mínimo (la última es 16.3.6; `npm audit` marca vulnerable hasta 16.3.2) y correr la suite |
| 4 | La única cuenta con permiso de escritura es `admin@csueldos.com`, un mail de un dominio que no es del proyecto, escrito en la regla | alta | `firestore.rules:36-41`; `README.md:209` | Confirmar que esa casilla existe (sin ella no hay recuperación de contraseña); pasar la regla al UID, con las reglas vueltas a pegar en la consola |
| 5 | Un CSV con una columna de más publica claves inventadas | alta | `lib/escalaCsv.js:106` | No adivinar zona por cantidad de columnas: exigir que el encabezado la declare |
| 6 | Obra social de la jornada parcial prorrateada vs. art. 92 ter inc. 4 LCT | alta | `lib/motorLiquidacion.js:602,622`; `lib/calculoContribuciones.js:38` | Decisión del dueño primero; después dar vuelta el default y sumar el 6% patronal, con test antes |
| 7 | La base de los aportes de convenio no distingue lo que el Decreto 612/2026 separó | alta | `lib/motorLiquidacion.js:653-674` | Definir alcance con el dueño y modelarlo como dato del período |
| 8 | En celular desaparece la columna Base (reabre el tema 2 del 13/9) | alta | `components/calculadora/ReciboOficial.jsx:43,70,111,114` | Apilar la base debajo del concepto, no esconderla |
| 9 | El permalink pierde los booleanos destildados y un test lo cementa | alta | `lib/permalink.js:34-46`; `test/fechasYPermalink.test.js:34` | Serializar `0`/`1` explícitos y corregir el test |
| 10 | Nada corre los tests antes de publicar, y el `.bat` puede decir "TODO OK" en rojo | alta | `probar-calculos.bat:11` | Que el `.bat` lea el código de salida; GitHub Action + branch protection en main |

Sobre el 10: el `.bat` dice "si arriba dice `passed`, TODO EL CALCULO ESTA OK", y
el resumen de vitest contiene la palabra `passed` también cuando falla
("3 failed | 573 passed").

## Hallazgos confirmados

### A. Cálculo y normativa

| # | Hallazgo | Sev. | Archivo | Qué hacer | Esf. |
|---|---|---|---|---|---|
| A1 | Obra social de la jornada parcial prorrateada | alta | `lib/motorLiquidacion.js:602,622` | Decidir art. 92 ter y sumar el 6% patronal | medio |
| A2 | Base de aportes convencionales sin separar (Dto. 612/2026) | alta | `lib/motorLiquidacion.js:653-674` | Modelar como dato del período | grande |
| A3 | Base del SAC: remuneración habitual del mes vs. art. 122 LCT | alta | `lib/motorLiquidacion.js:536`; `lib/parametrosLaborales.js:43` | Decidir y alinear el glosario | medio |
| A4 | Tope máximo del art. 9 aplicado a PAMI y obra social | alta | `lib/motorLiquidacion.js:607-611`; `lib/parametrosLaborales.js:67-76` | Decisión legal del dueño (ver preguntas) | medio |
| A5 | Tope mínimo del art. 9 entero en jornadas de 4 h | media | `lib/motorLiquidacion.js:611` | Decidir si el mínimo se proporciona | chico |
| A6 | Sin tope propio de la cuota del SAC (Dto. 433/94) | media | `lib/calculoContribuciones.js:121-171` | Agregar el tope con test | medio |
| A7 | Detracción Ley 27.541 sobre la cuota del aguinaldo | media | `lib/calculoContribuciones.js:158-171` | Definir prorrateo del mes de SAC | medio |
| A8 | Ganancias sin 1/12 del SAC (RG 4003) | media | `lib/calculoGanancias.js` | Decisión + implementación | medio |
| A9 | Viáticos del art. 82 LIG no tratados | media | `lib/calculoGanancias.js` | Decisión del dueño | medio |
| A10 | Valor hora sobre base con no remunerativos | media | `lib/motorLiquidacion.js:511` | Fijar numerador y divisor y escribirlo | medio |
| A11 | Recargos de hora extra como constante del motor | media | `lib/parametrosLaborales.js` (`RECARGOS_HORA_EXTRA`) | Pasarlos a dato; ya anticipado en `criterio.md:175-181` | medio |
| A12 | Adicional porcentual sobre adicional y coeficientes zonales | media | `lib/motorLiquidacion.js` | Definir orden de aplicación | grande |
| A13 | Antigüedad y presentismo apilados sin orden declarado | media | `lib/motorLiquidacion.js` | Declarar el orden en el convenio | medio |
| A14 | Base de obra social con no remunerativo fijo | media | `lib/motorLiquidacion.js:622` | Ya listado en `criterio.md:175-181` | medio |
| A15 | Adicionales por unidad en el mes del SAC y en la solidaria | media | `lib/motorLiquidacion.js:536,667-674` | Test + decisión | medio |
| A16 | Bases de contribución patronal descritas con dos palabras | media | `lib/calculoContribuciones.js` (`NOMBRE_DE_BASE`) | Nombrar la base completa | chico |
| A17 | Básico en 0, con texto o negativo sin caso cubierto | media | `lib/validacionEntradas.js`; `test/` | Tests primero, después el corte | medio |
| A18 | La torta del recibo se rompe con neto negativo | baja | `lib/reciboOficial.js` (`porciones`, filtro `monto > 0`) | Manejar el caso | chico |
| A19 | `tope_conjunto` y SCVO fuera de "otros" sin test que lo fije | baja | `lib/reciboOficial.js` (`montoScvo`, `otrosSinScvo`) | Test de la cuenta | chico |
| A20 | Zona adivinada llega al motor como clave válida | media | `lib/motorLiquidacion.js`; `lib/escalaCsv.js:106` | Rechazar zona no declarada | chico |
| A21 | `reemplaza_obra_social` sin convenio real que la use | baja | `lib/motorLiquidacion.js:658` | Confirmar si la rama vive | chico |
| A22 | La alícuota de ART se busca en más de un lugar | media | `lib/calculoContribuciones.js:187-212` | Un solo lector | medio |

### B. Datos y panel

| # | Hallazgo | Sev. | Archivo | Qué hacer | Esf. |
|---|---|---|---|---|---|
| B1 | `setValoresPeriodo([])` + `setDoc` sin merge borran los valores del período | alta | `components/admin/EscalasTab.jsx:62,99,214-230` | Precargar y mergear | medio |
| B2 | La revisión previa no ve importes ni el convenio | alta | `lib/escalaCsv.js:225-254` | Pasarle el convenio y comparar con el mes anterior | medio |
| B3 | Adicional sin porcentaje descartado en silencio | alta | `lib/convenioForm.js:415-438` | Error de validación | chico |
| B4 | CSV con columna extra genera claves inventadas | alta | `lib/escalaCsv.js:106` | Exigir encabezado declarado | chico |
| B5 | Dos escrituras seguidas sin `writeBatch` | media | `components/admin/EscalasTab.jsx:214-230` | Batch | chico |
| B6 | `inputs_requeridos` sin optional chaining puede tirar el guardado | media | `components/admin/EscalasTab.jsx:230` | Guardar contra `undefined` | chico |
| B7 | Camioneros sin escala de 2026-09 y sin marca | media | Firestore / directorio | Cargar o marcar con chip ámbar | chico |
| B8 | `activo: false` hace desaparecer el convenio en vez de anunciarlo | media | `components/admin/ConveniosTab.jsx:16-26` | Sección "Próximas actualizaciones" | chico |
| B9 | Sector de Gastronómicos mal clasificado | baja | `lib/directorio.js` | Corregir el dato | chico |
| B10 | Sin campo de fuente por escala | media | `components/admin/EscalasTab.jsx` | Agregar "fuente" | chico |
| B11 | La novedad se escribe a mano aparte de publicar | media | `components/admin/NovedadesTab.jsx` | Generarla al publicar | medio |
| B12 | Errores de red del SDK en inglés | baja | `components/admin/EscalasTab.jsx` | Traductor de errores | chico |
| B13 | CSV con apóstrofe o comilla simple mal parseado | baja | `lib/escalaCsv.js` | Caso de borde | chico |
| B14 | Semillas de `data/` viejas como semilla | baja | `data/contribuciones.seed.json`, `data/ganancias.seed.json` | Refrescar; no afecta producción | chico |

### C. Lectura y confianza (lo que ve el usuario)

| # | Hallazgo | Sev. | Archivo | Qué hacer | Esf. |
|---|---|---|---|---|---|
| C1 | La columna Base desaparece por debajo de 640 px | alta | `components/calculadora/ReciboOficial.jsx:43,70,111,114` | Apilar la base | medio |
| C2 | ART y FFEP comparten el id `art` | media | `lib/reciboOficial.js:187,225` | Separar ids | chico |
| C3 | El aviso de ART le habla al usuario de `/admin` | media | `lib/calculoContribuciones.js:187-212` | Reescribir el texto | chico |
| C4 | Avisos que no se imprimen de forma consistente | media | `components/calculadora/CalculadoraConvenio.jsx:633-638,647-656` | Unificar `print:hidden` | chico |
| C5 | Aviso de contribuciones para períodos previos a 06/2026 | media | `components/calculadora/CalculadoraConvenio.jsx:633-638` | Condicionar | chico |
| C6 | Bullet del SAC mostrado sin SAC liquidado | baja | `components/calculadora/CalculadoraConvenio.jsx:718` | Condicionar a `incluir_sac` | chico |
| C7 | "Costo por hora / por día (costo laboral / 30)" presentado como dato | media | `components/calculadora/CalculadoraConvenio.jsx:719-721` | Explicar o quitar | chico |
| C8 | Costo anual que cambia según una casilla | media | `components/calculadora/CalculadoraConvenio.jsx:594` | Una sola cuenta anual | medio |
| C9 | Falta marca de simulación, sobre todo impresa | media | `components/calculadora/ReciboOficial.jsx` | Sello visible | chico |
| C10 | PAMI / INSSJP nombrados de dos formas | baja | `lib/explicarLinea.js` | Glosario único | chico |
| C11 | Doble reserva de la altura del header | media | `app/layout.js:84` | Sacar el `pt` duplicado | chico |
| C12 | `opacity-50` sin contraste suficiente | media | `app/globals.css` + componentes | Subir el tono | chico |
| C13 | `sr-only "sin completar"` no alcanza como encabezado de fila | media | `components/calculadora/ReciboOficial.jsx:46` | Revisar `scope` y orden de lectura | medio |
| C14 | 21 casillas de entrada sin ayuda por campo | media | `lib/inputsIniciales.js`; `components/calculadora/CalculadoraConvenio.jsx` | Texto de ayuda por input | medio |
| C15 | Defaults de jornada, afiliación y zona que cambian el importe sin elección | media | `lib/inputsIniciales.js` | Declararlos y mostrarlos | medio |
| C16 | Permalink sin booleanos destildados | alta | `lib/permalink.js:34-46` | Serializar `0`/`1` | chico |
| C17 | Cargas de familia fuera del estado compartible | media | `lib/permalink.js` (UNIVERSALES) | Incluirlas | chico |
| C18 | Sin buscador en el directorio | baja | `components/Portada.jsx` | Filtro simple | chico |
| C19 | `/novedades` se arma en el cliente | baja | `app/novedades/page.jsx` | Pasarlo al servidor | medio |

### D. Privacidad y lo público

| # | Hallazgo | Sev. | Archivo | Qué hacer | Esf. |
|---|---|---|---|---|---|
| D1 | El reporte de errores manda datos sin decir a dónde | media | `components/ReportModal.jsx` | Aviso + destino explícito | chico |
| D2 | Sin página de privacidad ni contacto | media | `app/` | Escribirla | chico |
| D3 | Iconos, manifest, canonical y robots incompletos | baja | `app/robots.js`, `app/layout.js` | Completar | chico |
| D4 | Borradores de novedades legibles antes de publicar | media | `firestore.rules` | Restringir lectura | chico |

### E. Seguridad e infraestructura

| # | Hallazgo | Sev. | Archivo | Qué hacer | Esf. |
|---|---|---|---|---|---|
| E1 | RCE crítica en `next` 16.0.1 y siete advisories más | alta | `package.json:15` | 16.3.3 como mínimo; hoy la última es 16.3.6 | chico |
| E2 | Cuenta admin en dominio ajeno, publicada, y no es la que se usa | alta | `firestore.rules:36-41` | Regla por UID + cuenta propia | chico |
| E3 | `/admin` compara el mail del lado del cliente | media | `app/admin/page.jsx` | La puerta es la regla | chico |
| E4 | `firestore.rules` no se aplica solo: se pega a mano | media | `firestore.rules`; `criterio.md:175-181` | Documentar el paso o automatizar | chico |
| E5 | Sin HSTS ni cabeceras de seguridad | media | `next.config.mjs` | Agregar cabeceras | chico |
| E6 | `typescript` viejo y sin `engines` | baja | `package.json` | `^5.9` + `engines` | chico |
| E7 | `fetch` sin tope de tiempo explícito y único | baja | `lib/firestoreRest.js` | `TOPE_MS` compartido | chico |

### F. Continuidad y respaldos

| # | Hallazgo | Sev. | Archivo | Qué hacer | Esf. |
|---|---|---|---|---|---|
| F1 | No hay respaldo de Firestore de ningún tipo | alta | — | `scripts/respaldar.mjs` + comando en el README | medio |
| F2 | No hay deshacer ni restaurar desde el panel | alta | `components/admin/*` | Descargar/Restaurar período en JSON | medio |
| F3 | Sin PITR ni versionado | media | Firestore (consola) | Activarlo si el plan lo permite | chico |
| F4 | Los fixtures se confunden con respaldo | media | `scripts/capturarFixtures.mjs` | Separar propósitos | chico |
| F5 | Nada escrito sobre continuidad (cuentas, dominio, qué se rompe) | media | `docs/` | Una carilla | chico |

### G. Tests y criterio

| # | Hallazgo | Sev. | Archivo | Qué hacer | Esf. |
|---|---|---|---|---|---|
| G1 | Ningún test de UI: `vitest.config.mjs` no tiene `test` ni jsdom | media | `vitest.config.mjs` | jsdom + primeros tests del recibo | medio |
| G2 | Un test cementa el permalink incompleto | alta | `test/fechasYPermalink.test.js:34` | Corregir expectativa | chico |
| G3 | La Regla 2 (ningún número suelto en el motor) no tiene test | media | `test/` | Test que la haga cumplir | medio |
| G4 | Sin matriz de invariantes por convenio | media | `test/invariantes.test.js` | Extender a los tres convenios | medio |
| G5 | Casos de borde de entrada sin cubrir (0, texto, negativo, 4 h) | media | `test/validacionEntradas.test.js` | Agregarlos antes del Lote 2 | medio |
| G6 | `tailwind.config.js` muerto con Tailwind v4 por `@import` | baja | `tailwind.config.js` | Borrarlo | chico |
| G7 | Formato de moneda y porcentaje duplicado | baja | varios componentes | `lib/formato.js` único | chico |
| G8 | `CalculadoraConvenio.jsx` hace demasiado | media | `components/calculadora/CalculadoraConvenio.jsx` | Partirlo | grande |
| G9 | `design/`, `ds-bundle/`, `.ds-sync/` en el repo y sin uso en el sitio | baja | esos directorios | Decidir si se mantienen | chico |

### H. Proceso y documentación

| # | Hallazgo | Sev. | Archivo | Qué hacer | Esf. |
|---|---|---|---|---|---|
| H1 | Nada corre los tests antes de publicar | alta | — | GitHub Action + branch protection | chico |
| H2 | El `.bat` dictamina "TODO OK" leyendo la palabra `passed` | alta | `probar-calculos.bat:11` | Leer el código de salida | chico |
| H3 | `criterio.md` sin entrada posterior al 13/9, con tres commits que cambiaron el recibo el 23/9 | alta | `docs/criterio.md` | Anotar la pasada | chico |
| H4 | Tres de los trece temas "Hecho" del 13/9 están reabiertos | alta | `docs/auditorias/2026-09-13-ux-en-frio.md` | Volver a correr la auditoría en frío | grande |
| H5 | README y `.bat` dicen "más de 380 tests"; son 576 | baja | `README.md`, `probar-calculos.bat` | Actualizar | chico |
| H6 | Agrupamiento manual de hallazgos en el informe anterior (línea 105) | media | `.claude/workflows/auditoria-ux.js` | Consolidación por tema en el script | medio |
| H7 | Las "Preguntas que le quedaron" de cada persona no se cuentan como hallazgos | media | `.claude/workflows/auditoria-ux.js` | Contarlas | chico |
| H8 | Reglas del auditor repartidas en dos archivos | baja | `.claude/agents/auditor-ux.md`, workflow | Una sola fuente | chico |
| H9 | Cinco huérfanos vivos del crudo del 13/9 | baja | `docs/auditorias/2026-09-13-ux-en-frio-crudo.md` | Cerrarlos o declararlos decisión | chico |
| H10 | Dos canarios distintos en circulación ($1.166.249,70 y $1.251.841,10) | media | `docs/criterio.md:166` y código | Decidir cuál es el oficial | chico |

## Plan por lotes

### Lote 0 — volver a mirar con ojos de primera vez

Los tres commits del 23/9 reescribieron el recibo **después** de la auditoría en
frío. Arreglar sobre el informe del 13/9 es arreglar sobre una foto vieja.

- Correr `.claude/workflows/auditoria-ux.js` completo contra la pantalla nueva
  (grande, ~1,5 h de máquina). Resuelve H4.
- Antes de correrlo: consolidación por tema en el script (H6) y contar las
  preguntas de cada persona como hallazgos (H7). Chico + medio.
- Anotar la pasada del 23/9 en `criterio.md` (H3). Chico.

### Lote 1 — rápido y sin riesgo de cálculo

Nada de esto toca un importe.

C2, C3, C4, C5, C6, C7, C9, C10, C11, C12, B12, D3, H5, H9 (todos chicos) más
C13 y C19 (medios). Resuelve los textos que mienten, los avisos que se imprimen
mal, el layout con doble reserva de header y los huérfanos del crudo.

### Lote 2 — cálculo y normativa (tests primero, siempre)

Ningún ítem entra sin un test que falle antes y pase después. Varios están
**bloqueados por una decisión del dueño**.

1. Primero los tests que hoy no existen: G5 y G1 (medios), A17.
2. A22 (un solo lector de alícuotas, medio).
3. Bloqueados por decisión: A1, A2, A3, A4, A8, A9 (medios y grandes).
4. Sin bloqueo: A5, A6, A7, A10, A15, A16, A18, A19, A20, A21.
5. Grandes, para después: A11, A12, A13, A14.

### Lote 3 — producto y datos

El lote que más baja el riesgo operativo.

B1, B2, B3, B4 (los cuatro que hacen peligroso cargar el mes), B5, B6, B7, B8,
B9, B10, B11, B14; C1, C8, C14, C15, C16, C17, C18; D1, D2.

### Lote 4 — mantenibilidad e infraestructura

E1, E2, E3, E4, E5, E6, E7; H1, H2; F1, F2, F3, F4, F5; G3, G4, G6, G7, G9, y
G8 al final porque es grande y no urge.

## Preguntas al dueño

Ninguna de estas se puede responder leyendo el código.

1. **Obra social de la jornada parcial**: ¿art. 92 ter inc. 4 LCT (jornada
   completa pasados los dos tercios) o el prorrateo actual? Hoy el interruptor
   está en `true` (`motorLiquidacion.js:602`). Si cambia, hay que sumar el 6%
   patronal, que no tiene interruptor.
2. **Decreto 612/2026**: ¿FAECYS entra en el mismo tope que los aportes de ley?
   ¿La cuota del afiliado queda afuera de la base?
3. **Tope máximo del art. 9 sobre PAMI y obra social**: dos jueces lo dieron por
   defecto (la Ley 26.222 reserva el máximo para el SIPA), uno lo refutó citando
   el Dto. 1448/2008. Es una disputa legal, no de código. ¿Cuál es el criterio
   de la casa?
4. **Base del SAC**: el motor usa la remuneración habitual del mes
   (`motorLiquidacion.js:536`) y el art. 122 LCT habla de la mejor del semestre.
   El glosario promete algo distinto de lo que hace el motor.
5. **Ganancias**: ¿1/12 del SAC mes a mes (RG 4003)? ¿Y los viáticos del art. 82
   LIG en Camioneros?
6. **Camioneros**: ¿los kilómetros son remunerativos para SAC, plus y solidaria?
7. **Tope mínimo del art. 9 en jornadas de 4 h**: ¿entero o proporcional?
8. **¿Qué tablas están hoy cargadas en Firestore?** Un juez leyó producción por
   REST y vio `parametros_contribuciones` de 2026-06 a 2026-09 y
   `parametros_ganancias` de 2026-07 con vigencia "Julio–Diciembre 2026"; a otro
   la sandbox se lo bloqueó y yo no lo pude verificar. Si está cargado, el aviso
   ámbar de Ganancias es un falso positivo.
9. **Gastronómicos**: ¿los tramos de antigüedad son los cargados, y la asistencia
   perfecta viene tildada por default?
10. **¿Cuál es el canario oficial?** `criterio.md:166` fija $1.166.249,70 y en el
    código aparece también $1.251.841,10.
11. **Mover la cuenta de administrador**: ¿regla por UID de `info@liquidar.ar` y
    baja de `admin@csueldos.com`? Si sale mal te deja afuera del panel.
12. **¿Plan Blaze?** De eso depende si se puede activar PITR.
13. **¿Los borradores de novedades pueden ser públicos?**
14. **¿Escribimos privacidad, y qué hacemos con `ads.txt`?**
15. **Costo anual**: ¿12 o 13 sueldos? ¿Provisionamos vacaciones?
16. **`reemplaza_obra_social`** (`motorLiquidacion.js:658`): ¿qué convenio real la
    usa? Si ninguno, es una rama sin dueño que igual condiciona el cálculo.
17. **¿Cuál es el próximo convenio a cargar?** Define qué línea de
    `criterio.md:175-181` conviene desbloquear primero.
18. **¿Se mantienen `design/`, `ds-bundle/` y `.ds-sync/`?** El sitio no los usa.
19. **¿Volvemos a correr la auditoría en frío antes del Lote 1?** Mi respuesta es
    sí.
20. **Además de la alícuota de ART, ¿qué otros datos deberían avisar cuando el
    recibo no los usa?** Hoy el silencio y el cero se parecen demasiado.

## Apéndice: plausibles, sin mayoría de los jueces

No los cuento como confirmados, y no los tiro.

1. **El rubro de OSECAC como dato y no como pantalla.** Un juez sostuvo que el
   rubro debería venir declarado en el convenio y no resolverse al mostrar; los
   otros dos lo vieron como decisión tomada el 13/9 (línea 99 de ese informe
   documenta el cambio de rubro a obra social). Queda para cuando se toque el
   glosario.
2. **El glosario del aporte solidario apoyado en un fixture viejo.** El texto que
   explica la contribución solidaria se validó contra
   `test/fixtures/comercio-cct-130-75.convenio.json`, que puede no reflejar el
   convenio actual. Conviene verificarlo contra el CCT antes de reescribir el
   texto.

## Lo que se descartó

Siete hallazgos cayeron por mayoría: los jueces mostraron el código que los
desmiente o la decisión ya tomada que los explica. Son estos:

- `metodo.horasMensualesDelPuesto` queda en null si la persona no cargó horas extras
- La url de una novedad va directo a un href sin validar el esquema: un javascript: guardado en Firestore se ejecuta en la portada
- public/ tiene un ads.txt que declara un publisher de AdSense sin ninguna integración, más las sobras de create-next-app
- El botón "Importar historial" revive una novedad despublicada y devuelve el error de tipeo UTGHRA que se corrigió el 13/9
- El comentario de Analítica dice "por eso no pide consentimiento", pero el beacon reporta la URL, que en la calculadora lleva los parámetros de familia
- Censo del crudo: 84 hallazgos + 44 preguntas abiertas que nadie contó nunca
- Aporte Fijo OSECAC en el rubro Sindical: el crudo lo REFUTA como error de pantalla y lo confirma como error de dato

Sí dejo asentado lo que **yo** bajé de categoría después de revisarlo:

- El aviso ámbar "los valores de Ganancias pueden ser de otro semestre" es
  probablemente un **falso positivo**: si producción tiene la tabla 2026-07 con
  vigencia Julio–Diciembre 2026, el aviso aparece sin motivo. Queda como pregunta 8.
- Las semillas de `data/` desactualizadas: son semilla, no producción, y
  `test/criterio.test.js` garantiza que la calculadora no las lee. Severidad baja.

## Límites del método

- **No pude leer Firestore.** Todo lo que digo sobre el estado de producción
  viene de un juez que sí lo leyó por REST y de otro al que la sandbox se lo
  bloqueó. No lo verifiqué.
- **La disputa del art. 9 es legal.** Dos jueces contra uno, con normas
  distintas en la mano (Ley 26.222 vs. Dto. 1448/2008). No la resolví: la mandé
  a preguntas.
- **Nada se verificó en un navegador real.** Los hallazgos de pantalla salen de
  leer el código y del informe en frío del 13/9, que describe una pantalla
  anterior a los tres commits del 23/9. Por eso el Lote 0 existe.
- **Lo que sí se corrió**: `npx vitest run` completo, verde: 36 archivos, 576
  tests, 9,8 s, vitest 4.1.10. Y se verificaron a mano las líneas citadas en
  los diez primeros hallazgos; después de la corrida se volvieron a verificar
  en el código los hallazgos 1, 2, 3, 5, 9 y 10, y `npm audit --omit=dev`
  confirmó el 3 (con la corrección de versión anotada arriba).
- **Auditoría de sólo lectura**: los agentes no modificaron, crearon ni
  borraron ningún archivo del repositorio ni tocaron git. Este informe y su
  volcado crudo (`2026-09-23-auditoria-integral-crudo.md`) se guardaron después
  de la corrida.
- **Fecha de la corrida**: los agentes trabajaron con la fecha 23/9/2026; este
  informe se cierra el 24/9/2026.

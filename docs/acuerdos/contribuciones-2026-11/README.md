# Contribuciones patronales: noviembre 2026

El `carga.json` de esta carpeta publica la tabla de contribuciones de
**noviembre 2026**. Es la de octubre, que ya está publicada y revisada, con
los dos datos que cambian todos los meses. Los dos salen del Boletín Oficial:

| Dato | Octubre | Noviembre | Norma |
|---|---|---|---|
| FFEP (suma fija por trabajador, rubro ART) | $1.971 | **$2.010** | Disposición SRT 11/2026 (DI-2026-11-APN-GCP#SRT), [Boletín Oficial del 25/11/2026](https://www.boletinoficial.gob.ar/detalleAviso/primera/350780/20261125) |
| Base mínima del art. 9 (Ley 24.241) | $146.759,98 | **$149.592,45** | Resolución ANSES 304/2026, [Boletín Oficial del 28/10/2026](https://www.boletinoficial.gob.ar/detalleAviso/primera/349684/20261028) |
| Base máxima del art. 9 | $4.769.631,49 | **$4.861.685,38** | ídem |

Lo demás se copia igual de octubre: las alícuotas de los dos regímenes, la
detracción de la Ley 27.541 ($7.003,68), el seguro colectivo de vida
($424,62) y los dos criterios contables. Es lo mismo que hace el botón
"Copiar del mes anterior" de la pestaña Contribuciones
(`armarTablaDelMes`, en `lib/vigia/contribuciones.js`).

Hasta que se publique, noviembre usa la tabla de octubre y el recibo lo avisa.

## De dónde salen los números

Se leyeron el 26/11/2026 con los mismos lectores que usa el vigía
(`lib/vigia/boletin.js`), revisando la Primera Sección del Boletín Oficial
día por día del 20/10 al 26/11/2026, sólo los avisos de ANSES y la SRT. El
vigía sigue desactivado: se usaron sus funciones a mano, sin tocar su estado.
Las frases de cada norma:

- **Disposición SRT 11/2026:** "…la suma fija prevista en el artículo 5° del
  Decreto N° 590 de fecha 30 de junio de 1997 […] será de PESOS DOS MIL DIEZ
  ($ 2.010) para el devengado del mes de noviembre de 2026…"
- **Resolución ANSES 304/2026:** "…bases imponibles mínima y máxima previstas
  en el primer párrafo del artículo 9° de la Ley N° 24.241 […] en la suma de
  PESOS CIENTO CUARENTA Y NUEVE MIL QUINIENTOS NOVENTA Y DOS CON CUARENTA Y
  CINCO CENTAVOS ($ 149.592,45) y PESOS CUATRO MILLONES OCHOCIENTOS SESENTA
  Y UN MIL SEISCIENTOS OCHENTA Y CINCO CON TREINTA Y OCHO CENTAVOS
  ($ 4.861.685,38), respectivamente…", desde el devengado de noviembre 2026.

## Cómo se carga

Hacé un respaldo antes (`respaldar.bat`). Desde la terminal, parado en el
repo:

```
node scripts/cargarMes.mjs docs/acuerdos/contribuciones-2026-11
```

muestra qué haría. El ensayo del 26/11/2026 dio:

```
crea  parametros_contribuciones/2026-11  —  contribuciones 2026-11 "Noviembre 2026", a partir de 2026-10:
      FFEP 1971 → 2010; bases del art. 9 146759.98/4769631.49 → 149592.45/4861685.38
```

Con `--aplicar` al final pide la contraseña de admin y la publica. Sin
terminal: doble clic en `cargar-mes.bat` y pegarle la ruta de esta carpeta.

**A mano, desde `/admin`:** Contribuciones → `2026-11` → Copiar del mes
anterior → FFEP $2.010 y las bases de la tabla de arriba → Guardar y publicar.

**No la vuelvas a correr si después cambiaste algo de noviembre a mano**:
la carga arma la tabla de nuevo desde la de octubre y pisaría ese cambio.

## Pendiente

- **Diciembre 2026.** Al 26/11/2026 todavía no habían salido ni la
  Resolución de ANSES con las bases de diciembre (suele salir a fin del mes
  anterior) ni la Disposición de la SRT con el FFEP de diciembre (sale a
  mitad o a fin del mismo mes). Con las dos, una carpeta igual a esta.
- **Para el vigía, antes de prenderlo:** el lector del FFEP no reconoce la
  Disposición SRT 10/2026
  ([Boletín Oficial del 26/10/2026](https://www.boletinoficial.gob.ar/detalleAviso/primera/349560/20261026)),
  la del FFEP de octubre ($1.971, que ya estaba cargado desde el
  29/10/2026). Esa dice "será **para ambos regímenes** de PESOS…" y
  `RE_FFEP` (en `lib/vigia/boletin.js`) sólo acepta "será de PESOS…", como
  la de noviembre. El vigía la habría mandado como alerta con el link, no
  como borrador. Hay que ampliar la expresión y sumar ese texto a
  `test/fixtures/vigia/`.

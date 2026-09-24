# Auditorías "en frío"

Acá quedan los informes de las auditorías de funcionalidades y experiencia de
usuario hechas por **personas simuladas que llegan a liquidar.ar sin saber
nada del proyecto**: ni el código, ni esta documentación, ni la conversación
en la que se lo construyó. Sólo tienen el navegador. Es la forma de volver a
ver el sitio con ojos de primera vez cuando los que lo hacemos ya no podemos.

## Cómo se corre

Desde Claude Code, parado en este repo y con la extensión de Chrome conectada:

```
Workflow({ scriptPath: ".claude/workflows/auditoria-ux.js" })
```

Ensayo rápido con una sola persona y sin verificación:

```
Workflow({ scriptPath: ".claude/workflows/auditoria-ux.js", args: { personas: ["rompedor"], verificar: false } })
```

Contra un servidor local, antes de publicar:

```
Workflow({ scriptPath: ".claude/workflows/auditoria-ux.js", args: { url: "http://localhost:3000" } })
```

Corre **una persona por vez** (hay una sola ventana de Chrome) y tarda alrededor
de una hora y media completa. Seis personas: empleado de comercio, contador,
dueño de PyME, usuario de celular, auditor de accesibilidad y "rompedor". Los
hallazgos de severidad media o más los intenta reproducir un verificador
fresco: lo que no se reproduce va a un apéndice, no se tira.

El agente que hace de usuario es `.claude/agents/auditor-ux.md`: tiene
restringidas las herramientas al navegador, así que no puede leer el código
aunque quiera. Sus reglas de navegador (anular `alert`, no enviar formularios,
simular 400 px con un marco) son de la herramienta, no conocimiento del sitio.

## Qué encuentra y qué no

Encuentra fricción evidente, flujos rotos, textos que no se entienden, errores
con datos raros, problemas de celular y de accesibilidad, y preguntas que un
usuario real se habría hecho. **No reemplaza a usuarios reales**: no tiene el
gusto ni la historia de un contador de Tandil, y puede señalar como problema
algo que es una decisión tomada. Por eso el informe separa lo confirmado de lo
no reproducido, y por eso nada se arregla en la misma pasada.

## Qué se hace con los hallazgos

Primero se lee el informe. Después el dueño decide qué se arregla, y eso sale
como un lote aparte, con sus tests. Así los arreglos no se hacen sobre falsos
positivos ni contaminan la auditoría siguiente.

## Informes

- `2026-09-13-ux-en-frio.md` (y su crudo): seis personas simuladas recorren el sitio con el navegador.
- `2026-09-23-auditoria-integral.md` (y su crudo): auditoría del código y los datos con agentes por subsistema y por lente, tres jueces por hallazgo y un plan por lotes. Se corrió con el workflow inline de Claude Code (no está en `.claude/workflows/`); el guion queda descrito en el propio informe.

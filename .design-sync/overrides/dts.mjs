// forked from design-sync lib/dts.mjs - jsdocFor limpiaba la descripción con \w sin la bandera u y borraba las letras acentuadas (Botón → Botn) del índice del README
// Sólo se reemplaza jsdocFor; todo lo demás sale del módulo staged.
export * from '../../.ds-sync/lib/dts.mjs';

// One-line JSDoc from the component's own declaration (Unicode-aware).
export function jsdocFor(name, ctx) {
  const decls = ctx.project?.getSourceFile(ctx.entry)?.getExportedDeclarations().get(name) ?? [];
  const kind = (d) => d?.getKindName?.() ?? '';
  const exp = decls.find((d) => ['VariableDeclaration', 'FunctionDeclaration', 'ClassDeclaration'].includes(kind(d))) ?? decls[0];
  if (!exp || kind(exp) === 'SourceFile') return '';
  const doc = exp.getJsDocs?.()?.[0]?.getDescription()
    ?? exp.getSymbol?.()?.compilerSymbol.getDocumentationComment?.(undefined)?.[0]?.text;
  if (!doc) return '';
  return doc.split('\n').find((l) => l.trim() && !l.trim().startsWith('@'))
    ?.trim().replace(/\s+/g, ' ').replace(/[^\p{L}\p{M}\p{N}\s.,;:()'"/+\-–—¿?¡!«»]/gu, '').slice(0, 140) ?? '';
}

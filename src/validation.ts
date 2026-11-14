import ts from 'typescript';

const locatorMethods = new Set(['locator', 'getByRole', 'getByLabel', 'getByText', 'getByPlaceholder', 'getByTestId', 'getByTitle', 'getByAltText', 'nth', 'first', 'last']);
const actions = new Set(['click', 'fill', 'press', 'check', 'uncheck', 'selectOption', 'hover', 'focus', 'clear']);
const matchers = new Set(['toBeVisible', 'toBeHidden', 'toHaveText', 'toContainText', 'toHaveValue', 'toHaveCount', 'toBeChecked', 'toBeEnabled', 'toBeDisabled', 'toHaveURL', 'toHaveTitle']);
const fail = (message: string): never => { throw new Error(`Código recusado: ${message}`); };
function literal(node: ts.Node): boolean {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(node.kind)) return true;
  if (ts.isArrayLiteralExpression(node)) return node.elements.every(literal);
  if (ts.isObjectLiteralExpression(node)) return node.properties.every(p => ts.isPropertyAssignment(p) && ((ts.isIdentifier(p.name) && !['__proto__', 'constructor', 'prototype'].includes(p.name.text)) || ts.isStringLiteral(p.name)) && literal(p.initializer));
  return false;
}
function locator(node: ts.Expression): boolean {
  return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    && locatorMethods.has(node.expression.name.text) && node.arguments.every(literal)
    && ((ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'page') || locator(node.expression.expression));
}
export function validateCode(code: string): ts.SourceFile {
  if (!code.trim() || code.length > 50_000) fail('resposta vazia ou maior que 50 KB.');
  const file = ts.createSourceFile('scenario.spec.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const syntax = (file as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (syntax.length) fail(ts.flattenDiagnosticMessageText(syntax[0]!.messageText, '\n'));
  if (file.statements.length !== 2) fail('use somente um import e um test.');
  const imp = file.statements[0]!;
  if (!ts.isImportDeclaration(imp) || !ts.isStringLiteral(imp.moduleSpecifier) || imp.moduleSpecifier.text !== '@playwright/test'
    || imp.importClause?.name || imp.importClause?.isTypeOnly || !imp.importClause?.namedBindings || !ts.isNamedImports(imp.importClause.namedBindings)) fail('importe apenas { test, expect } de @playwright/test.');
  const bindings = (imp as ts.ImportDeclaration).importClause!.namedBindings as ts.NamedImports;
  if (bindings.elements.length !== 2 || bindings.elements.some(e => e.propertyName || e.isTypeOnly) || bindings.elements.map(e => e.name.text).sort().join(',') !== 'expect,test') fail('imports não autorizados.');
  const stmt = file.statements[1]!;
  if (!ts.isExpressionStatement(stmt) || !ts.isCallExpression(stmt.expression)) fail('um test direto é obrigatório.');
  const call = (stmt as ts.ExpressionStatement).expression as ts.CallExpression;
  if (!ts.isIdentifier(call.expression) || call.expression.text !== 'test' || call.arguments.length !== 2 || !ts.isStringLiteral(call.arguments[0]!)) fail('assinatura de test inválida.');
  const callback = call.arguments[1]!;
  if (!ts.isArrowFunction(callback) || !callback.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || callback.parameters.length !== 1 || !ts.isBlock(callback.body)) fail('use async ({ page }) => { ... }.');
  const cb = callback as ts.ArrowFunction;
  const param = cb.parameters[0]!;
  if (!ts.isObjectBindingPattern(param.name) || param.name.elements.length !== 1 || param.name.elements[0]?.name.getText(file) !== 'page' || param.name.elements[0]?.propertyName || param.name.elements[0]?.initializer || param.initializer || param.type || param.dotDotDotToken || param.name.elements[0]?.dotDotDotToken) fail('apenas a fixture page é permitida.');
  let assertions = 0;
  let navigations = 0;
  for (const s of (cb.body as ts.Block).statements) {
    if (!ts.isExpressionStatement(s) || !ts.isAwaitExpression(s.expression) || !ts.isCallExpression(s.expression.expression)) fail('somente chamadas await são permitidas.');
    const c = ((s as ts.ExpressionStatement).expression as ts.AwaitExpression).expression as ts.CallExpression;
    if (!ts.isPropertyAccessExpression(c.expression) || !c.arguments.every(literal)) fail('chamada ou argumentos não autorizados.');
    const access = c.expression as ts.PropertyAccessExpression;
    if (ts.isIdentifier(access.expression) && access.expression.text === 'page' && access.name.text === 'goto') {
      const target = c.arguments[0];
      if (c.arguments.length !== 1 || !target || !ts.isStringLiteral(target) || !target.text.startsWith('/') || target.text.startsWith('//') || target.text.includes('\\')) fail('goto exige caminho relativo iniciado por /.');
      navigations++;
    } else if (actions.has(access.name.text) && locator(access.expression)) {
      // Only literal action data; no callbacks or access to browser/system execution APIs.
    } else {
      let receiver = access.expression;
      if (ts.isPropertyAccessExpression(receiver) && receiver.name.text === 'not') receiver = receiver.expression;
      if (!matchers.has(access.name.text) || !ts.isCallExpression(receiver) || !ts.isIdentifier(receiver.expression) || receiver.expression.text !== 'expect' || receiver.arguments.length !== 1) fail('ação/assertion não autorizada.');
      const arg = (receiver as ts.CallExpression).arguments[0]!;
      if (!(locator(arg) || (ts.isIdentifier(arg) && arg.text === 'page'))) fail('expect exige page ou localizador.');
      assertions++;
    }
  }
  if (!assertions || !navigations) fail('inclua navegação e pelo menos uma assertion.');
  return file;
}

// Compare the complete syntax tree after replacing ONLY locator expressions.
// Calls on the outside (fill/click/expect/matchers), data and statement order remain exact.
function behavior(code: string): string {
  const file = validateCode(code);
  const transform = ts.transform(file, [context => root => {
    const visit: ts.Visitor = node => {
      // Assertions, including their target locator, are immutable: changing
      // an expected heading/text must never disguise a functional regression.
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'expect') return node;
      if (ts.isExpression(node) && locator(node)) return ts.factory.createIdentifier('LOCATOR');
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  try { return ts.createPrinter({ removeComments: true }).printFile(transform.transformed[0]!); }
  finally { transform.dispose(); }
}
export function validateHealing(original: string, proposed: string): void {
  if (behavior(original) !== behavior(proposed)) fail('o reparo alterou ações, dados, navegação ou assertions. Apenas localizadores podem mudar.');
  if (ts.createPrinter({ removeComments: true }).printFile(validateCode(original)) === ts.createPrinter({ removeComments: true }).printFile(validateCode(proposed))) fail('o reparo não alterou nenhum localizador.');
}

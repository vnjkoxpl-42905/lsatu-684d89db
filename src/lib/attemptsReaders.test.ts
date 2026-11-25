import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

// Historic blind review rows sit in `attempts` with br_selected = true (audit
// F4). Every reader query in `src/` must wrap its query with the shared
// `excludeBlindReviewAttempts` helper from `@/lib/attemptsFilter` rather than
// exempting files wholesale (F9). Only explicit `.insert(` writes are exempt on
// a per-query basis.

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p.replace(/\\/g, '/'));
  }
  return out;
}

function unfilteredLines(text: string, file = 'fixture.ts'): number[] {
  if (!text.includes('attempts')) return [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const helpers = new Set<string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!['@/lib/attemptsFilter', './attemptsFilter'].includes(statement.moduleSpecifier.text)) continue;
    const names = statement.importClause?.namedBindings;
    if (!names || !ts.isNamedImports(names)) continue;
    for (const specifier of names.elements) {
      if ((specifier.propertyName ?? specifier.name).text === 'excludeBlindReviewAttempts') helpers.add(specifier.name.text);
    }
  }

  function isFilteredOrInsert(from: ts.CallExpression): boolean {
    let expression: ts.Expression = from;
    for (;;) {
      const parent = expression.parent;
      if (ts.isParenthesizedExpression(parent)) {
        expression = parent;
        continue;
      }
      if (ts.isPropertyAccessExpression(parent) && ts.isCallExpression(parent.parent) && parent.parent.expression === parent) {
        if (parent.name.text === 'insert' && expression === from) return true;
        expression = parent.parent;
        continue;
      }
      return ts.isCallExpression(parent) && parent.arguments[0] === expression
        && ts.isIdentifier(parent.expression) && helpers.has(parent.expression.text);
    }
  }

  const violations: number[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'from') {
      const table = node.arguments[0];
      if (table && ts.isStringLiteralLike(table) && table.text === 'attempts' && !isFilteredOrInsert(node)) {
        violations.push(source.getLineAndCharacterOfPosition(node.expression.name.getStart(source)).line + 1);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return violations;
}

describe('attempts readers', () => {
  it('detects an unfiltered read immediately beside a wrapped read and an insert', () => {
    expect(unfilteredLines([
      "import { excludeBlindReviewAttempts } from '@/lib/attemptsFilter';",
      "const first = excludeBlindReviewAttempts(client.from('attempts').select('id'));",
      "const second = client.from('attempts').select('id');",
      "const third = client.from('attempts').insert(payload).select('id');",
    ].join('\n'))).toEqual([3]);
  });

  it('exclude blind review rows via the shared attemptsFilter helper on every non-insert query', () => {
    const files = [...walk('src'), 'scripts/student-work.ts'];
    const violations = files.flatMap(file => unfilteredLines(readFileSync(file, 'utf8'), file).map(line => `${file}:${line}`));
    expect(violations).toEqual([]);
  });

  it('inventories server attempts readers that still need their own filtering policy', () => {
    const readers = walk('supabase/functions').flatMap(file => {
      const count = unfilteredLines(readFileSync(file, 'utf8'), file).length;
      return count === 0 ? [] : [[file, count]];
    });
    expect(readers).toEqual([
      ['supabase/functions/admin-manage-users/index.ts', 2],
      ['supabase/functions/ta-agent/index.ts', 1],
      ['supabase/functions/ta-chat/index.ts', 1],
      ['supabase/functions/tutor-chat/index.ts', 2],
    ]);
  });
});

/** Small symbolic evaluator for checking authored conditional exercises. */
export type Expression =
  | { kind: 'literal'; name: string; negated: boolean }
  | { kind: 'and' | 'or'; terms: Expression[] }
  | { kind: 'implies'; left: Expression; right: Expression };

export type Valuation = Record<string, boolean>;

/** Accepts the bank's unambiguous letter notation, never arbitrary natural language. */
export function parseExpression(source: string): Expression {
  const text = source.trim().replace(/\.$/, '');
  const implication = text.split(' → ');
  if (implication.length === 2) {
    return { kind: 'implies', left: parseExpression(implication[0]), right: parseExpression(implication[1]) };
  }
  if (implication.length > 2) throw new Error(`Use individual rules, not a chain: ${source}`);
  const fact = /^([A-Z]) is (true|false)$/.exec(text);
  if (fact) return { kind: 'literal', name: fact[1], negated: fact[2] === 'false' };
  const conjunction = /^Both ([A-Z]) and ([A-Z]) are true$/.exec(text);
  if (conjunction) return parseExpression(`${conjunction[1]} and ${conjunction[2]}`);
  const alternative = /^At least one of ([A-Z]) and ([A-Z]) is true$/.exec(text);
  if (alternative) return parseExpression(`${alternative[1]} or ${alternative[2]}`);
  if (text.includes(' and ') && text.includes(' or ')) throw new Error(`Ambiguous scope: ${source}`);
  for (const kind of ['and', 'or'] as const) {
    const terms = text.split(` ${kind} `);
    if (terms.length > 1) return { kind, terms: terms.map(parseExpression) };
  }
  const literal = /^([A-Z])(̸)?$/.exec(text);
  if (!literal) throw new Error(`Unsupported symbolic expression: ${source}`);
  return { kind: 'literal', name: literal[1], negated: Boolean(literal[2]) };
}

export function evaluate(expression: Expression, values: Valuation): boolean {
  switch (expression.kind) {
    case 'literal': {
      if (!(expression.name in values)) throw new Error(`Missing valuation: ${expression.name}`);
      return expression.negated ? !values[expression.name] : values[expression.name];
    }
    case 'and': return expression.terms.every(term => evaluate(term, values));
    case 'or': return expression.terms.some(term => evaluate(term, values));
    case 'implies': return !evaluate(expression.left, values) || evaluate(expression.right, values);
  }
}

export function valuationsFor(expressions: Expression[]): Valuation[] {
  const names = new Set<string>();
  function visit(expression: Expression) {
    if (expression.kind === 'literal') names.add(expression.name);
    else if (expression.kind === 'implies') { visit(expression.left); visit(expression.right); }
    else expression.terms.forEach(visit);
  }
  expressions.forEach(visit);
  const variables = [...names].sort();
  if (variables.length > 12) throw new Error('Exhaustive checks are limited to 12 conditions.');
  return Array.from({ length: 2 ** variables.length }, (_, mask) =>
    Object.fromEntries(variables.map((name, index) => [name, Boolean(mask & (1 << index))])),
  );
}

export function entails(premises: Expression[], conclusion: Expression): boolean {
  return valuationsFor([...premises, conclusion]).every(values =>
    !premises.every(premise => evaluate(premise, values)) || evaluate(conclusion, values),
  );
}

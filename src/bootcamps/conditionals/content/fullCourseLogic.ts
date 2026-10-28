import type { Formula, FullCourseItem, FullCourseChoiceItem, FullCourseChainItem, ItemResponse, QuantityStatement, Rule } from './fullCourseTypes';
export type Valuation = Record<string, boolean>;
export type LogicResult = { correct: boolean; supported: boolean; reason?: string; counterexample?: Valuation; quantityCounterexample?: Valuation[] };
export const atom = (id: string): Formula => ({ atom: id });
export const not = (value: Formula): Formula => ({ not: value });
export const and = (...values: Formula[]): Formula => ({ and: values });
export const or = (...values: Formula[]): Formula => ({ or: values });
export const implies = (left: Formula, right: Formula): Formula => or(not(left), right);
export const ruleFormula = (rule: Rule) => implies(rule.if, rule.then);

export function formulaAtoms(formula: Formula): string[] {
  if (!formula || typeof formula !== 'object') throw new Error('A complete condition is required.');
  const keys = Object.keys(formula);
  if (keys.length !== 1) throw new Error('A condition must have one operation.');
  if ('atom' in formula) {
    if (typeof formula.atom !== 'string' || !formula.atom) throw new Error('A condition needs an identity.');
    return [formula.atom];
  }
  if ('not' in formula) return formulaAtoms(formula.not);
  const members = 'and' in formula ? formula.and : 'or' in formula ? formula.or : null;
  if (!Array.isArray(members) || members.length < 2) throw new Error('AND and OR need at least two members.');
  return [...new Set(members.flatMap(formulaAtoms))];
}
export function evaluate(formula: Formula, values: Valuation): boolean {
  if ('atom' in formula) {
    if (typeof values[formula.atom] !== 'boolean') throw new Error(`Missing condition: ${formula.atom}`);
    return values[formula.atom];
  }
  if ('not' in formula) return !evaluate(formula.not, values);
  if ('and' in formula) return formula.and.every(member => evaluate(member, values));
  return formula.or.some(member => evaluate(member, values));
}
export function valuations(formulas: Formula[]): Valuation[] {
  const ids = [...new Set(formulas.flatMap(formulaAtoms))];
  if (ids.length > 12) throw new Error('This exercise exceeds the exhaustive checker limit.');
  return Array.from({ length: 2 ** ids.length }, (_, mask) => Object.fromEntries(ids.map((id, i) => [id, !!(mask & (1 << i))])));
}
export function equivalent(left: Formula, right: Formula): LogicResult {
  const counterexample = valuations([left, right]).find(values => evaluate(left, values) !== evaluate(right, values));
  return { correct: !counterexample, supported: true, counterexample };
}
export function entails(premises: Formula[], conclusion: Formula): LogicResult {
  const cases = valuations([...premises, conclusion]).filter(values => premises.every(premise => evaluate(premise, values)));
  if (!cases.length) return { correct: false, supported: false, reason: 'The supplied premises cannot all be true together.' };
  const counterexample = cases.find(values => !evaluate(conclusion, values));
  return { correct: !counterexample, supported: true, counterexample };
}

export function quantityHolds(statement: QuantityStatement, members: Valuation[]): boolean {
  const group = members.filter(member => member[statement.subject] === true);
  const matching = group.filter(member => statement.predicateNegated ? member[statement.predicate] === false : member[statement.predicate] === true).length;
  switch (statement.quantifier) {
    case 'all': return matching === group.length;
    case 'none': return matching === 0;
    case 'some': return matching > 0;
    case 'most': return matching * 2 > group.length;
    case 'not-all': return matching < group.length;
    case 'exactly':
      if (!Number.isInteger(statement.count) || statement.count! < 0) throw new Error('An exact quantity needs a nonnegative whole count.');
      return matching === statement.count;
    default: throw new Error('Unsupported quantity.');
  }
}
function quantityPredicates(statements: QuantityStatement[]) {
  return [...new Set(statements.flatMap(s => [s.subject, s.predicate]))];
}
function eachPopulation(population: number, predicates: string[], visit: (members: Valuation[]) => boolean) {
  if (!Number.isInteger(population) || population < 0 || population > 5 || predicates.length > 3 || population * predicates.length > 15) throw new Error('The finite quantity checker supports up to five members and three predicates.');
  for (let mask = 0; mask < 2 ** (population * predicates.length); mask++) {
    const members = Array.from({ length: population }, (_, member) => Object.fromEntries(predicates.map((id, p) => [id, !!(mask & (1 << (member * predicates.length + p)))])));
    if (visit(members)) return;
  }
}
export function finiteQuantityEntails(population: number, predicates: string[], premises: QuantityStatement[], conclusion: QuantityStatement, nonempty: string[] = []): LogicResult {
  const needed = quantityPredicates([...premises, conclusion]);
  if (new Set(predicates).size !== predicates.length || [...needed, ...nonempty].some(id => !predicates.includes(id))) return { correct: false, supported: false, reason: 'The population does not define every predicate.' };
  let possible = false;
  let counterexample: Valuation[] | undefined;
  eachPopulation(population, predicates, members => {
    if (!nonempty.every(id => members.some(member => member[id])) || !premises.every(premise => quantityHolds(premise, members))) return false;
    possible = true;
    if (!quantityHolds(conclusion, members)) { counterexample = members; return true; }
    return false;
  });
  if (!possible) return { correct: false, supported: false, reason: 'No stated population satisfies the premises.' };
  return { correct: !counterexample, supported: true, quantityCounterexample: counterexample };
}
const quantityKey = (s: QuantityStatement) => JSON.stringify([s.quantifier, s.subject, s.predicate, !!s.predicateNegated, s.count ?? null]);
/** Reviewed general proof templates. Bounded model search is used ONLY to refute other claims. */
export function proveQuantity(premises: QuantityStatement[], conclusion: QuantityStatement, nonempty: string[] = []): LogicResult {
  const known = new Map(premises.map(s => [quantityKey(s), s]));
  const add = (s: QuantityStatement) => { known.set(quantityKey(s), s); };
  // Each rule below is a set-theoretic implication, independent of population size.
  // Witnesses survive subsets; strict majorities survive enlarging their result set;
  // two strict majorities of one reference group have a shared member.
  for (let round = 0; round < 8; round++) {
    const before = known.size;
    const all = [...known.values()];
    for (const s of all) {
      if (s.quantifier === 'most') add({ ...s, quantifier: 'some' });
      if (s.quantifier === 'some' && !s.predicateNegated) add({ quantifier: 'some', subject: s.predicate, predicate: s.subject });
      if (s.quantifier === 'all' && nonempty.includes(s.subject)) add({ ...s, quantifier: 'some' });
      if (s.quantifier === 'none') add({ quantifier: 'all', subject: s.subject, predicate: s.predicate, predicateNegated: !s.predicateNegated });
      if (s.quantifier === 'not-all') add({ quantifier: 'some', subject: s.subject, predicate: s.predicate, predicateNegated: !s.predicateNegated });
      for (const t of all) {
        if (t.quantifier === 'all' && !s.predicateNegated && s.predicate === t.subject && ['some', 'most', 'all'].includes(s.quantifier)) add({ quantifier: s.quantifier, subject: s.subject, predicate: t.predicate, predicateNegated: t.predicateNegated });
        if (s.quantifier === 'most' && t.quantifier === 'most' && s.subject === t.subject && !s.predicateNegated && !t.predicateNegated) add({ quantifier: 'some', subject: s.predicate, predicate: t.predicate });
      }
    }
    if (before === known.size) break;
  }
  if (known.has(quantityKey(conclusion))) return { correct: true, supported: true };
  const predicates = [...new Set([...quantityPredicates([...premises, conclusion]), ...nonempty])];
  if (predicates.length <= 3) {
    for (let count = 0; count <= 5; count++) {
      const result = finiteQuantityEntails(count, predicates, premises, conclusion, nonempty);
      if (result.quantityCounterexample) return { correct: false, supported: true, quantityCounterexample: result.quantityCounterexample };
    }
  }
  return { correct: false, supported: false, reason: 'This general claim is outside the reviewed proof templates. A finite search is not a proof.' };
}

export function choiceOptionResult(item: FullCourseChoiceItem, optionId: string): LogicResult {
  const option = item.options.find(candidate => candidate.id === optionId);
  if (!option) return { correct: false, supported: false, reason: 'Choose one of the available responses.' };
  const check = item.semantic;
  if (check.kind === 'equivalent' || check.kind === 'entailed') {
    if (!option.formula) return { correct: false, supported: false, reason: 'This response has no authored logical meaning.' };
    return check.kind === 'equivalent' ? equivalent(check.target, option.formula) : entails(check.premises, option.formula);
  }
  if (!option.quantity) return { correct: false, supported: false, reason: 'This response has no authored quantity meaning.' };
  return check.kind === 'finite-quantity'
    ? finiteQuantityEntails(check.population, check.predicates, check.premises, option.quantity, check.nonempty)
    : proveQuantity(check.premises, option.quantity, check.nonempty);
}
export function chainRule(item: FullCourseChainItem, id: string): Rule | null {
  const reversed = id.endsWith(':contra');
  const entry = item.rules.find(r => r.id === (reversed ? id.slice(0, -7) : id));
  const negate = (formula: Formula) => 'not' in formula ? formula.not : not(formula);
  return entry ? reversed ? { if: negate(entry.rule.then), then: negate(entry.rule.if) } : entry.rule : null;
}
/** An executable path through the controls, including explicitly chosen contrapositives. */
export function findChain(item: FullCourseChainItem): string[] | null {
  if (item.rules.length > 6) throw new Error('The chain checker supports up to six supplied rules.');
  const ids = item.rules.flatMap(r => [r.id, `${r.id}:contra`]);
  const queue: { chosen: string[]; facts: Formula[] }[] = [{ chosen: [], facts: [item.start] }];
  const seen = new Set<string>();
  for (let head = 0; head < queue.length; head++) {
    const state = queue[head];
    if (entails(state.facts, item.target).correct) return state.chosen;
    for (const id of ids) {
      if (state.chosen.includes(id)) continue;
      const rule = chainRule(item, id)!;
      if (!entails(state.facts, rule.if).correct) continue;
      const chosen = [...state.chosen, id];
      const key = chosen.slice().sort().join('|');
      if (seen.has(key)) continue;
      const facts = [...state.facts, ruleFormula(rule), rule.then];
      if (!entails(facts, item.target).supported) continue;
      seen.add(key);queue.push({ chosen, facts });
    }
  }
  return null;
}
export function checkResponse(item: FullCourseItem, response: ItemResponse): LogicResult {
  if (response.kind !== item.kind) return { correct: false, supported: false, reason: 'Complete the current task.' };
  try {
    if (item.kind === 'choice' && response.kind === 'choice') return choiceOptionResult(item, response.optionId);
    if (item.kind === 'build-rule' && response.kind === 'build-rule') {
      if (!response.left || !response.right) return { correct: false, supported: false, reason: 'Build both sides before checking.' };
      const allowed = item.atoms.map(a => a.id);
      if ([...formulaAtoms(response.left), ...formulaAtoms(response.right)].some(id => !allowed.includes(id))) return { correct: false, supported: false, reason: 'Use the conditions from this question.' };
      return equivalent(ruleFormula(item.target), implies(response.left, response.right));
    }
    if (item.kind === 'build-rules' && response.kind === 'build-rules') {
      if (response.rules.length !== item.targets.length || response.rules.some(r => !r.left || !r.right)) return { correct: false, supported: false, reason: 'Build both sides of every rule.' };
      const formulas = response.rules.map(r => implies(r.left!, r.right!));
      if (formulas.flatMap(formulaAtoms).some(id => !item.atoms.some(a => a.id === id))) return { correct: false, supported: false, reason: 'Use the conditions from this question.' };
      return equivalent(and(...item.targets.map(ruleFormula)), and(...formulas));
    }
    if (item.kind === 'build-bridge' && response.kind === 'build-bridge') {
      if (!response.left || !response.right) return { correct: false, supported: false, reason: 'Build both sides of the rule you are adding.' };
      if ([response.left, response.right].flatMap(formulaAtoms).some(id => !item.atoms.some(a => a.id === id))) return { correct: false, supported: false, reason: 'Use the conditions from this question.' };
      const added = implies(response.left, response.right);
      if (equivalent(added, item.conclusion).correct) return { correct: false, supported: true, reason: 'That restates the conclusion. Add a connecting rule instead.' };
      return entails([...item.premises, added], item.conclusion);
    }
    if (item.kind === 'case' && response.kind === 'case') {
      const ids = [...new Set([...item.premises, item.target].flatMap(formulaAtoms))];
      if (ids.some(id => typeof response.values[id] !== 'boolean')) return { correct: false, supported: false, reason: 'Decide each condition before checking.' };
      const fits = item.premises.every(p => evaluate(p, response.values));
      return { supported: true, correct: fits && (item.task === 'consistent' || !evaluate(item.target, response.values)) };
    }
    if (item.kind === 'chain' && response.kind === 'chain') {
      if (!response.ruleIds.length) return { supported: false, correct: false, reason: 'Choose the rules that connect the starting fact to the result.' };
      const used: Formula[] = [item.start];
      let reached = item.start;
      const describe = (f: Formula): string => 'atom' in f ? item.atoms.find(a => a.id === f.atom)?.label ?? f.atom : 'not' in f ? `NOT (${describe(f.not)})` : ('and' in f ? f.and : f.or).map(describe).join('and' in f ? ' AND ' : ' OR ');
      for (const id of response.ruleIds) {
        const selected = chainRule(item, id);
        if (!selected) return { supported: false, correct: false, reason: 'That connection is unavailable.' };
        if (!entails(used, selected.if).correct) return { supported: true, correct: false, reason: `You have reached “${describe(reached)}”. The next rule needs “${describe(selected.if)}”, which the facts so far do not establish.` };
        used.push(ruleFormula(selected), selected.then);
        reached = selected.then;
      }
      return entails(used, item.target);
    }
    if (item.kind === 'argument' && response.kind === 'argument') {
      const choice = item.assumptions.find(a => a.id === response.assumptionId);
      if (!choice) return { supported: false, correct: false, reason: 'Choose the rule to add.' };
      return entails([...item.premises, choice.formula], item.conclusion);
    }
    if (item.kind === 'quantity-case' && response.kind === 'quantity-case') {
      if (response.members.length !== item.population || response.members.some(m => item.predicates.some(p => typeof m[p.id] !== 'boolean'))) return { supported: false, correct: false, reason: 'Fill in every member of this stated population.' };
      return { supported: true, correct: (item.nonempty ?? []).every(id => response.members.some(m => m[id])) && item.premises.every(p => quantityHolds(p, response.members)) && !quantityHolds(item.conclusion, response.members) };
    }
    return { supported: false, correct: false, reason: 'Unsupported exercise type.' };
  } catch (error) { return { correct: false, supported: false, reason: error instanceof Error ? error.message : 'This response could not be checked.' }; }
}
export function validateItem(item: FullCourseItem): string[] {
  const errors: string[] = [];
  try {
    if ('atoms' in item) {
      if (new Set(item.atoms.map(a => a.id)).size !== item.atoms.length) errors.push('Duplicate condition identities.');
      if (item.atoms.some(a => !a.id || !a.label || !a.subject || !a.domain)) errors.push('Every condition needs its complete label, subject and domain.');
      const formulas = item.kind === 'case' ? [...item.premises, item.target] : item.kind === 'chain' ? [item.start, item.target, ...item.rules.map(r => ruleFormula(r.rule))] : item.kind === 'argument' ? [...item.premises, item.conclusion, ...item.assumptions.map(a => a.formula)] : item.kind === 'build-rules' ? item.targets.map(ruleFormula) : item.kind === 'build-bridge' ? [...item.premises, item.conclusion] : [ruleFormula(item.target)];
      if (formulas.flatMap(formulaAtoms).some(id => !item.atoms.some(a => a.id === id))) errors.push('An exercise uses an undefined condition.');
    }
    if (item.kind === 'choice') {
      if (new Set(item.options.map(o => o.id)).size !== item.options.length) errors.push('Duplicate choice identities.');
      const results = item.options.map(option => ({ id: option.id, ...choiceOptionResult(item, option.id) }));
      for (const result of results) if (!result.supported) errors.push(`${result.id}: ${result.reason}`);
      const correct = results.filter(r => r.correct);
      if (correct.length !== 1 || correct[0]?.id !== item.correctOptionId) errors.push('The authored key does not match exactly one semantically correct option.');
    } else if (item.kind === 'argument') {
      const results = item.assumptions.map(a => ({ id: a.id, ...entails([...item.premises, a.formula], item.conclusion) }));
      if (results.some(r => !r.supported)) errors.push('An assumption makes the premises inconsistent.');
      const correct = results.filter(r => r.correct);
      if (correct.length !== 1 || correct[0]?.id !== item.correctAssumptionId) errors.push('The assumption key is ambiguous or unsupported.');
    } else if (item.kind === 'build-rule') {
      const ids = item.atoms.map(a => a.id);
      if (formulaAtoms(ruleFormula(item.target)).some(id => !ids.includes(id))) errors.push('Target uses an undefined condition.');
    } else if (item.kind === 'build-rules') {
      if (item.targets.length < 2) errors.push('The multi-rule task requires at least two rules.');
      valuations(item.targets.map(ruleFormula));
    } else if (item.kind === 'build-bridge') {
      if (!entails(item.premises, item.conclusion).supported) errors.push('The bridge task has inconsistent premises.');
      if (entails(item.premises, item.conclusion).correct) errors.push('The conclusion already follows without an added bridge.');
    } else if (item.kind === 'case') {
      if (!valuations([...item.premises, item.target]).some(values => item.premises.every(p => evaluate(p, values)) && (item.task === 'consistent' || !evaluate(item.target, values)))) errors.push('No valid case can answer the task.');
    } else if (item.kind === 'quantity-case') {
      const result = finiteQuantityEntails(item.population, item.predicates.map(p => p.id), item.premises, item.conclusion, item.nonempty);
      if (!result.quantityCounterexample) errors.push('The counterexample task has no supported solution.');
    } else {
      const formulas = [item.start, item.target, ...item.rules.map(r => ruleFormula(r.rule))];
      valuations(formulas);
      if (!entails([item.start, ...item.rules.map(r => ruleFormula(r.rule))], item.target).correct) errors.push('The supplied rules cannot establish the stated result.');
      if (!findChain(item)?.length) errors.push('No executable sequence of original or contraposed connections establishes a new result.');
    }
  } catch (error) { errors.push(error instanceof Error ? error.message : 'Unsupported semantics.'); }
  return errors;
}

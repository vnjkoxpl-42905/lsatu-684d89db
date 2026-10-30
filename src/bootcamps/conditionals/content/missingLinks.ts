import { atom, not, implies, equivalent, entails, ruleFormula } from './fullCourseLogic';
import type { Formula, Rule } from './fullCourseTypes';
import { CONDITIONAL_QUESTIONS } from '@/features/activity-centre/conditionals/content';

export type Literal = { atom: string; negative: boolean };
export type MissingLink = { id: string; sourceId: string; ordinal: number; round: number; premises: Rule[]; conclusion: Rule; bridge: Rule; chain: Formula[]; explanation: string };
export const literal = (name: string): Formula => name.startsWith('!') ? not(atom(name.slice(1))) : atom(name);
/** Supplementary construction metadata only. The shared question bank owns every premise, target and answer. */
const chains: string[][] = [
 ['A','B','C'], ['C','A','B'], ['C','!B','!A'], ['!B','!A','C'],
 ['A','B','C','D'], ['C','D','A','B'], ['!D','!C','!B','!A'], ['!B','!A','!D','!C'],
 ['C','D','!B','!A'], ['A','B','!D','!C'], ['!D','!C','A','B'], ['!B','!A','C','D'],
];
function sourceRule(text: string): Rule {
 const parts = text.split('→').map(part => part.trim());
 if (parts.length !== 2 || parts.some(part => !/^[A-Z][\u0336\u0338]?$/.test(part))) throw new Error(`Unsupported source rule: ${text}`);
 const formula = (part: string) => part.length > 1 ? not(atom(part[0])) : atom(part);
 return { if: formula(parts[0]), then: formula(parts[1]) };
}
/** Retained optional construction prototype. Main practice uses the original 22-question shared player. */
export const missingLinks: MissingLink[] = chains.map((chain, index) => {
 const suffix = String(index + 1).padStart(2,'0');
 const source = CONDITIONAL_QUESTIONS.find(question => question.id === `PHOTO-ML${suffix}`);
 const answer = source?.choices.find(choice => choice.id === source.correctChoiceId);
 if (!source?.conclusion || !answer) throw new Error(`Missing original PHOTO-ML${suffix} source.`);
 return {
  id: `ml-source-${suffix}`, sourceId: source.id, ordinal: index + 1, round: Math.floor(index / 4) + 1,
  premises: source.premises.map(sourceRule), conclusion: sourceRule(source.conclusion), bridge: sourceRule(answer.text), chain: chain.map(literal),
  explanation: 'Add the missing connection, then follow the complete chain to the original conclusion.',
 };
});
export const negate = (formula: Formula): Formula => 'not' in formula ? formula.not : not(formula);
export const contrapose = (rule: Rule): Rule => ({ if: negate(rule.then), then: negate(rule.if) });
export const literalFormula = (value: Literal): Formula => value.negative ? not(atom(value.atom)) : atom(value.atom);
export const readFormula = (value: Formula): string => 'atom' in value ? value.atom : 'not' in value ? `not ${readFormula(value.not)}` : ('and' in value ? value.and : value.or).map(readFormula).join('and' in value ? ' and ' : ' or ');
export type BridgeCheck = { kind: 'match' | 'off-task-sufficient' | 'inconsistent' | 'wrong'; message: string; counterexample?: Record<string,boolean> };
export function checkMissingLink(item: MissingLink, candidate: Rule): BridgeCheck {
 const added = ruleFormula(candidate);
 if (equivalent(added, ruleFormula(item.bridge)).correct) return {kind:'match',message:'That connects the displayed ends. Follow the new arrow to check the conclusion.'};
 const result = entails([...item.premises.map(ruleFormula),added],ruleFormula(item.conclusion));
 if (!result.supported) return {kind:'inconsistent',message:'That addition cannot hold with the given rules. Look for a connection that leaves a possible case.'};
 if (result.correct) return {kind:'off-task-sufficient',message:'That can be sufficient, but this task asks for the connection between the displayed ends.'};
 return {kind:'wrong',message:'The conclusion still need not follow. Start at its IF side and follow the given arrows. Which reachable end needs a new connection?',counterexample:result.counterexample};
}

export const englishTransfers = [
 { id:'ml-english-compound', prompt:'Every selected report is edited. Every report that is both edited and signed is stored. Which added rule proves that every selected report is stored?', choices:['Every selected report is signed.','Every edited report is selected.','Every stored report is signed.'], correct:0, hint:'Selection already gives editing. What else does the storage rule need?', explanation:'Every selected report is edited under the first rule and signed under the added rule. Both requirements for storage are met, so every selected report is stored.' },
 { id:'ml-english-named', prompt:'Every registered parcel is logged. Parcel N is registered. Which added rule proves that Parcel N is insured?', choices:['Every logged parcel is insured.','Parcel N is insured only if it is logged.','Every insured parcel is registered.'], correct:0, hint:'The named fact reaches logging for Parcel N. Which rule carries that parcel from logging to insurance?', explanation:'Parcel N is registered, so Parcel N is logged. The added universal rule covers that logged parcel, so Parcel N is insured. This proves a fact about Parcel N. It does not prove that every parcel is insured.' },
];

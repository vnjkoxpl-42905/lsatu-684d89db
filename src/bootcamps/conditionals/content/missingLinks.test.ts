import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { missingLinks, checkMissingLink, contrapose, literal, englishTransfers } from './missingLinks';
import { atom, not, implies, entails, evaluate, equivalent, valuations, ruleFormula } from './fullCourseLogic';
import { fullCoursePractice, fullCourseQuiz } from './fullCourseItems';
import baseline from './missingLinks.required-before.json';
import { CONDITIONAL_QUESTIONS } from '@/features/activity-centre/conditionals/content';

describe('supplied Missing Links source semantics',()=>{
 it('derives the twelve supplied cases from their existing shared question identities', () => {
  expect(missingLinks.map(item => item.sourceId)).toEqual(Array.from({ length: 12 }, (_, index) => `PHOTO-ML${String(index + 1).padStart(2, '0')}`));
  for (const item of missingLinks) {
   const source = CONDITIONAL_QUESTIONS.find(question => question.id === item.sourceId)!;
   const text = (formula: Parameters<typeof ruleFormula>[0]['if']): string => 'atom' in formula ? formula.atom : 'not' in formula && 'atom' in formula.not ? `${formula.not.atom}\u0338` : '';
   const rule = (value: Parameters<typeof ruleFormula>[0]) => `${text(value.if)} → ${text(value.then)}`;
   expect(item.premises.map(rule)).toEqual(source.premises);
   expect(rule(item.conclusion)).toBe(source.conclusion);
   expect(rule(item.bridge)).toBe(source.choices.find(choice => choice.id === source.correctChoiceId)!.text);
  }
 });
 it.each(missingLinks)('$id has a possible premise set, needs its addition, and reaches the exact target',item=>{
  const premises=item.premises.map(ruleFormula), target=ruleFormula(item.conclusion);
  expect(entails(premises,target).supported).toBe(true);
  expect(entails(premises,target).correct).toBe(false);
  expect(entails([...premises,ruleFormula(item.bridge)],target).correct).toBe(true);
  expect(checkMissingLink(item,item.bridge).kind).toBe('match');
  expect(checkMissingLink(item,contrapose(item.bridge)).kind).toBe('match');
  expect(checkMissingLink(item,{if:not(not(item.bridge.if)),then:not(not(item.bridge.then))}).kind).toBe('match');
  for(const premise of item.premises)expect(equivalent(ruleFormula(premise),ruleFormula(contrapose(premise))).correct).toBe(true);
  expect(checkMissingLink(item,{if:item.bridge.then,then:item.bridge.if}).kind).not.toBe('match');
  expect(checkMissingLink(item,{if:not(item.bridge.if),then:not(item.bridge.then)}).kind).not.toBe('match');
 });
 it.each(missingLinks)('$id classifies every signed endpoint pair against independent truth valuations',item=>{
  const atoms=[...new Set(valuations([...item.premises.map(ruleFormula),ruleFormula(item.conclusion)]).flatMap(Object.keys))];
  const signed=atoms.flatMap(id=>[atom(id),not(atom(id))]);
  let matches=0;
  for(const left of signed)for(const right of signed){
   const candidate={if:left,then:right},added=implies(left,right),result=checkMissingLink(item,candidate);
   const rows=valuations([...item.premises.map(ruleFormula),ruleFormula(item.conclusion),added]);
   const isMatch=rows.every(v=>evaluate(added,v)===evaluate(ruleFormula(item.bridge),v));
   const possible=rows.filter(v=>item.premises.every(p=>evaluate(ruleFormula(p),v))&&evaluate(added,v));
   const sufficient=possible.length>0&&possible.every(v=>evaluate(ruleFormula(item.conclusion),v));
   expect(result.kind).toBe(isMatch?'match':!possible.length?'inconsistent':sufficient?'off-task-sufficient':'wrong');
   if(isMatch)matches++;
  }
  expect(matches).toBe(2);
 });
 it('distinguishes a sufficient off-task answer without calling it false',()=>{
  const result=checkMissingLink(missingLinks[0],missingLinks[0].conclusion);
  expect(result.kind).toBe('off-task-sufficient');expect(result.message).toContain('can be sufficient');
 });
 it('keeps negative literals explicit and the twelve source identities stable',()=>{
  expect(missingLinks.map(i=>i.id)).toEqual(Array.from({length:12},(_,i)=>`ml-source-${String(i+1).padStart(2,'0')}`));
  expect(JSON.stringify(missingLinks)).not.toMatch(/[\u0336\u0338]/);
  expect(literal('!A')).toEqual({not:{atom:'A'}});
  expect(englishTransfers.map(i=>i.id)).toEqual(['ml-english-compound','ml-english-named']);
 });
});
it('preserves serialized required practice and quiz data before the supplementary activity',()=>{
 expect({practice:Object.fromEntries(['missing-bridges','sufficient-bridges'].map(k=>[k,fullCoursePractice[k]])),quiz:Object.fromEntries(['missing-bridges','sufficient-bridges'].map(k=>[k,fullCourseQuiz[k]]))}).toEqual(baseline);
 expect(createHash('sha256').update(readFileSync('src/bootcamps/conditionals/content/fullCourseGradingBaseline.json')).digest('hex')).toBe('82983f011100c2809e0fa1d5f2f638af9157ac6a3ea5eee78ebe3d3a973ad1f7');
});

import { describe, expect, it } from 'vitest';
import { CONDITIONAL_QUESTIONS } from './content';
import { entails, evaluate, parseExpression, valuationsFor } from './logic';

// Independent formalizations of the language items. Choice order matches the authored bank.
const language: Record<string, { premises: string[]; conclusion?: string; choices: string[] }> = {
  ML7: { premises: ['B → E', 'E → R'], conclusion: 'G → R', choices: ['B → G', 'R → G', 'G → B̸', 'G → B', 'E → G'] },
  ML8: { premises: ['X → V̸', 'E → V'], conclusion: 'C → E̸', choices: ['C → X', 'X → C', 'C̸ → X', 'C → V', 'V → E'] },
  ML9: { premises: ['L → I', 'I → S'], conclusion: 'F → L̸', choices: ['S̸ → F', 'F → S̸', 'F → S', 'I̸ → F', 'S → L'] },
  ML10: { premises: ['F → S or J', 'J → A', 'P̸ → A'], conclusion: 'F → A', choices: ['P̸ → S', 'P → S', 'S → P', 'A → S', 'S → P̸'] },
  MBT7: { premises: ['E → R', 'R → C'], choices: ['C → E', 'E̸ → C̸', 'R → E', 'E → C', 'C → R'] },
  MBT8: { premises: ['D → A̸', 'I → A'], choices: ['I → D̸', 'D̸ → I', 'I̸ → D', 'A → I', 'D → I'] },
  MBT9: { premises: ['S̸ → O', 'O → C'], choices: ['S → O̸', 'C̸ → S', 'C → O', 'O̸ → S̸', 'C̸ → S̸'] },
  MBT10: { premises: ['G → A', 'A → R', 'K̸ → R̸', 'R → S or E', 'G', 'S̸'], choices: ['E and K̸', 'E̸ and K', 'S and K', 'R̸ and E', 'E and K'] },
  LINK5: { premises: ['R → A', 'V → L'], conclusion: 'R → L', choices: ['A → V', 'V → R', 'L → R', 'R → V̸', 'R̸ → L'] },
  LINK6: { premises: ['L → F', 'R → A'], conclusion: 'L → A', choices: ['A → F', 'R → F', 'F → R', 'F̸ → R', 'A → R'] },
  LINK7: { premises: ['P → C', 'B → E̸'], conclusion: 'B → P̸', choices: ['E → C', 'B → C', 'C̸ → B', 'C → E', 'E → P'] },
  LINK8: { premises: ['S → R', 'O̸ → P'], conclusion: 'S → P', choices: ['O̸ → R', 'R → O̸', 'P → R', 'R → O', 'O → R'] },
};

describe('conditional question inventory', () => {
  it('preserves all draft IDs and all twelve photographed exercises', () => {
    expect(CONDITIONAL_QUESTIONS).toHaveLength(40);
    expect(new Set(CONDITIONAL_QUESTIONS.map(q => q.id)).size).toBe(40);
    for (let index = 1; index <= 10; index++) {
      expect(CONDITIONAL_QUESTIONS.some(q => q.id === `ML${index}`)).toBe(true);
      expect(CONDITIONAL_QUESTIONS.some(q => q.id === `MBT${index}`)).toBe(true);
    }
    for (let index = 1; index <= 12; index++) {
      expect(CONDITIONAL_QUESTIONS.some(q => q.id === `PHOTO-ML${String(index).padStart(2, '0')}`)).toBe(true);
    }
  });

  it('covers every indicator group in each world’s language questions', () => {
    for (const mode of ['linking', 'missing-link', 'must-be-true']) {
      const tags = new Set(CONDITIONAL_QUESTIONS.filter(q => q.mode === mode).flatMap(q => q.groupTags ?? []));
      expect([...tags].sort()).toEqual(['1', '2', '3', '4']);
    }
  });

  it('keeps the photographed negations and conclusions intact', () => {
    const targets = ['A → C', 'C → B', 'C → A̸', 'B̸ → C', 'A → D', 'C → B', 'D̸ → A̸', 'B̸ → C̸', 'C → A̸', 'A → C̸', 'D̸ → B', 'B̸ → D'];
    targets.forEach((target, index) => {
      const question = CONDITIONAL_QUESTIONS.find(q => q.id === `PHOTO-ML${String(index + 1).padStart(2, '0')}`);
      expect(question?.conclusion).toBe(target);
      expect(question?.premises).toEqual(index < 4 ? ['A → B'] : ['A → B', 'C → D']);
    });
  });
});

describe.each(CONDITIONAL_QUESTIONS)('$id', question => {
  it('has five distinct choices with no answer markings or foreign notation', () => {
    expect(question.choices.map(choice => choice.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(new Set(question.choices.map(choice => choice.text)).size).toBe(5);
    const visible = [...question.premises, question.conclusion ?? '', ...question.choices.map(choice => choice.text), question.explanation].join(' ');
    expect(visible).not.toMatch(/[¬∧∨[\]()]/);
    expect(question.choices.some(choice => /\*\*|✓|correct/i.test(choice.text))).toBe(false);
  });

  it('has exactly one logically valid answer with a satisfiable trigger', () => {
    const formal = language[question.id] ?? {
      premises: question.premises,
      conclusion: question.conclusion,
      choices: question.choices.map(choice => choice.text),
    };
    const premises = formal.premises.map(parseExpression);
    const choices = formal.choices.map(parseExpression);
    expect(valuationsFor(premises).some(values => premises.every(p => evaluate(p, values)))).toBe(true);
    if (question.mode === 'must-be-true') {
      const valid = choices.flatMap((choice, index) => entails(premises, choice) ? [question.choices[index].id] : []);
      expect(valid).toEqual([question.correctChoiceId]);
    } else {
      const conclusion = parseExpression(formal.conclusion!);
      expect(entails(premises, conclusion)).toBe(false);
      const valid = choices.flatMap((choice, index) => entails([...premises, choice], conclusion) ? [question.choices[index].id] : []);
      expect(valid).toEqual([question.correctChoiceId]);
      const selected = choices[question.choices.findIndex(choice => choice.id === question.correctChoiceId)];
      const augmented = [...premises, selected];
      expect(conclusion.kind).toBe('implies');
      if (conclusion.kind === 'implies') {
        expect(valuationsFor([...augmented, conclusion]).some(values =>
          augmented.every(p => evaluate(p, values)) && evaluate(conclusion.left, values),
        )).toBe(true);
      }
    }
  });
});

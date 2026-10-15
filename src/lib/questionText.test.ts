import { describe, expect, it } from 'vitest';
import { cleanAnswerChoice, stripDataArtifacts, unwrapSourceLineBreaks } from './questionText';

describe('unwrapSourceLineBreaks', () => {
  it('reflows a stimulus captured with the printed test’s column wrap', () => {
    const wrapped = [
      'Press release: A comprehensive review evaluating the',
      'medical studies done up to the present time has',
      'found no reason to think that drinking coffee',
      'in normal amounts harms the coffee-drinker’s heart.',
    ].join('\n');
    expect(unwrapSourceLineBreaks(wrapped)).toBe(
      'Press release: A comprehensive review evaluating the medical studies done up to ' +
        'the present time has found no reason to think that drinking coffee in normal ' +
        'amounts harms the coffee-drinker’s heart.',
    );
  });

  it('rejoins a word the wrap split on its hyphen, without adding a space', () => {
    expect(unwrapSourceLineBreaks('The cost of alternative-\nenergy research rose.')).toBe(
      'The cost of alternative-energy research rose.',
    );
  });

  it('keeps each speaker on their own line', () => {
    const dialogue = ['Ana: The council should fund the', 'repairs this year.', 'Bo: That is premature.'].join('\n');
    expect(unwrapSourceLineBreaks(dialogue)).toBe(
      'Ana: The council should fund the repairs this year.\nBo: That is premature.',
    );
  });

  it('leaves the author’s own paragraphs alone', () => {
    const paragraphs = [
      'Anyone who thinks that the terrors of the ancient regime were exclusively the work of fanatics is overlooking a basic truth.',
      'The regime executed many people in pursuit of its goal, and it later became clear that the goal itself was never attainable.',
    ].join('\n');
    expect(unwrapSourceLineBreaks(paragraphs)).toBe(paragraphs);
  });

  it('preserves a blank-line paragraph break', () => {
    const text = 'First short line here.\n\nSecond short line here.';
    expect(unwrapSourceLineBreaks(text)).toBe(text);
  });

  it('leaves a single-line stimulus untouched', () => {
    expect(unwrapSourceLineBreaks('One line only.')).toBe('One line only.');
  });
});

describe('stripDataArtifacts', () => {
  it('removes authoring markers and reflows in one pass', () => {
    expect(stripDataArtifacts('The mayor said {#412} that the\nbridge would open on time.')).toBe(
      'The mayor said that the bridge would open on time.',
    );
  });
});

describe('cleanAnswerChoice', () => {
  it('drops the leading letter marker', () => {
    expect(cleanAnswerChoice('A', '(A) The review studied patients.')).toBe('The review studied patients.');
  });

  it('reflows a wrapped choice', () => {
    expect(cleanAnswerChoice('B', 'B. The health of the heart is\nnot identical with the body.')).toBe(
      'The health of the heart is not identical with the body.',
    );
  });
});

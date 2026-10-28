import { expect, it } from 'vitest';
import { appendQuestionContext, readInboxQuestionContext, seedQuestionContext } from './inboxQuestionContext';

const context = { actorId: 'student', text: 'PT120 S1 Q2\nSource session: session', returnTo: '/rc/drill?sessionId=session&review=1&q=2' };
it('accepts only the current actor and a local reading question return', () => {
  expect(readInboxQuestionContext(context, 'student')).toEqual(context);
  expect(readInboxQuestionContext(context, 'other')).toBeNull();
  expect(readInboxQuestionContext({ ...context, returnTo: '//example.com' }, 'student')).toBeNull();
  expect(readInboxQuestionContext({ ...context, returnTo: '/inbox' }, 'student')).toBeNull();
});
it('prefills an empty composer and preserves existing draft text until explicit insertion', () => {
  expect(seedQuestionContext('', context.text)).toBe(context.text);
  expect(seedQuestionContext('My existing draft', context.text)).toBe('My existing draft');
  expect(appendQuestionContext('My existing draft', context.text)).toBe(`My existing draft\n\n${context.text}`);
  expect(appendQuestionContext(context.text, context.text)).toBe(context.text);
});

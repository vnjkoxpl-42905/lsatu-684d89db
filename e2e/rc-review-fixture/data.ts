export const passage = {
  passageId: 7, preptest: 120, section: 1, setNumber: 1, title: 'How evidence supports a claim',
  topic: 'Science', format: 'Standard (Non-Comparative)', frameworks: [], difficulty: 2,
  text: 'A claim needs evidence. A measured observation can support a claim without proving every part of it.\n\nConsider a study of two gardens. One received more water. Its plants grew taller. Other differences between the gardens could also explain the result.',
  summaries: { standard: null, brief: null, anotherWay: null },
  questions: [1, 2].map((id) => ({ questionId: id, position: id, questionType: 'Main Point', questionTypeFamily: 'Big Picture', difficulty: 2,
    prompt: id === 1 ? 'What does the passage say about evidence?' : 'Why does the author discuss the gardens?',
    correctAnswer: 'A', hasWrittenExplanation: true, explanationBlocks: [{ heading: null, body: 'Evidence supports a claim, but other explanations may remain.' }],
    totalResponses: null, features: [], choices: ['A', 'B', 'C', 'D', 'E'].map(letter => ({ letter,
      text: letter === 'A' ? 'Evidence can support a claim while leaving other explanations possible.' : `An alternative claim ${letter}.`,
      tag: null, percent: null, responseCount: null, correct: letter === 'A', explanation: letter === 'A' ? 'This preserves the limit stated in the passage.' : 'This does not match the stated limit.' })) })),
};
export const session = { id: 'fixture-session', userId: 'synthetic-owner', passageIds: [7], status: 'completed',
  excludedFromAnalytics: false, startedAt: '2026-10-17T12:00:00Z', completedAt: '2026-10-17T12:10:00Z',
  config: { reveal: 'end_of_set', timing: { mode: 'unlimited' }, source: 'manual' } };
export const attempts = [1, 2].map(questionId => ({ id: `fixture-attempt-${questionId}`, userId: 'synthetic-owner', sessionId: session.id,
  questionId, passageId: 7, selected: 'B', isCorrect: false, isFirstAttempt: true, timeMs: 1000, flagged: false, eliminations: [] }));

import { passage } from './data';
export const loadPassages = async (ids?: number[]) => !ids ? [passage] : ids.map(id => id === 7 ? passage : ({ ...passage, passageId: id, title: `Evidence passage ${id}`, questions: passage.questions.map(q => ({ ...q, questionId: id * 10 + q.position })) }));
export const loadPassage = async () => passage;
export const loadAllIndexPassages = async () => Array.from({ length: 205 }, (_, index) => ({
  ...passage, passageId: index + 1, title: `Evidence passage ${index + 1}`, questionIds: [index + 1], questionCount: 1, explainedCount: 1, firstWords: 'A claim needs evidence.',
}));
export const loadRcQuestionIndex = async () => ({ questionCount: 205, questions: Array.from({ length: 205 }, (_, index) => ({
  ...passage.questions[0], questionId: index + 1, passageId: index + 1, preptest: 120, section: 1, setNumber: 1, features: [],
})) });

export function useAuth() { return { user: { id: 'fixture-student' }, authReady: true }; }
export function useQuestionBank() { return { isLoading: false, error: null }; }
const blockedMutation = { mutateAsync: async () => { throw new Error('Fixture changes are disabled. No live account was changed.'); } };
export function useSavedSets() {
  return { sets: [{ id: 'fixture-set', user_id: 'fixture-student', name: 'Causal reasoning practice', question_ids: ['PT101-S1-Q1', 'fixture-unavailable'], created_at: '2026-10-18T12:00:00Z' }], isLoading: false, remove: blockedMutation, duplicate: blockedMutation, rename: blockedMutation };
}
export const questionBank = { getQuestion: (qid: string) => qid === 'PT101-S1-Q1' ? {
  qid, pt: 101, section: 1, qnum: 1, qtype: 'Strengthen', difficulty: 3,
  stimulus: 'The city planted trees near every school. This should make schoolyards cooler during the summer.',
  questionStem: 'Which choice most strengthens the claim?',
  answerChoices: { A: 'Trees provide shade that reduces ground temperatures.', B: 'The schools have libraries.', C: 'The city opened a park.', D: 'Some trees are old.', E: 'Teachers use the schoolyard.' },
} : undefined };
export async function recordExposures() { /* Synthetic preview never writes exposure. */ }
export function RcSavedSetsPanel() { return null; }
export const supabase = new Proxy({}, { get() { throw new Error('Live backend access is disabled in the LR saved-set fixture.'); } });

import { attempts, session } from './data';
const training = new URLSearchParams(location.search).get('fixture') === 'training';
const attemptKey = training ? 'rc-fixture-training-attempts' : 'rc-fixture-review-attempts';
const sessionKey = new URLSearchParams(location.search).get('fixture') === 'review' ? 'rc-fixture-review-session' : training ? 'rc-fixture-training-session' : 'rc-fixture-session';
const read = () => {
  try { return JSON.parse(localStorage.getItem(sessionKey) || 'null') ?? (training ? { ...session, status: 'in_progress', completedAt: null } : session); } catch { return session; }
};
const fail = () => { if (new URLSearchParams(location.search).has('fail')) throw new Error('Fixture save failed. Your answer has not reached the account.'); };
export const getSession = async () => read();
export const listSessions = async () => [read()];
export const getQuestionHistory = async () => new Map();
export const getRcHistorySnapshot = async () => ({ history: new Map(), displayHistory: new Map(), hasHiddenGradedResults: false });
export const abandonSession = async () => { fail(); };
export const getSessionAttempts = async () => [...(training ? [] : attempts), ...JSON.parse(localStorage.getItem(attemptKey) || '[]')];
export const revealSessionResults = async () => {
  fail(); const value = read(); value.config.resultsRevealedAt = new Date().toISOString();
  localStorage.setItem(sessionKey, JSON.stringify(value)); return value;
};
export const setSessionExcluded = async (_id: string, excluded: boolean) => {
  fail(); const value = read(); value.excludedFromAnalytics = excluded;
  localStorage.setItem(sessionKey, JSON.stringify(value));
};
export const createSession = async () => { fail(); return { ...session, id: 'fixture-retry', status: 'in_progress' }; };
let answerSaveFails = new URLSearchParams(location.search).has('fail');
export function allowFixtureAnswerSave() { answerSaveFails = false; }
export const recordAttempt = async (attempt: Record<string, unknown>) => {
  await new Promise(resolve => setTimeout(resolve, 250));
  if (answerSaveFails) throw new Error('Synthetic account save rejected.');
  const key = attemptKey;
  const rows = JSON.parse(localStorage.getItem(key) || '[]');
  if (!rows.some((row: { id: string }) => row.id === attempt.id)) rows.push(attempt);
  localStorage.setItem(key, JSON.stringify(rows));
  return attempt;
};
export const saveSessionClock = async (_id: string, elapsed: number, index?: number, draft?: { answers: unknown[] }) => { if (!training) throw new Error('Review fixture must not save a clock.'); const value = read(); value.config.clockElapsedSeconds = elapsed; if (index !== undefined) value.config.currentQuestionIndex = index; if (draft) value.config.draftAnswers = draft.answers; localStorage.setItem(sessionKey, JSON.stringify(value)); };
export const completeSession = async () => { if (!training) throw new Error('Review fixture must not complete source work.'); const value = read(); value.status = 'completed'; value.completedAt = new Date().toISOString(); localStorage.setItem(sessionKey, JSON.stringify(value)); };
export const setAttemptFlag = async () => undefined;

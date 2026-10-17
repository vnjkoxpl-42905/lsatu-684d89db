import { attempts, session } from './data';
const read = () => {
  try { return JSON.parse(localStorage.getItem('rc-fixture-session') || 'null') ?? session; } catch { return session; }
};
const fail = () => { if (new URLSearchParams(location.search).has('fail')) throw new Error('Fixture save failed. Your answer has not reached the account.'); };
export const getSession = async () => read();
export const getSessionAttempts = async () => attempts;
export const revealSessionResults = async () => {
  fail(); const value = read(); value.config.resultsRevealedAt = new Date().toISOString();
  localStorage.setItem('rc-fixture-session', JSON.stringify(value)); return value;
};
export const setSessionExcluded = async (_id: string, excluded: boolean) => {
  fail(); const value = read(); value.excludedFromAnalytics = excluded;
  localStorage.setItem('rc-fixture-session', JSON.stringify(value));
};
export const createSession = async () => { fail(); return { ...session, id: 'fixture-retry', status: 'in_progress' }; };

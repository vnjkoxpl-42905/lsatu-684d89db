import { mirroredSetItem } from "@/lib/cloudMirror";

export interface QuizSession { index: number; score: number; streak: number; streakHigh: number; answered: boolean }
export const emptyQuizSession = (): QuizSession => ({ index: 0, score: 0, streak: 0, streakHigh: 0, answered: false });
export const quizSessionKey = (owner: string | null, moduleId: string) => `lsatu_abstract_quiz_v1_${owner ?? "preview"}_${moduleId}`;
export function loadQuizSession(key: string, total: number): QuizSession {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!value || !Number.isInteger(value.index) || value.index < 0 || value.index >= total || typeof value.answered !== "boolean" || ![value.score, value.streak, value.streakHigh].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= total)) return emptyQuizSession();
    return value;
  } catch { return emptyQuizSession(); }
}
export function saveQuizSession(key: string, value: QuizSession) {
  try { const raw = JSON.stringify(value); localStorage.setItem(key, raw); mirroredSetItem(key, raw); return true; } catch { return false; }
}

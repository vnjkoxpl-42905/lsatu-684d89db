import type { SectionAnalysis } from '@/lib/sectionAnalysis';
import type { SectionHistoryRow } from '@/lib/sectionHistory';
import {
  buildSectionStats,
  buildSectionTotals,
  type SectionQuestionStat,
} from '@/lib/sectionHistorySave';
import type { BlindReviewResult, DrillSession } from '@/types/drill';

export interface SectionClockInfo {
  totalMs: number;
  perQuestionMs: number;
  label: string | null;
}

export interface DiagnosisSelection {
  analysis: SectionAnalysis | null;
  source: 'blind-review' | 'first-pass' | null;
  label: string | null;
}

/**
 * Single selector for which diagnosis version to display across the section
 * report, the history list, and the teacher panel (plan 2.8, 3.2).
 */
export function selectSectionDiagnosis(input: {
  analysis: SectionAnalysis | null;
  analysisSource?: 'first-pass' | 'blind-review' | null;
  brUsed?: boolean;
}): DiagnosisSelection {
  if (!input.analysis) {
    return { analysis: null, source: null, label: null };
  }
  if (input.analysisSource === 'blind-review') {
    return {
      analysis: input.analysis,
      source: 'blind-review',
      label: 'Blind review diagnosis',
    };
  }
  return {
    analysis: input.analysis,
    source: 'first-pass',
    label: 'First-pass diagnosis',
  };
}

export interface SectionReportData {
  historyId?: string | null;
  pt?: number;
  section?: number;
  completedAt?: string;
  stats: SectionQuestionStat[];
  initialScore: number;
  initialTotal: number;
  initialPercent: number;
  brScore: number | null;
  brPercent: number | null;
  brDelta: number | null;
  brUsed: boolean;
  totalTimeMs: number;
  avgTimeMs: number;
  unansweredCount: number;
  predictedScore: number | null;
  /** True when reading a saved record so "No prediction saved" is shown explicitly. */
  showPredictionStatus: boolean;
  analysis: SectionAnalysis | null;
  analysisSource: 'first-pass' | 'blind-review' | null;
  sectionClock: SectionClockInfo | null;
  hasDetail: boolean;
}

export function sectionClockFromSession(
  session: DrillSession,
  questionCount: number,
): SectionClockInfo | null {
  const timer = session.fullSectionConfig?.timer;
  if (!timer || timer.mode === 'unlimited' || questionCount === 0) return null;
  const minutes =
    timer.mode === 'custom' ? (timer.customMinutes ?? 0) : Number(timer.mode);
  if (!minutes || Number.isNaN(minutes)) return null;
  const label =
    minutes === 35
      ? 'Standard'
      : minutes === 52.5
        ? 'Time and a half'
        : minutes === 70
          ? 'Double time'
          : null;
  return {
    totalMs: minutes * 60_000,
    perQuestionMs: (minutes * 60_000) / questionCount,
    label,
  };
}

/** Merge saved review-record BR answers onto saved first-pass question stats. */
export function mergeBrIntoQuestionStats(
  questions: SectionQuestionStat[],
  brResults?: BlindReviewResult[] | null,
): SectionQuestionStat[] {
  if (!Array.isArray(brResults) || brResults.length === 0) return questions;
  const byQid = new Map(brResults.map((r) => [r.qid, r]));
  return questions.map((q) => {
    const br = byQid.get(q.qid);
    if (!br) return q;
    const brCorrect = br.brAnswer === q.correctAnswer;
    return {
      ...q,
      brAnswer: br.brAnswer,
      brCorrect,
      brTimeMs: br.brTimeMs,
      brChanged: br.brAnswer !== q.initialAnswer,
    };
  });
}

export function sectionHistoryToReportData(
  row: SectionHistoryRow,
  sectionClock: SectionClockInfo | null = null,
): SectionReportData {
  const stats = mergeBrIntoQuestionStats(row.questions, row.brResults);
  return {
    historyId: row.id,
    pt: row.pt,
    section: row.section,
    completedAt: row.completedAt,
    stats,
    initialScore: row.initialScore,
    initialTotal: row.initialTotal,
    initialPercent: row.initialPercent,
    brScore: row.brUsed ? row.brScore : null,
    brPercent: row.brUsed ? row.brPercent : null,
    brDelta: row.brUsed ? row.brDelta : null,
    brUsed: row.brUsed,
    totalTimeMs: row.totalTimeMs,
    avgTimeMs: row.avgTimeMs,
    unansweredCount: row.unansweredCount,
    predictedScore: typeof row.predictedScore === 'number' ? row.predictedScore : null,
    showPredictionStatus: true,
    analysis: row.analysis,
    analysisSource: row.analysis ? (row.analysisSource ?? 'first-pass') : null,
    sectionClock,
    hasDetail: stats.length > 0,
  };
}

export function sessionToReportData(
  session: DrillSession,
  brResults?: BlindReviewResult[],
  predictedScore?: number | null,
  historyId?: string | null,
): SectionReportData {
  const stats = buildSectionStats(session, brResults);
  const totals = buildSectionTotals(stats, brResults);
  const hasBr = totals.brScore !== null;
  return {
    historyId: historyId ?? null,
    pt: session.fullSectionConfig?.pt,
    section: session.fullSectionConfig?.section,
    stats,
    initialScore: totals.initialScore,
    initialTotal: totals.initialTotal,
    initialPercent: totals.initialPercent,
    brScore: totals.brScore,
    brPercent: totals.brPercent,
    brDelta: totals.delta,
    brUsed: hasBr,
    totalTimeMs: totals.totalTimeMs,
    avgTimeMs: totals.avgTimeMs,
    unansweredCount: totals.unansweredCount,
    predictedScore: typeof predictedScore === 'number' ? predictedScore : null,
    showPredictionStatus: typeof predictedScore === 'number' || Boolean(historyId),
    analysis: null,
    analysisSource: null,
    sectionClock: sectionClockFromSession(session, stats.length),
    hasDetail: stats.length > 0,
  };
}

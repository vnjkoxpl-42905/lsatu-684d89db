import { supabase } from '@/integrations/supabase/client';
import { PracticeSession, TABLES } from '@/bootcamps/main-conclusion/persistence/records';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { loadRcIndex } from '@/features/rc/lib/rcBank';
import { getSessionAttempts, listSessions } from '@/features/rc/api/rcProgress';

interface CompletedLrMirror {
  pt: number;
  section: number;
  completedAt: string;
  questions: unknown;
}

/** A legacy resume row and a result row are mirrors only when their saved question identities and first answers agree. */
export function isCompletedLrMirror(session: PracticeSession, result: CompletedLrMirror): boolean {
  if (session.status !== 'completed') return false;
  const match = /^drill::section::pt(\d+)-s(\d+)$/.exec(session.pool_slug);
  if (!match || Number(match[1]) !== result.pt || Number(match[2]) !== result.section) return false;
  const completed = Date.parse(result.completedAt);
  if (!Number.isFinite(completed) || completed < Date.parse(session.started_at) || completed > Date.parse(session.updated_at) + 5 * 60_000) return false;
  if (!Array.isArray(result.questions) || result.questions.length !== session.question_queue.length) return false;
  const saved = new Map(session.attempts.map((attempt) => [attempt.qid, attempt.selected_answer]));
  return result.questions.every((raw, index) => {
    if (!raw || typeof raw !== 'object') return false;
    const question = raw as Record<string, unknown>;
    return question.qid === session.question_queue[index]
      && question.initialAnswer === (saved.get(question.qid as string) ?? '—');
  });
}

export interface PracticeSectionAttempt {
  id: string;
  kind: 'lr-section' | 'rc-section';
  status: 'in-progress' | 'completed';
  preptest: number;
  section: number;
  startedAt: string;
  updatedAt: string;
  answered: number;
  total: number;
  correct: number | null;
  href: string;
}

/** List only this signed-in student's standalone official sections. */
export async function listPracticeSectionAttempts(userId: string): Promise<PracticeSectionAttempt[]> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user || auth.user.id !== userId) {
    throw new Error('Sign in to see your practice sections.');
  }

  const { data: lrRows, error: lrError } = await supabase
    .from('bootcamp_kv')
    .select('data')
    .eq('user_id', userId)
    .eq('table_name', TABLES.practice_sessions);
  if (lrError) throw lrError;

  const cloud = new Map<string, unknown>();
  for (const row of lrRows ?? []) {
    const parsed = PracticeSession.safeParse(row.data);
    if (parsed.success) cloud.set(parsed.data.id, parsed.data);
  }
  // Older section runs were cached per account before a cloud flush could finish.
  // Import only rows already namespaced to this authenticated account.
  const persistence = getPersistence(userId);
  await persistence.ready();
  const localRows = await persistence.list<unknown>(TABLES.practice_sessions);
  for (const raw of localRows) {
    const parsed = PracticeSession.safeParse(raw);
    if (!parsed.success || parsed.data.user_id !== userId) continue;
    const session = parsed.data;
    if (!session.pool_slug.startsWith('drill::section::')) continue;
    const remote = cloud.get(session.id);
    const remoteParsed = PracticeSession.safeParse(remote);
    if (remoteParsed.success && remoteParsed.data.updated_at >= session.updated_at) continue;
    const { error } = await supabase.from('bootcamp_kv').upsert({
      user_id: userId,
      table_name: TABLES.practice_sessions,
      record_id: session.id,
      data: session,
    }, { onConflict: 'user_id,table_name,record_id' });
    if (error) throw error;
    cloud.set(session.id, session);
  }

  const { data: completedRows, error: historyError } = await supabase
    .from('section_history')
    .select('id, pt, section, initial_score, initial_total, unanswered_count, created_at, completed_at, questions_json')
    .eq('user_id', userId)
    .eq('mode', 'full-section')
    .is('practice_test_run_id', null)
    .order('completed_at', { ascending: false });
  if (historyError) throw historyError;
  const completedLr: PracticeSectionAttempt[] = (completedRows ?? [])
    .filter((row) => row.pt > 0 && row.section > 0 && !!row.completed_at)
    .map((row) => {
      const total = row.initial_total ?? 0;
      return {
        id: row.id,
        kind: 'lr-section' as const,
        status: 'completed' as const,
        preptest: row.pt,
        section: row.section,
        startedAt: row.created_at ?? row.completed_at!,
        updatedAt: row.completed_at!,
        answered: Math.max(0, total - (row.unanswered_count ?? 0)),
        total,
        correct: row.initial_score,
        href: `/testing/attempts/section/lr/${encodeURIComponent(row.id)}`,
      };
    });

  const lr: PracticeSectionAttempt[] = [];
  for (const raw of cloud.values()) {
    const parsed = PracticeSession.safeParse(raw);
    if (!parsed.success) continue;
    const session = parsed.data;
    const match = /^drill::section::pt(\d+)-s(\d+)$/.exec(session.pool_slug);
    if (!match) continue;
    const preptest = Number(match[1]);
    const section = Number(match[2]);
    if (completedRows?.some((row) => row.completed_at && isCompletedLrMirror(session, {
      pt: row.pt, section: row.section, completedAt: row.completed_at, questions: row.questions_json,
    }))) continue;
    const timer = session.timer_mode && session.timer_mode !== '35'
      ? `&timer=${encodeURIComponent(session.timer_mode)}`
      : '';
    const minutes = session.timer_mode === 'custom' && session.timer_custom_minutes
      ? `&minutes=${encodeURIComponent(String(session.timer_custom_minutes))}`
      : '';
    lr.push({
      id: session.id,
      kind: 'lr-section',
      status: session.status === 'completed' ? 'completed' : 'in-progress',
      preptest,
      section,
      startedAt: session.started_at,
      updatedAt: session.updated_at,
      answered: session.attempts.length,
      total: session.question_queue.length,
      correct: session.status === 'completed'
        ? session.attempts.filter((attempt) => attempt.correct).length
        : null,
      href: session.status === 'completed'
        ? `/testing/attempts/section/lr/${encodeURIComponent(session.id)}`
        : `/drill?mode=full-section&pt=${preptest}&section=${section}${timer}${minutes}&returnTo=%2Ftesting`,
    });
  }

  const [rcSessions, index] = await Promise.all([listSessions(), loadRcIndex()]);
  const passageMap = new Map<number, { preptest: number; section: number; questionCount: number }>();
  const sectionSize = new Map<string, number>();
  for (const pt of index.preptests) {
    for (const passage of pt.passages) {
      passageMap.set(passage.passageId, {
        preptest: pt.preptest,
        section: passage.section,
        questionCount: passage.questionCount,
      });
      const key = `${pt.preptest}:${passage.section}`;
      sectionSize.set(key, (sectionSize.get(key) ?? 0) + 1);
    }
  }

  const rc = await Promise.all(rcSessions.filter((session) =>
    session.status !== 'abandoned' && !session.config.practiceTestRunId,
  ).map(async (session) => {
    const passages = session.passageIds.map((id) => passageMap.get(id));
    const first = passages[0];
    if (!first || passages.some((p) => !p || p.preptest !== first.preptest || p.section !== first.section)) return null;
    if (passages.length !== sectionSize.get(`${first.preptest}:${first.section}`)) return null;
    const attempts = await getSessionAttempts(session.id);
    return {
      id: session.id,
      kind: 'rc-section' as const,
      status: session.status === 'completed' ? 'completed' as const : 'in-progress' as const,
      preptest: first.preptest,
      section: first.section,
      startedAt: session.startedAt,
      updatedAt: session.completedAt ?? session.config.lastActiveAt ?? session.startedAt,
      answered: new Set(attempts.filter((attempt) => attempt.isFirstAttempt).map((attempt) => attempt.questionId)).size,
      total: passages.reduce((sum, passage) => sum + (passage?.questionCount ?? 0), 0),
      correct: session.status === 'completed'
        ? attempts.filter((attempt) => attempt.isFirstAttempt && attempt.isCorrect).length
        : null,
      href: session.status === 'completed'
        ? `/rc/results/${session.id}`
        : `/rc/drill?sessionId=${session.id}&returnTo=%2Ftesting`,
    };
  }));

  return [...lr, ...completedLr, ...rc.filter((item): item is NonNullable<typeof item> => item !== null)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

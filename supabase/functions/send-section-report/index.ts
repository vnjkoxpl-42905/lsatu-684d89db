/**
 * Emails the teacher a finished section: the whole record, then the diagnosis.
 *
 * Called by the student's own browser when a sitting is persisted. That is the
 * only moment both halves are known to exist, and it means the report arrives
 * while the work is fresh rather than the next time someone thinks to look.
 *
 * Two decisions worth stating.
 *
 * 1. **Nothing is decided here.** The analysis is already on the row, written
 *    once at completion. This function reads it and formats it. A second place
 *    deciding what a section meant is a second place that can disagree with the
 *    first, and the student has already been shown the first.
 * 2. **A caller can only send their own sitting.** The JWT identifies the
 *    student, the row is loaded with the service role, and the two must match.
 *    Without that check any authenticated user could mail out any other
 *    student's whole section record by guessing a row id.
 *
 * Failure is recorded on the row (`report_email_error`) rather than thrown away,
 * because a report that silently never arrives is worse than one that did not
 * send: nobody goes looking for an email they were never told about.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { sendAppEmail } from '../_shared/sendAppEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Payload {
  /** The section_history row to send. Must belong to the caller. */
  sectionHistoryId: string
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const clock = (ms: number): string => {
  const total = Math.round((ms ?? 0) / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** "C at 0:40 → B at 2:30", or empty when they answered once and left it. */
const changesOf = (trail?: Array<{ answer: string; atMs: number }>): string => {
  if (!trail || trail.length < 2) return ''
  return trail.map((e) => `${e.answer} at ${clock(e.atMs)}`).join(' → ')
}

/** The order a tutor reads them: what was asked, how, then the logic under it. */
const DIMENSIONS = [
  { key: 'qtype', title: 'By question type' },
  { key: 'family', title: 'By process' },
  { key: 'reasoning', title: 'By reasoning — conditional, causal, and the rest' },
  { key: 'feature', title: 'By question feature' },
  { key: 'difficulty', title: 'By difficulty' },
]

const CATEGORY_LABEL: Record<string, string> = {
  reading: 'Reading error',
  fundamentals: 'Logical reasoning error',
  process: 'Question type process error',
  'test-taking': 'Test-taking error',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const admin = createClient(supabaseUrl, serviceRoleKey)

  let rowId: string | null = null

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ ok: false, error: 'Missing auth' }, 401)

    const { data: userData, error: userErr } = await createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    }).auth.getUser()
    if (userErr || !userData?.user) return json({ ok: false, error: 'Unauthorized' }, 401)

    const { sectionHistoryId } = (await req.json()) as Payload
    if (!sectionHistoryId) return json({ ok: false, error: 'sectionHistoryId is required' }, 400)
    rowId = sectionHistoryId

    const { data: row, error: rowErr } = await admin
      .from('section_history')
      .select('*')
      .eq('id', sectionHistoryId)
      .maybeSingle()
    if (rowErr) return json({ ok: false, error: rowErr.message }, 500)
    if (!row) return json({ ok: false, error: 'No such sitting' }, 404)

    // The caller's own sitting, or nothing.
    if (row.user_id !== userData.user.id) return json({ ok: false, error: 'Forbidden' }, 403)

    if (row.report_emailed_at) {
      // Already sent. Re-sending on a re-render would mail the same section
      // twice, and a duplicate report is indistinguishable from a second sitting.
      return json({ ok: true, alreadySent: true })
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('display_name')
      .eq('class_id', row.class_id)
      .maybeSingle()

    const analysis = (row.analysis_json ?? null) as null | {
      headline: string
      categories: Array<{ category: string; qnums: number[]; percentOfMisses: number; prescription: string }>
      biggestInsights?: Array<{ category: string; insight: string }>
      breakdowns?: Array<{
        dimension: string
        key: string
        attempted: number
        correct: number
        accuracyPercent: number
        medianTimeMs: number
        paceRatio: number | null
        recoveredInBlindReview: number
        stuckAfterBlindReview: number
      }>
      findings: Array<{ rule: string; headline: string; detail: string; prescription: string; qnums: number[] }>
      perQuestion: Array<{ qnum: number; category: string; why: string }>
      notRun: string[]
    }
    const questions = (row.questions_json ?? []) as Array<{
      qnum: number
      qtype: string
      difficulty: number
      initialAnswer: string
      correctAnswer: string
      initialCorrect: boolean
      timeMs: number
      flagged?: boolean
      brAnswer?: string
      brCorrect?: boolean
      answeredInOvertime?: boolean
      answerTrail?: Array<{ answer: string; atMs: number }>
    }>

    const readBy = new Map(
      (analysis?.perQuestion ?? []).map((p) => [p.qnum, p.why] as const),
    )

    const templateData = {
      studentName: profile?.display_name?.trim() || 'A student',
      sectionLabel: `PT${row.pt} S${row.section}`,
      satAt: new Date(row.completed_at ?? row.created_at ?? Date.now()).toLocaleString('en-US', {
        weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      }),
      scoreLine: `${row.initial_score}/${row.initial_total} · ${row.initial_percent}%${
        row.br_used ? ` · BR ${row.br_score}/${row.initial_total}` : ''
      }`,
      clockLine: `${clock(row.total_time_ms ?? 0)} total · ${clock(row.avg_time_ms ?? 0)} average`,
      headline: analysis?.headline ?? '',
      questions: questions.map((q) => ({
        qnum: q.qnum,
        qtype: q.qtype,
        difficulty: q.difficulty,
        answer: q.initialAnswer,
        correct: q.correctAnswer,
        isCorrect: q.initialCorrect,
        time: clock(q.timeMs),
        changes: changesOf(q.answerTrail),
        flagged: q.flagged,
        br: q.brAnswer ? `${q.brAnswer} ${q.brCorrect ? '✓' : '✗'}` : '',
        overtime: q.answeredInOvertime,
        why: readBy.get(q.qnum) ?? '',
      })),
      categories: (analysis?.categories ?? []).map((c) => ({
        label: CATEGORY_LABEL[c.category] ?? c.category,
        count: c.qnums.length,
        percent: c.percentOfMisses,
        qnums: c.qnums,
        prescription: c.prescription,
      })),
      insights: (analysis?.biggestInsights ?? []).map((i) => ({
        label: CATEGORY_LABEL[i.category] ?? i.category,
        insight: i.insight,
      })),
      breakdowns: DIMENSIONS.map(({ key, title }) => ({
        title,
        rows: (analysis?.breakdowns ?? [])
          .filter((b) => b.dimension === key)
          .map((b) => ({
            dimension: b.dimension,
            key: b.key,
            attempted: b.attempted,
            correct: b.correct,
            accuracyPercent: b.accuracyPercent,
            time: clock(b.medianTimeMs),
            paceRatio: b.paceRatio,
            recovered: b.recoveredInBlindReview,
            stuck: b.stuckAfterBlindReview,
          })),
      })).filter((g) => g.rows.length > 0),
      findings: analysis?.findings ?? [],
      notRun: analysis?.notRun ?? [],
      studentUrl: `${Deno.env.get('APP_BASE_URL') ?? ''}/teacher/students`,
    }

    // The template carries its own fixed recipient, so the address argument is
    // deliberately empty: a section report goes to the teacher and nowhere else,
    // and there is no code path that can be talked into another address.
    const result = await sendAppEmail('section-report', '', {
      templateData,
      // One send per sitting, whatever retries the browser makes.
      idempotencyKey: `section-report:${sectionHistoryId}`,
    })
    if (!result.sent) {
      throw new Error(
        result.reason === 'recipient_suppressed'
          ? 'the recipient address is suppressed (bounce, complaint or unsubscribe)'
          : 'send failed',
      )
    }

    await admin
      .from('section_history')
      .update({ report_emailed_at: new Date().toISOString(), report_email_error: null })
      .eq('id', sectionHistoryId)

    return json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    // Record it on the sitting. An email that never arrives and never explains
    // itself is the failure mode this whole feature exists to avoid.
    if (rowId) {
      await admin
        .from('section_history')
        .update({ report_email_error: message })
        .eq('id', rowId)
    }
    console.error('[send-section-report] failed', message)
    return json({ ok: false, error: message })
  }
})

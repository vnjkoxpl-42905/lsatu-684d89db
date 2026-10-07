import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// The section report goes to Joshua, never to the student. It is two documents
// in one email, in the order a tutor reads them:
//
//   1. The sitting itself — every question, what they answered, what was right,
//      how long it took, what they changed their mind about, and whether blind
//      review recovered it. The raw record, nothing interpreted.
//   2. The analysis — the diagnosis built from it (docs/section-analysis-engine.md):
//      the dominant cause, the four error categories with their question
//      numbers, and every rule that fired, worst first.
//
// Both are already computed and stored on the section_history row before this
// renders. Nothing here decides anything; a second place deciding what a
// section meant is a second place that can disagree with the first.

interface QuestionRow {
  qnum: number
  qtype: string
  difficulty: number
  answer: string
  correct: string
  isCorrect: boolean
  time: string
  changes?: string
  flagged?: boolean
  br?: string
  overtime?: boolean
  category?: string
  why?: string
}

interface FindingRow {
  rule: string
  headline: string
  detail: string
  prescription: string
  qnums: number[]
}

interface BreakdownRow {
  dimension: string
  key: string
  attempted: number
  correct: number
  accuracyPercent: number
  time: string
  paceRatio: number | null
  recovered: number
  stuck: number
}

interface CategoryRow {
  label: string
  count: number
  percent: number
  qnums: number[]
  prescription: string
}

interface SectionReportProps {
  studentName?: string
  sectionLabel?: string
  satAt?: string
  scoreLine?: string
  clockLine?: string
  headline?: string
  questions?: QuestionRow[]
  categories?: CategoryRow[]
  insights?: Array<{ label: string; insight: string }>
  breakdowns?: Array<{ title: string; rows: BreakdownRow[] }>
  findings?: FindingRow[]
  notRun?: string[]
  studentUrl?: string
}

const SectionReportEmail = ({
  studentName = 'A student',
  sectionLabel = 'a section',
  satAt = '',
  scoreLine = '',
  clockLine = '',
  headline = '',
  questions = [],
  categories = [],
  insights = [],
  breakdowns = [],
  findings = [],
  notRun = [],
  studentUrl = '',
}: SectionReportProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${studentName} finished ${sectionLabel} — ${scoreLine}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{`${studentName} finished ${sectionLabel}`}</Heading>
        <Text style={sub}>{[satAt, scoreLine, clockLine].filter(Boolean).join(' · ')}</Text>

        {headline && <Text style={lede}>{headline}</Text>}

        <Hr style={hr} />

        {/* ── 1. The sitting ───────────────────────────────────────────── */}
        <Heading as="h2" style={h2}>Every question</Heading>
        <Section>
          <table style={table} cellPadding={0} cellSpacing={0}>
            <thead>
              <tr>
                {['Q', 'Type', 'Lvl', 'Ans', 'Correct', 'Time', 'Changes', 'BR', 'Read'].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.qnum} style={q.isCorrect ? undefined : rowWrong}>
                  <td style={tdNum}>{`Q${q.qnum}`}{q.flagged ? ' ⚑' : ''}</td>
                  <td style={td}>{q.qtype}</td>
                  <td style={tdNum}>{q.difficulty}</td>
                  <td style={tdNum}>{q.answer}</td>
                  <td style={tdNum}>{q.correct}</td>
                  <td style={tdNum}>{q.time}{q.overtime ? '*' : ''}</td>
                  <td style={td}>{q.changes ?? ''}</td>
                  <td style={tdNum}>{q.br ?? ''}</td>
                  <td style={td}>{q.why ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Text style={legend}>
            ⚑ flagged · * answered after the clock ran out · Changes shows every answer they put
            down and when · BR is what blind review returned · Read is the category this miss was
            filed under and why.
          </Text>
        </Section>

        <Hr style={hr} />

        {/* ── 2. The analysis ──────────────────────────────────────────── */}
        <Heading as="h2" style={h2}>What it means</Heading>

        {categories.length > 0 && (
          <Section style={block}>
            {categories.map((c) => {
              const insight = insights.find((i) => i.label === c.label)?.insight
              return (
                <Text key={c.label} style={text}>
                  <strong>{`${c.label} — ${c.count} of the misses (${c.percent}%)`}</strong>
                  <br />
                  {`Q${c.qnums.join(', Q')}`}
                  {/* The one line worth reading about this category. Findings
                      are ranked across the whole sitting, which otherwise
                      buries a category that produced one important finding
                      under a category that produced three ordinary ones. */}
                  {insight && (
                    <>
                      <br />
                      <em>{insight}</em>
                    </>
                  )}
                  <br />
                  <span style={muted}>{c.prescription}</span>
                </Text>
              )
            })}
          </Section>
        )}

        {findings.map((f) => (
          <Section key={`${f.rule}-${f.headline}`} style={block}>
            <Text style={findingHead}>{f.headline}</Text>
            <Text style={text}>{f.detail}</Text>
            <Text style={muted}>{f.prescription}</Text>
            <Text style={tag}>{`${f.rule} · Q${f.qnums.join(', Q')}`}</Text>
          </Section>
        ))}

        {findings.length === 0 && (
          <Text style={text}>No rule fired on this sitting.</Text>
        )}

        {breakdowns.length > 0 && (
          <>
            <Hr style={hr} />
            <Heading as="h2" style={h2}>Every slice, worst first</Heading>
            <Text style={muted}>
              A question lands in several of these at once, and the point is where they
              disagree: a question type that looks fine while the reasoning under it looks
              bad means the process is sound and the logic is not.
            </Text>
            {breakdowns.map((group) => (
              <Section key={group.title} style={block}>
                <Text style={findingHead}>{group.title}</Text>
                <table style={table} cellPadding={0} cellSpacing={0}>
                  <thead>
                    <tr>
                      {['', 'Score', 'Rate', 'Median', 'vs pace', 'BR back', 'BR stuck'].map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((r) => (
                      <tr key={r.key} style={r.accuracyPercent < 60 ? rowWrong : undefined}>
                        <td style={td}>{r.key}</td>
                        <td style={tdNum}>{`${r.correct}/${r.attempted}`}</td>
                        <td style={tdNum}>{`${r.accuracyPercent}%`}</td>
                        <td style={tdNum}>{r.time}</td>
                        <td style={tdNum}>{r.paceRatio === null ? '' : `${r.paceRatio}x`}</td>
                        <td style={tdNum}>{r.recovered || ''}</td>
                        <td style={tdNum}>{r.stuck || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            ))}
          </>
        )}

        {notRun.length > 0 && (
          <Section style={block}>
            <Text style={muted}>
              <strong>Not covered by this report</strong>
            </Text>
            {notRun.map((n) => (
              <Text key={n} style={muted}>{n}</Text>
            ))}
          </Section>
        )}

        {studentUrl && (
          <Text style={muted}>
            {`Their full record: ${studentUrl}`}
          </Text>
        )}
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }
const container = { margin: '0 auto', padding: '24px', maxWidth: '720px' }
const h1 = { fontSize: '20px', fontWeight: 600, color: '#111111', margin: '0 0 4px' }
const h2 = { fontSize: '15px', fontWeight: 600, color: '#111111', margin: '20px 0 8px' }
const sub = { fontSize: '13px', color: '#666666', margin: '0 0 12px' }
const lede = { fontSize: '15px', lineHeight: '1.5', color: '#111111', margin: '0 0 8px' }
const text = { fontSize: '13px', lineHeight: '1.6', color: '#111111', margin: '0 0 8px' }
const muted = { fontSize: '12px', lineHeight: '1.6', color: '#666666', margin: '0 0 6px' }
const tag = { fontSize: '11px', color: '#999999', margin: '0 0 4px' }
const findingHead = { fontSize: '13px', fontWeight: 600, color: '#111111', margin: '0 0 4px' }
const block = { margin: '0 0 16px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const legend = { fontSize: '11px', color: '#999999', margin: '8px 0 0', lineHeight: '1.5' }
const table = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px' }
const th = {
  textAlign: 'left' as const,
  borderBottom: '1px solid #e5e5e5',
  padding: '4px 6px',
  color: '#666666',
  fontWeight: 600,
}
const td = { borderBottom: '1px solid #f0f0f0', padding: '4px 6px', color: '#111111' }
const tdNum = { ...td, fontFamily: 'ui-monospace, Menlo, monospace' }
const rowWrong = { backgroundColor: '#fdf3f3' }

export const template: TemplateEntry = {
  component: SectionReportEmail,
  // Greppable, and it carries the score so the inbox list is already useful.
  subject: (d: Record<string, any>) =>
    `[LSATU SECTION] ${d.studentName ?? 'Unknown student'} — ${d.sectionLabel ?? ''} ${d.scoreLine ?? ''}`.trim(),
  to: 'contact@aspiringattorneys.com',
  displayName: 'Section report (to Joshua)',
  previewData: {
    studentName: 'Sofia Minassian',
    sectionLabel: 'PT130 S1',
    satAt: 'Fri 29 Aug, 8:14pm',
    scoreLine: '18/26 · 69%',
    clockLine: '35:00 section · Standard',
    headline:
      'This was a timing section, not a knowledge section. What went wrong was decisions under the clock.',
    questions: [
      {
        qnum: 1, qtype: 'Necessary Assumption', difficulty: 3, answer: 'B', correct: 'C',
        isCorrect: false, time: '2:41', changes: 'C at 0:40 → B at 2:30', br: 'C ✓',
        category: 'reading', why: 'you had the right answer and changed it',
      },
    ],
    categories: [
      {
        label: 'Test-taking error', count: 5, percent: 63, qnums: [7, 13, 21, 22, 23],
        prescription: 'Sit more sections.',
      },
    ],
    findings: [
      {
        rule: 'R1',
        headline: 'You did not run out of ability at the end of this section. You ran out of clock.',
        detail: '3 questions went unanswered.',
        prescription: 'Work the earlier questions at the pace you worked the last ones.',
        qnums: [7, 13, 21],
      },
    ],
    notRun: [],
    studentUrl: 'https://lsatprep.study/teacher/students',
  },
}

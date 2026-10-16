import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// The intake notification goes to Joshua, never to the student. The whole
// Markdown file sits in the body as preformatted text: it reads fine on a
// phone, and it is the exact text that gets filed into the student's folder,
// so there is no second rendering that can drift from the first.

interface OnboardingIntakeProps {
  studentName?: string
  studentEmail?: string
  markdown?: string
}

const OnboardingIntakeEmail = ({
  studentName = 'A student',
  studentEmail = '',
  markdown = '',
}: OnboardingIntakeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${studentName} finished onboarding`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{studentName} finished onboarding</Heading>
        <Text style={text}>{studentEmail}</Text>
        <pre style={pre}>{markdown}</pre>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }
const container = { margin: '0 auto', padding: '24px', maxWidth: '640px' }
const h1 = { fontSize: '20px', fontWeight: 600, color: '#111111', margin: '0 0 4px' }
const text = { fontSize: '13px', color: '#666666', margin: '0 0 16px' }
const pre = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12px',
  lineHeight: '1.6',
  color: '#111111',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  border: '1px solid #e5e5e5',
  padding: '16px',
  margin: 0,
}

export const template: TemplateEntry = {
  component: OnboardingIntakeEmail,
  // A fixed, greppable subject: the filing skill finds these by subject alone.
  subject: (d: Record<string, any>) => `[LSATU ONBOARDING] ${d.studentName ?? 'Unknown student'}`,
  to: 'contact@aspiringattorneys.com',
  displayName: 'Onboarding intake (to Joshua)',
  previewData: {
    studentName: 'Sofia Minassian',
    studentEmail: 'sofia@example.com',
    markdown: '---\nstudent: Sofia Minassian\n---\n\n# Onboarding intake - Sofia Minassian\n',
  },
}

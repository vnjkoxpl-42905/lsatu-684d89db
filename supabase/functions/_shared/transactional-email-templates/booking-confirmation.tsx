import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'LSAT U'
const APP_URL = 'https://lsatprep.study'

interface BookingConfirmationProps {
  // "student" = the confirmation the student receives; "admin" = the copy Joshua receives
  recipientRole?: 'student' | 'admin'
  studentName?: string
  studentEmail?: string
  whenText?: string        // e.g. "Saturday, July 19 · 10:00 AM (Eastern Time)"
  durationMinutes?: number
  meetUrl?: string
}

const BookingConfirmationEmail = ({
  recipientRole = 'student',
  studentName,
  studentEmail,
  whenText = 'your upcoming session',
  durationMinutes = 60,
  meetUrl,
}: BookingConfirmationProps) => {
  const isAdmin = recipientRole === 'admin'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {isAdmin
          ? `${studentName ?? 'A student'} booked a session — ${whenText}`
          : `Your session with Joshua is booked — ${whenText}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isAdmin
              ? 'New session booked'
              : studentName ? `You're booked, ${studentName}` : "You're booked"}
          </Heading>

          <Text style={text}>
            {isAdmin
              ? `${studentName ?? 'A student'}${studentEmail ? ` (${studentEmail})` : ''} just booked a 1:1 session with you.`
              : `Your ${durationMinutes}-minute session with Joshua is confirmed.`}
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>WHEN</Text>
            <Text style={cardTitle}>{whenText}</Text>
            <Text style={cardMeta}>{durationMinutes} minutes</Text>
          </Section>

          {!isAdmin && (
            <Text style={text}>
              A Google Calendar invite is on its way to your email. <strong>Please accept it</strong> so
              the session lands on your calendar and you get reminders.
            </Text>
          )}

          {meetUrl && (
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button href={meetUrl} style={button}>Join with Google Meet</Button>
              <Text style={meetHint}>{meetUrl}</Text>
            </Section>
          )}

          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BookingConfirmationEmail,
  subject: (d: Record<string, any>) =>
    d?.recipientRole === 'admin'
      ? `New session booked${d?.studentName ? ` — ${d.studentName}` : ''} (${d?.whenText ?? ''})`
      : `Your session with Joshua is booked — ${d?.whenText ?? ''}`,
  displayName: 'Booking confirmation',
  previewData: {
    recipientRole: 'student',
    studentName: 'Alex',
    studentEmail: 'alex@example.com',
    whenText: 'Saturday, July 19 · 10:00 AM (Eastern Time)',
    durationMinutes: 60,
    meetUrl: 'https://meet.google.com/abc-defg-hij',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const card = {
  background: '#FAF7F2',
  border: '1px solid #E8DCC8',
  borderRadius: '12px',
  padding: '18px 20px',
  margin: '12px 0',
}
const cardLabel = { fontSize: '11px', letterSpacing: '0.08em', color: '#A98B5B', margin: '0 0 4px', fontWeight: 600 }
const cardTitle = { fontSize: '17px', fontWeight: 700, color: '#7C5A2A', margin: '0 0 2px' }
const cardMeta = { fontSize: '13px', color: '#94A3B8', margin: 0 }
const button = {
  background: '#7C5A2A',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '10px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 600,
  display: 'inline-block',
}
const meetHint = { fontSize: '12px', color: '#94A3B8', margin: '10px 0 0', wordBreak: 'break-all' as const }
const footer = { fontSize: '12px', color: '#94A3B8', margin: '32px 0 0' }

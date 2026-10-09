import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  kind?: 'cancellation' | 'refund'
  recipientRole?: 'booker' | 'admin'
  studentName?: string
  whenText?: string
}

const SingleSessionUpdateEmail = ({ kind = 'cancellation', recipientRole = 'booker', studentName, whenText }: Props) => {
  const admin = recipientRole === 'admin'
  const refund = kind === 'refund'
  const heading = refund ? 'Your payment has been refunded' : 'Your session has been cancelled'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{heading}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{admin ? (refund ? 'Single Session refund completed' : 'Single Session cancelled') : heading}</Heading>
          <Section style={card}>
            <Text style={text}>{whenText || 'LSAT Session with Joshua'}</Text>
          </Section>
          <Text style={text}>
            {admin
              ? `${studentName || 'The Booker'}'s booking record has been updated.`
              : refund
                ? 'The slot could not be finalized after payment, so the full $45 payment was returned through Stripe. Bank processing times vary.'
                : 'No worries. The calendar invite will be removed. This cancellation does not automatically issue a refund.'}
          </Text>
          {!admin && refund && <Text style={text}>You can return to the Single Session page whenever you are ready to choose another time.</Text>}
          <Text style={footer}>{admin ? 'LSAT U booking worker' : 'Best,\nJoshua'}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SingleSessionUpdateEmail,
  subject: (data: Record<string, any>) => data?.kind === 'refund'
    ? 'Your $45 Single Session payment was refunded'
    : 'Your LSAT Session has been cancelled',
  displayName: 'Single Session update',
  previewData: { kind: 'cancellation', recipientRole: 'booker', studentName: 'Alex', whenText: 'Thursday, August 20 at 1:00 PM' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-line' as const }
const card = { background: '#FAF7F2', border: '1px solid #E8DCC8', borderRadius: '12px', padding: '18px 20px', margin: '12px 0' }
const footer = { fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '28px 0 0', whiteSpace: 'pre-line' as const }

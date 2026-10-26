import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Goes to Joshua, never to the payer: one email per new paid Stripe charge,
// sent by booking-commerce-webhook alongside the in-app notification.

interface PaymentReceivedProps {
  who?: string
  email?: string
  amount?: string
  paidAt?: string
  whatFor?: string
  nextStep?: string
}

const PaymentReceivedEmail = ({
  who = 'Someone',
  email = '',
  amount = '',
  paidAt = '',
  whatFor = '',
  nextStep = '',
}: PaymentReceivedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${who} paid ${amount}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{who} paid {amount}</Heading>
        {email && <Text style={muted}>{email}</Text>}
        {whatFor && <Text style={text}>For: {whatFor}</Text>}
        {paidAt && <Text style={text}>When: {paidAt}</Text>}
        {nextStep && <Text style={text}>{nextStep}</Text>}
        <Button href="https://lsatprep.study/teacher/today" style={button}>Open Today</Button>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }
const container = { margin: '0 auto', padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '20px', fontWeight: 600, color: '#111111', margin: '0 0 4px' }
const muted = { fontSize: '13px', color: '#666666', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#111111', margin: '0 0 8px' }
const button = {
  display: 'inline-block', marginTop: '12px', padding: '10px 16px',
  backgroundColor: '#111111', color: '#ffffff', fontSize: '14px', textDecoration: 'none',
}

export const template: TemplateEntry = {
  component: PaymentReceivedEmail,
  subject: (d: Record<string, any>) => `[LSATU PAYMENT] ${d.who ?? 'Someone'} paid ${d.amount ?? ''}`.trim(),
  to: 'contact@aspiringattorneys.com',
  displayName: 'Payment received (to Joshua)',
  previewData: {
    who: 'Gianna Jean',
    email: 'gianna@example.com',
    amount: '$350.00',
    paidAt: 'Sep 22, 2026, 10:52 PM ET',
    whatFor: '10 hour reduced (package, 10 passes)',
    nextStep: 'Waiting on you: grant the passes on Today.',
  },
}

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'LSAT U'
const APP_URL = 'https://lsatprep.study'

interface NewMessageProps {
  recipientName?: string
  senderName?: string
  snippet?: string
  link?: string
}

const NewMessageEmail = ({
  recipientName,
  senderName = 'Joshua',
  snippet = 'You have a new message.',
  link = APP_URL + '/inbox',
}: NewMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${senderName} sent you a message on ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
        </Heading>
        <Text style={text}>
          {senderName} sent you a new message on {SITE_NAME}:
        </Text>
        <Section style={card}>
          <Text style={cardText}>{snippet}</Text>
        </Section>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={link} style={button}>Open your inbox</Button>
        </Section>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewMessageEmail,
  subject: (d: Record<string, any>) =>
    `New message from ${d?.senderName ?? 'Joshua'}`,
  displayName: 'New message notification',
  previewData: {
    recipientName: 'Alex',
    senderName: 'Joshua',
    snippet: 'Hey — wanted to check in on your timing for the Logical Reasoning set.',
    link: APP_URL + '/inbox',
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
const cardText = { fontSize: '15px', color: '#3F3527', margin: 0, lineHeight: '1.55', fontStyle: 'italic' as const }
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
const footer = { fontSize: '12px', color: '#94A3B8', margin: '32px 0 0' }

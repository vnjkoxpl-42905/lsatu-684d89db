import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'LSAT U'
const APP_URL = 'https://lsatprep.study'

interface AssignmentNotificationProps {
  studentName?: string
  itemTitle?: string
  itemType?: string
  assignedBy?: string
  link?: string
}

const AssignmentNotificationEmail = ({
  studentName,
  itemTitle = 'a new assignment',
  itemType = 'assignment',
  assignedBy = 'Joshua',
  link = APP_URL + '/mainhub',
}: AssignmentNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${assignedBy} assigned you ${itemTitle}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {studentName ? `Hi ${studentName},` : 'Hi there,'}
        </Heading>
        <Text style={text}>
          {assignedBy} just assigned you a new {itemType} on {SITE_NAME}:
        </Text>
        <Section style={card}>
          <Text style={cardTitle}>{itemTitle}</Text>
        </Section>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={link} style={button}>Open in {SITE_NAME}</Button>
        </Section>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AssignmentNotificationEmail,
  subject: (d: Record<string, any>) =>
    `New ${d?.itemType ?? 'assignment'}: ${d?.itemTitle ?? 'You have a new assignment'}`,
  displayName: 'Assignment notification',
  previewData: {
    studentName: 'Alex',
    itemTitle: 'Causation Station — Day 3',
    itemType: 'bootcamp',
    assignedBy: 'Joshua',
    link: APP_URL + '/mainhub',
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
const cardTitle = { fontSize: '16px', fontWeight: 600, color: '#7C5A2A', margin: 0 }
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

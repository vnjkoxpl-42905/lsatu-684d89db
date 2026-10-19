import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as assignmentNotification } from './assignment-notification.tsx'
import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as onboardingIntake } from './onboarding-intake.tsx'
import { template as paymentReceived } from './payment-received.tsx'
import { template as sectionReport } from './section-report.tsx'
import { template as singleSessionUpdate } from './single-session-update.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'assignment-notification': assignmentNotification,
  'booking-confirmation': bookingConfirmation,
  'onboarding-intake': onboardingIntake,
  'payment-received': paymentReceived,
  'section-report': sectionReport,
  'single-session-update': singleSessionUpdate,
}

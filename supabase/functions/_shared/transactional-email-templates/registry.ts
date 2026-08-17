/// <reference types="npm:@types/react@18.3.1" />
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
import { template as singleSessionUpdate } from './single-session-update.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'assignment-notification': assignmentNotification,
  'booking-confirmation': bookingConfirmation,
  'single-session-update': singleSessionUpdate,
}

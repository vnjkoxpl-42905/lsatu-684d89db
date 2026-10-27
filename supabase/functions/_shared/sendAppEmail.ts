import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  sendTemplateEmail,
  type SendTemplateEmailResult,
} from './transactional-email-templates/send-email.ts'

/**
 * Shared app-email send path.
 *
 * Sends a registered template through Lovable's managed email API and keeps the
 * project's own `email_send_log` audit trail in sync:
 *   - `sent`       after a successful send
 *   - `suppressed` when the recipient is suppressed (bounce/complaint/unsubscribe)
 *   - `failed`     when the send throws
 *
 * Delivery, retries, rate limiting, suppression enforcement and the unsubscribe
 * footer are handled server-side, so there is nothing to enqueue here.
 */
export interface SendAppEmailOptions {
  templateData?: Record<string, unknown>
  idempotencyKey?: string
  replyTo?: string
}

function logClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey)
}

async function writeLog(
  templateName: string,
  recipientEmail: string,
  status: 'sent' | 'suppressed' | 'failed',
  errorMessage?: string,
) {
  const supabase = logClient()
  if (!supabase) return
  const { error } = await supabase.from('email_send_log').insert({
    message_id: null,
    template_name: templateName,
    recipient_email: recipientEmail,
    status,
    error_message: errorMessage ?? null,
  })
  if (error) {
    console.error('email_send_log insert failed', { status, templateName, error })
  }
}

export async function sendAppEmail(
  templateName: string,
  recipientEmail: string,
  options: SendAppEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  let result: SendTemplateEmailResult
  try {
    result = await sendTemplateEmail(templateName, recipientEmail, {
      templateData: options.templateData as Record<string, any> | undefined,
      idempotencyKey: options.idempotencyKey,
      replyTo: options.replyTo,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await writeLog(templateName, recipientEmail, 'failed', message.slice(0, 1000))
    throw error
  }

  if (result.sent) {
    await writeLog(templateName, recipientEmail, 'sent')
  } else {
    await writeLog(templateName, recipientEmail, 'suppressed')
  }
  return result
}

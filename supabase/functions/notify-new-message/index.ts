// notify-new-message — queues an email to message recipients who are not
// currently online, so messages aren't missed when the recipient is away.
//
// Called fire-and-forget by the client right after a message is sent. Auth
// (verify_jwt = true) guarantees a real user; we additionally require that the
// caller is the sender of the referenced message. Recipients who are online
// (recent last_seen_at) are skipped — they'll see the message in-app. A short
// per-recipient cooldown prevents a burst of messages from sending a burst of
// emails.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000 // recipient considered "here" — skip email
const COOLDOWN_MS = 15 * 60 * 1000 // at most one message email per recipient / window
const SNIPPET_MAX = 140

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function firstName(displayName: string | null | undefined): string | undefined {
  const token = displayName?.trim().split(/[\s._-]+/).find(Boolean)
  if (!token) return undefined
  const cleaned = token.replace(/[^a-zA-Z]/g, '')
  if (!cleaned) return undefined
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  try {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader) return jsonRes({ ok: false, error: 'Unauthorized' }, 401)

    const anon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await anon.auth.getUser()
    if (userErr || !userData?.user) return jsonRes({ ok: false, error: 'Unauthorized' }, 401)
    const callerId = userData.user.id

    const { conversationId, messageId } = (await req.json()) as {
      conversationId?: string
      messageId?: string
    }
    if (!conversationId || !messageId) {
      return jsonRes({ ok: false, error: 'conversationId and messageId required' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Load the message and confirm the caller actually sent it.
    const { data: message, error: msgErr } = await admin
      .from('messages')
      .select('id, conversation_id, sender_id, body')
      .eq('id', messageId)
      .maybeSingle()
    if (msgErr) return jsonRes({ ok: false, error: msgErr.message }, 500)
    if (!message || message.conversation_id !== conversationId || message.sender_id !== callerId) {
      return jsonRes({ ok: false, error: 'Forbidden' }, 403)
    }

    // Sender identity (instructor is always shown as "Joshua").
    const { data: senderRole } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle()
    const senderIsAdmin = !!senderRole
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('display_name')
      .eq('class_id', callerId)
      .maybeSingle()
    const senderName = senderIsAdmin
      ? 'Joshua'
      : (senderProfile?.display_name?.trim() || 'A classmate')

    const rawBody = (message.body ?? '').trim()
    const snippet = rawBody
      ? rawBody.length > SNIPPET_MAX
        ? `${rawBody.slice(0, SNIPPET_MAX).trimEnd()}…`
        : rawBody
      : 'Sent you an attachment.'

    // Recipients = participants other than the sender.
    const { data: participants, error: partErr } = await admin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', callerId)
    if (partErr) return jsonRes({ ok: false, error: partErr.message }, 500)

    const appBase = Deno.env.get('APP_BASE_URL') ?? 'https://lsatprep.study'
    const link = `${appBase}/inbox`
    const cooldownSince = new Date(Date.now() - COOLDOWN_MS).toISOString()

    let notified = 0
    let skippedOnline = 0
    let skippedCooldown = 0

    for (const p of participants ?? []) {
      const recipientId = p.user_id as string

      const { data: profile } = await admin
        .from('profiles')
        .select('display_name, last_seen_at')
        .eq('class_id', recipientId)
        .maybeSingle()

      // Online → they'll see it in-app, no email.
      const lastSeen = profile?.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0
      if (lastSeen && Date.now() - lastSeen <= ONLINE_WINDOW_MS) {
        skippedOnline++
        continue
      }

      const { data: authUser } = await admin.auth.admin.getUserById(recipientId)
      const email = authUser?.user?.email
      if (!email) continue

      // Cooldown: skip if we already queued a message email recently.
      const { data: recent } = await admin
        .from('email_send_log')
        .select('id')
        .eq('recipient_email', email)
        .eq('template_name', 'new-message-notification')
        .gte('created_at', cooldownSince)
        .limit(1)
      if (recent && recent.length > 0) {
        skippedCooldown++
        continue
      }

      const r = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateName: 'new-message-notification',
          recipientEmail: email,
          idempotencyKey: `msg-${messageId}-${recipientId}`,
          templateData: {
            recipientName: firstName(profile?.display_name),
            senderName,
            snippet,
            link,
          },
        }),
      })
      if (r.ok) {
        notified++
      } else {
        let detail = ''
        try { detail = await r.text() } catch { /* ignore */ }
        console.error('[notify-new-message] send failed', { status: r.status, detail })
      }
    }

    return jsonRes({ ok: true, notified, skippedOnline, skippedCooldown })
  } catch (err) {
    console.error('[notify-new-message] error', err)
    return jsonRes({ ok: false, error: (err as Error).message }, 200)
  }
})

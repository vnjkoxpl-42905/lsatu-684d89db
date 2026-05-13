// Facebook Messenger webhook receiver.
// GET  -> verification challenge from Meta.
// POST -> incoming messages / events from Meta. Verifies X-Hub-Signature-256.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN") ?? "";
const APP_SECRET = Deno.env.get("META_APP_SECRET") ?? "";
const PAGE_ACCESS_TOKEN = Deno.env.get("META_PAGE_ACCESS_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verifySignature(rawBody: string, signature: string | null) {
  if (!APP_SECRET) return true; // skip if not configured (dev)
  if (!signature?.startsWith("sha256=")) return false;
  const expected = signature.slice("sha256=".length);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === expected;
}

async function fetchProfile(psid: string) {
  if (!PAGE_ACCESS_TOKEN) return null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${psid}?fields=name,profile_pic&access_token=${PAGE_ACCESS_TOKEN}`,
    );
    if (!res.ok) return null;
    return await res.json() as { name?: string; profile_pic?: string };
  } catch {
    return null;
  }
}

async function upsertConversation(pageId: string, psid: string, lastText: string) {
  const profile = await fetchProfile(psid);
  const { data: existing } = await admin
    .from("messenger_conversations")
    .select("id, unread_count")
    .eq("page_id", pageId)
    .eq("psid", psid)
    .maybeSingle();

  if (existing) {
    await admin.from("messenger_conversations").update({
      last_message_text: lastText,
      last_message_at: new Date().toISOString(),
      unread_count: (existing.unread_count ?? 0) + 1,
      ...(profile?.name ? { user_name: profile.name } : {}),
      ...(profile?.profile_pic ? { profile_pic: profile.profile_pic } : {}),
    }).eq("id", existing.id);
    return existing.id as string;
  }
  const { data: inserted, error } = await admin.from("messenger_conversations").insert({
    page_id: pageId,
    psid,
    user_name: profile?.name ?? null,
    profile_pic: profile?.profile_pic ?? null,
    last_message_text: lastText,
    last_message_at: new Date().toISOString(),
    unread_count: 1,
  }).select("id").single();
  if (error) throw error;
  return inserted.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  // Webhook verification (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === VERIFY_TOKEN) {
      return new Response(challenge ?? "", { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  const ok = await verifySignature(raw, sig);
  if (!ok) {
    console.warn("messenger-webhook: invalid signature");
    return new Response("invalid signature", { status: 401, headers: corsHeaders });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch {
    return new Response("bad json", { status: 400, headers: corsHeaders });
  }

  if (body.object !== "page") {
    return new Response("ignored", { status: 200, headers: corsHeaders });
  }

  for (const entry of body.entry ?? []) {
    const pageId = entry.id as string;
    for (const ev of entry.messaging ?? []) {
      try {
        const psid = ev.sender?.id;
        const isEcho = ev.message?.is_echo;
        if (!psid || isEcho) continue; // ignore echoes (we already insert outbound on send)
        if (!ev.message) continue;

        const text = ev.message.text ?? "";
        const attachments = ev.message.attachments ?? null;
        const preview = text || (attachments ? "[attachment]" : "");
        const convId = await upsertConversation(pageId, psid, preview);

        await admin.from("messenger_messages").insert({
          conversation_id: convId,
          direction: "inbound",
          mid: ev.message.mid ?? null,
          text: text || null,
          attachments,
        });
      } catch (e) {
        console.error("messenger-webhook: handle event failed", e);
      }
    }
  }

  return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
});

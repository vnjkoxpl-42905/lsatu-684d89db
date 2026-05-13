// Send a message to a Messenger conversation as the Page.
// Admin-only. Looks up the conversation, calls Graph API, stores outbound row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGE_ACCESS_TOKEN = Deno.env.get("META_PAGE_ACCESS_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!PAGE_ACCESS_TOKEN) throw new Error("META_PAGE_ACCESS_TOKEN is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversationId, text } = await req.json() as { conversationId?: string; text?: string };
    if (!conversationId || !text || !text.trim()) {
      return new Response(JSON.stringify({ error: "conversationId and text are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conv, error: convErr } = await admin
      .from("messenger_conversations")
      .select("id, psid, page_id")
      .eq("id", conversationId)
      .single();
    if (convErr || !conv) throw new Error("conversation not found");

    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: conv.psid },
          messaging_type: "RESPONSE",
          message: { text },
        }),
      },
    );
    const sendData = await res.json();
    if (!res.ok) {
      throw new Error(`Graph API ${res.status}: ${JSON.stringify(sendData)}`);
    }

    await admin.from("messenger_messages").insert({
      conversation_id: conv.id,
      direction: "outbound",
      mid: sendData.message_id ?? null,
      text,
      sent_by: user.id,
    });
    await admin.from("messenger_conversations").update({
      last_message_text: text,
      last_message_at: new Date().toISOString(),
    }).eq("id", conv.id);

    return new Response(JSON.stringify({ ok: true, message_id: sendData.message_id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("messenger-send error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

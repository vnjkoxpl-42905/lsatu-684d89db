// Google Drive proxy via Lovable connector gateway.
// Endpoints:
//   GET  ?action=list&q=<search>&pageToken=<token>
//   GET  ?action=meta&id=<fileId>
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

async function safeFetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const txt = await res.text();
  let data: any = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { /* non-json */ }
  return { res, data, txt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!GOOGLE_DRIVE_API_KEY) throw new Error("GOOGLE_DRIVE_API_KEY not configured (link Google Drive connector)");

    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_DRIVE_API_KEY,
    };

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";

    if (action === "list") {
      const q = url.searchParams.get("q")?.trim();
      const pageToken = url.searchParams.get("pageToken") ?? "";
      const params = new URLSearchParams();
      params.set("pageSize", "50");
      params.set("orderBy", "modifiedTime desc");
      params.set("fields", "nextPageToken,files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink,thumbnailLink,owners(displayName,emailAddress))");
      if (q) params.set("q", `name contains '${q.replace(/'/g, "\\'")}' and trashed = false`);
      else params.set("q", "trashed = false");
      if (pageToken) params.set("pageToken", pageToken);

      const { res, data, txt } = await safeFetchJson(`${GATEWAY}/files?${params}`, { headers });
      if (!res.ok) throw new Error(`Drive list ${res.status}: ${txt.slice(0, 300)}`);
      return new Response(JSON.stringify({ ok: true, files: data?.files ?? [], nextPageToken: data?.nextPageToken ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "meta") {
      const id = url.searchParams.get("id");
      if (!id) throw new Error("id required");
      const fields = "id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,owners(displayName,emailAddress)";
      const { res, data, txt } = await safeFetchJson(`${GATEWAY}/files/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}`, { headers });
      if (!res.ok) throw new Error(`Drive meta ${res.status}: ${txt.slice(0, 300)}`);
      return new Response(JSON.stringify({ ok: true, file: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`unknown action: ${action}`);
  } catch (e) {
    console.error("gdrive error", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

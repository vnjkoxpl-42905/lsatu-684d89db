// Google Drive proxy via Lovable connector gateway.
// Endpoints:
//   GET  ?action=list&q=<search>&pageToken=<token>
//   GET  ?action=meta&id=<fileId>
//   GET  ?action=download&id=<fileId>   -> streams file bytes (Google-native files exported)
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

    if (action === "download") {
      const id = url.searchParams.get("id");
      if (!id) throw new Error("id required");

      // Look up mime + name first to decide between alt=media and export
      const metaFields = "id,name,mimeType";
      const metaRes = await fetch(
        `${GATEWAY}/files/${encodeURIComponent(id)}?fields=${encodeURIComponent(metaFields)}`,
        { headers },
      );
      if (!metaRes.ok) {
        const t = await metaRes.text();
        throw new Error(`Drive meta ${metaRes.status}: ${t.slice(0, 300)}`);
      }
      const meta = await metaRes.json();
      const mime: string = meta.mimeType ?? "application/octet-stream";
      let filename: string = meta.name ?? "file";

      // Map Google-native types to export formats
      const exportMap: Record<string, { mime: string; ext: string }> = {
        "application/vnd.google-apps.document":     { mime: "application/pdf", ext: ".pdf" },
        "application/vnd.google-apps.spreadsheet":  { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ".xlsx" },
        "application/vnd.google-apps.presentation": { mime: "application/pdf", ext: ".pdf" },
        "application/vnd.google-apps.drawing":      { mime: "image/png", ext: ".png" },
        "application/vnd.google-apps.script":       { mime: "application/vnd.google-apps.script+json", ext: ".json" },
      };

      let upstreamUrl: string;
      let outMime: string;
      if (exportMap[mime]) {
        const ex = exportMap[mime];
        upstreamUrl = `${GATEWAY}/files/${encodeURIComponent(id)}/export?mimeType=${encodeURIComponent(ex.mime)}`;
        outMime = ex.mime;
        if (!/\.[a-z0-9]+$/i.test(filename)) filename += ex.ext;
      } else if (mime.startsWith("application/vnd.google-apps.")) {
        throw new Error(`Cannot download Google-native file of type ${mime}`);
      } else {
        upstreamUrl = `${GATEWAY}/files/${encodeURIComponent(id)}?alt=media`;
        outMime = mime;
      }

      const fileRes = await fetch(upstreamUrl, { headers });
      if (!fileRes.ok || !fileRes.body) {
        const t = await fileRes.text();
        throw new Error(`Drive download ${fileRes.status}: ${t.slice(0, 300)}`);
      }

      const safeName = filename.replace(/"/g, "");
      return new Response(fileRes.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": outMime,
          "Content-Disposition": `attachment; filename="${safeName}"`,
          "Cache-Control": "no-store",
        },
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

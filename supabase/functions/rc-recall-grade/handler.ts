import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { sha256 } from "https://esm.sh/@noble/hashes@1.7.1/sha256";
import { canonicalSource, GRADE_LEASE_MS, MAX_AUDIO_BYTES, MAX_AUDIO_SECONDS, MAX_GRADE_ATTEMPTS, parseRcAssessment, recallWindowTranscript, reusableRcTranscript, sourceUnits,
  RC_ASR_ENGINE, RC_GRADER_VERSION, RC_GRADE_MODEL, RC_JUDGE_PROMPT, validGradeRequest, type RcGradeItem } from "../_shared/rcRecallGrading.ts";

const BUILD = "2026-10-18-rc-grader-2";
const BUCKET = "rc-recall-recordings";
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const digest = async (value: Uint8Array | string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(typeof value === "string" ? new TextEncoder().encode(value) : value).buffer))].map(v => v.toString(16).padStart(2, "0")).join("");
const reasonFor = (code: string) => ({ no_speech: "No clear speech was found in this recording. It hasn't been graded.", audio_too_large: "This recording is too large for feedback. Your audio is kept.", audio_too_long: "This recording is too long for feedback. Your audio is kept.", invalid_source: "The original passage could not be verified. Your recall hasn't been graded.", invalid_recap_scope: "The paragraph for this recording could not be verified.", unsupported_attempt: "Feedback isn't available for this earlier practice format.", provider_unavailable: "Feedback is unavailable right now. Your recording is kept. Try again.", ungrounded_source_evidence: "The feedback could not be verified against the passage. Try again.", ungrounded_recall_evidence: "The feedback could not be verified against your recording. Try again." } as Record<string, string>)[code] ?? "The feedback could not be confirmed. Your recording is kept. Try again.";
const permanent = new Set(["no_speech", "audio_too_large", "audio_too_long", "invalid_source", "invalid_recap_scope", "unsupported_attempt", "uncertain_assessment"]);
function label(row: { passage_position: number; recap_key: string; kind: string }) {
  const paragraph = /-para(\d+)-/.exec(row.recap_key)?.[1];
  return `Passage ${row.passage_position} · ${row.kind === "passage_recap" ? "Whole passage" : paragraph ? `Paragraph ${paragraph}` : "Recall"}`;
}
function item(row: any, stored?: any): RcGradeItem {
  const base = { recapId: row.id, label: label(row) };
  if (row.voice !== "spoken") return { ...base, status: "ungradable", reason: "This recall was silent, so there is no recording to check.", retryable: false };
  if (row.recording_state !== "saved" || (!row.object_path && !row.capture_id)) return { ...base, status: "ungradable", reason: "The recording hasn't been saved yet. Retry its upload before asking for feedback.", retryable: false };
  if (!stored) return { ...base, status: "ungraded", retryable: true };
  if (stored.status === "ready") return { ...base, status: "ready", retryable: false, grade: { version: stored.grader_version, transcript: stored.transcript, sourceHash: stored.source_hash, sourceText: stored.source_text, audioHash: stored.audio_hash, model: stored.model, asrEngine: stored.asr_engine, assessment: stored.assessment } };
  if (stored.status === "processing") {
    if (Date.parse(stored.lease_until) > Date.now()) return { ...base, status: "processing", retryable: false };
    return { ...base, status: "failed", reason: "The last feedback request did not finish. Your recording is kept.", retryable: stored.tries < MAX_GRADE_ATTEMPTS };
  }
  return { ...base, status: stored.status, reason: stored.reason === "capture_transcribing" ? "Another paragraph is still transcribing this recording. Wait for it to finish, then try again. No feedback attempt was used." : stored.reason === "uncertain_assessment" ? "The transcript was too uncertain to grade fairly. No meaning points were assigned." : reasonFor(stored.reason), retryable: stored.status === "failed" && stored.tries < MAX_GRADE_ATTEMPTS };
}

/** Bound bytes while streaming, including responses without a Content-Length header. */
async function boundedBytes(response: Response, limit: number): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new Error("audio_unavailable");
  if (Number(response.headers.get("content-length")) > limit) throw new Error("audio_too_large");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) throw new Error("audio_too_large"); chunks.push(value); } }
  finally { await reader.cancel(); }
  const result = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

async function hashAudio(response: Response): Promise<string> {
  if (!response.ok || !response.body) throw new Error("audio_unavailable");
  if (Number(response.headers.get("content-length")) > MAX_AUDIO_BYTES) throw new Error("audio_too_large");
  const reader = response.body.getReader(); const hash = sha256.create(); let bytes = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; bytes += value.length; if (bytes > MAX_AUDIO_BYTES) throw new Error("audio_too_large"); hash.update(value); } }
  finally { await reader.cancel(); }
  if (!bytes) throw new Error("no_speech");
  return [...hash.digest()].map(value => value.toString(16).padStart(2, "0")).join("");
}
async function transcribe(audioUrl: string) {
  const key = Deno.env.get("DEEPGRAM_API_KEY"); if (!key) throw new Error("provider_unavailable");
  const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&punctuate=true&smart_format=true", {
    method: "POST", headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ url: audioUrl }),
    signal: AbortSignal.timeout(55000),
  });
  if (!response.ok) throw new Error("provider_unavailable");
  const value = await response.json();
  const duration = Number(value?.metadata?.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("no_speech");
  if (duration > MAX_AUDIO_SECONDS) throw new Error("audio_too_long");
  const result = value?.results?.channels?.[0]?.alternatives?.[0];
  if (typeof result?.transcript !== "string" || result.transcript.trim().length < 10 || result.transcript.length > 30000 || !Array.isArray(result.words) || result.words.length < 3 || !Number.isFinite(Number(result.confidence)) || Number(result.confidence) < 0.5) throw new Error("no_speech");
  return { text: result.transcript.trim(), duration, words: result.words.map((word: any) => ({ word: String(word.punctuated_word ?? word.word ?? ""), start: Number(word.start), end: Number(word.end), confidence: Number(word.confidence) })) };
}
async function judge(sourceText: string, transcript: string) {
  const key = Deno.env.get("LOVABLE_API_KEY"); if (!key) throw new Error("provider_unavailable");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(55000),
    body: JSON.stringify({ model: RC_GRADE_MODEL, temperature: 0, max_tokens: 6500, response_format: { type: "json_object" }, messages: [{ role: "system", content: RC_JUDGE_PROMPT }, { role: "user", content: JSON.stringify({ sourceText, sourceUnits: sourceUnits(sourceText), transcript }) }] }),
  });
  if (!response.ok) throw new Error("provider_unavailable");
  const value = await response.json(); return { assessment: parseRcAssessment(value?.choices?.[0]?.message?.content, sourceText, transcript), usage: {
    promptTokens: Number(value?.usage?.prompt_tokens) || 0, completionTokens: Number(value?.usage?.completion_tokens) || 0,
  } };
}

/** Shared capture transcription is claimed once and reused for all its recall windows. */
async function captureAsr(admin: any, capture: any, audioHash: string, signedUrl: string) {
  const { data: prior, error } = await admin.from("rc_recall_capture_transcripts").select("*").eq("capture_id", capture.id).maybeSingle();
  if (error) throw new Error("provider_unavailable");
  if (prior?.status === "ready" && prior.audio_hash === audioHash && prior.asr_engine === RC_ASR_ENGINE) return { text: prior.transcript, words: prior.asr_words, duration: Number(prior.audio_seconds), calls: 0 };
  if (prior?.status === "processing" && Date.parse(prior.lease_until) > Date.now()) throw new Error("capture_transcribing");
  if ((prior?.tries ?? 0) >= MAX_GRADE_ATTEMPTS) throw new Error("capture_retry_limit");
  const claim = crypto.randomUUID();
  const patch = { capture_id: capture.id, attempt_id: capture.attempt_id, student_id: capture.student_id, status: "processing", claim_token: claim,
    lease_until: new Date(Date.now() + GRADE_LEASE_MS).toISOString(), tries: (prior?.tries ?? 0) + 1, asr_calls: (prior?.asr_calls ?? 0) + 1, updated_at: new Date().toISOString() };
  const result = prior ? await admin.from("rc_recall_capture_transcripts").update(patch).eq("capture_id", capture.id).eq("updated_at", prior.updated_at).select("capture_id").maybeSingle()
    : await admin.from("rc_recall_capture_transcripts").insert(patch).select("capture_id").maybeSingle();
  if (result.error || !result.data) throw new Error("capture_transcribing");
  try {
    const asr = await transcribe(signedUrl);
    const saved = await admin.from("rc_recall_capture_transcripts").update({ status: "ready", claim_token: null, lease_until: null, audio_hash: audioHash,
      asr_engine: RC_ASR_ENGINE, transcript: asr.text, asr_words: asr.words, audio_seconds: asr.duration, updated_at: new Date().toISOString(),
    }).eq("capture_id", capture.id).eq("claim_token", claim).select("capture_id").maybeSingle();
    if (saved.error || !saved.data) throw new Error("save_unconfirmed");
    return { ...asr, calls: 1 };
  } catch (failure) {
    await admin.from("rc_recall_capture_transcripts").update({ status: "failed", claim_token: null, lease_until: null, updated_at: new Date().toISOString() }).eq("capture_id", capture.id).eq("claim_token", claim);
    throw failure;
  }
}

export async function handleRcGradeRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("Authorization"); if (!authorization) return json({ error: "Sign in to view recall feedback." }, 401);
  try {
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: identity, error: authError } = await userClient.auth.getUser();
    if (authError || !identity.user) return json({ error: "Sign in to view recall feedback." }, 401);
    const raw = await req.text(); if (raw.length > 512) return json({ error: "Invalid feedback request." }, 400);
    let input: unknown; try { input = JSON.parse(raw); } catch { return json({ error: "Invalid feedback request." }, 400); }
    if (!validGradeRequest(input)) return json({ error: "Invalid feedback request." }, 400);
    const { data: entitled, error: accessError } = await userClient.rpc("has_reading_center_access");
    if (accessError || !entitled) return json({ error: "Reading Center access is required." }, 403);
    const { data: attempt, error: attemptError } = await userClient.from("rc_recall_attempts").select("*").eq("id", input.attemptId).eq("student_id", identity.user.id).maybeSingle();
    if (attemptError || !attempt) return json({ error: "This attempt is not available." }, 404);
    if (!attempt.finished_at || !attempt.completed) return json({ error: "Complete this attempt before asking for feedback." }, 409);
    const { data: recaps, error: recapError } = await userClient.from("rc_recall_recaps").select("*").eq("attempt_id", attempt.id).eq("student_id", identity.user.id).order("created_at");
    if (recapError) return json({ error: "Your recordings could not be checked." }, 503);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: grades, error: gradeReadError } = await admin.from("rc_recall_grades").select("*").eq("attempt_id", attempt.id).eq("student_id", identity.user.id);
    if (gradeReadError) return json({ error: "Recall feedback is not available yet." }, 503);
    const byId = new Map((grades ?? []).filter((grade: any) => grade.grader_version === RC_GRADER_VERSION).map((grade: any) => [grade.recap_id, grade]));
    if (!input.recapId) return json({ attemptId: attempt.id, items: (recaps ?? []).map((r: any) => item(r, byId.get(r.id))), build: BUILD });
    const recap = recaps?.find((r: any) => r.id === input.recapId); if (!recap) return json({ error: "This recording is not part of your attempt." }, 404);
    let stored: any = byId.get(recap.id); const current = item(recap, stored);
    if (!current.retryable) return json({ attemptId: attempt.id, items: [current], build: BUILD });
    const claim = crypto.randomUUID(), stamp = new Date().toISOString();
    const patch = { status: "processing", claim_token: claim, lease_until: new Date(Date.now() + GRADE_LEASE_MS).toISOString(), tries: (stored?.tries ?? 0) + 1, reason: null, updated_at: stamp };
    const claimed = stored
      ? await admin.from("rc_recall_grades").update(patch).eq("id", stored.id).eq("updated_at", stored.updated_at).select("*").maybeSingle()
      : await admin.from("rc_recall_grades").insert({ ...patch, recap_id: recap.id, attempt_id: attempt.id, student_id: identity.user.id, grader_version: RC_GRADER_VERSION }).select("*").maybeSingle();
    if (claimed.error || !claimed.data) {
      const { data: active } = await admin.from("rc_recall_grades").select("*").eq("recap_id", recap.id).eq("grader_version", RC_GRADER_VERSION).maybeSingle();
      return active ? json({ attemptId: attempt.id, items: [item(recap, active)], build: BUILD }) : json({ error: "Feedback could not start. Try again." }, 503);
    }
    stored = claimed.data;
    try {
      if (Number(recap.duration_ms) > MAX_AUDIO_SECONDS * 1000) throw new Error("audio_too_long");
      let capture: any = null;
      if (recap.capture_id) {
        const found = await admin.from("rc_recall_captures").select("*").eq("id", recap.capture_id).eq("attempt_id", attempt.id).eq("student_id", identity.user.id).maybeSingle();
        if (found.error || !found.data || found.data.recording_state !== "saved") throw new Error("audio_unavailable");
        capture = found.data;
      }
      const audioPath = capture?.object_path ?? recap.object_path;
      const prefix = capture ? `${identity.user.id}/${attempt.id}/capture-${capture.id}-` : `${identity.user.id}/${attempt.id}/${recap.recap_key}-`;
      if (typeof audioPath !== "string" || !audioPath.startsWith(prefix)) throw new Error("invalid_recap_scope");
      const pt = Number(attempt.preptest); if (!Number.isInteger(pt) || pt < 1 || pt > 1000) throw new Error("invalid_source");
      const sourceResponse = await fetch(`https://lsatprep.study/data/rc/RC-PT${pt}.json`, { redirect: "error", signal: AbortSignal.timeout(15000) });
      const sourceBytes = await boundedBytes(sourceResponse, 4 * 1024 * 1024);
      const source = canonicalSource(JSON.parse(new TextDecoder().decode(sourceBytes)), attempt, recap);
      const sourceHash = await digest(source.text);
      const { data: signed, error: signError } = await admin.storage.from(BUCKET).createSignedUrl(audioPath, 300);
      if (signError || !signed?.signedUrl) throw new Error("audio_unavailable");
      const audioHash = await hashAudio(await fetch(signed.signedUrl, { signal: AbortSignal.timeout(45000) }));
      if (!Deno.env.get("LOVABLE_API_KEY") || !Deno.env.get("DEEPGRAM_API_KEY")) throw new Error("provider_unavailable");
      // A judge failure must not require paying to transcribe the same immutable
      // recording again. Reuse only a server-written transcript with both hashes.
      let asr: { text: string; words: any[] }; let audioSeconds: number | null = null; let asrCalls = Number(stored.asr_calls ?? 0);
      if (capture) {
        const full = await captureAsr(admin, capture, audioHash, signed.signedUrl);
        audioSeconds = full.duration; asrCalls += full.calls;
        asr = recallWindowTranscript(full.words, recap.recall_start_ms, recap.recall_end_ms, Math.min(capture.duration_ms, Math.ceil(full.duration * 1000) + 250));
      } else {
        const cached = reusableRcTranscript(grades ?? [], recap.id, audioHash, sourceHash);
        if (cached) asr = { text: cached.text, words: cached.words as any[] };
        else {
          asrCalls++;
          const counter = await admin.from("rc_recall_grades").update({ asr_calls: asrCalls }).eq("id", stored.id).eq("claim_token", claim);
          if (counter.error) throw new Error("save_unconfirmed");
          const result = await transcribe(signed.signedUrl); asr = result; audioSeconds = result.duration;
        }
      }
      const checkpoint = await admin.from("rc_recall_grades").update({ source_text: source.text, source_hash: sourceHash, audio_hash: audioHash, object_path: audioPath,
        passage_id: source.passageId, paragraph_index: source.paragraphIndex, transcript: asr.text, asr_words: asr.words, asr_engine: RC_ASR_ENGINE, model: RC_GRADE_MODEL,
        capture_id: capture?.id ?? null, recall_start_ms: recap.recall_start_ms ?? null, recall_end_ms: recap.recall_end_ms ?? null, asr_calls: asrCalls, audio_seconds: audioSeconds,
      }).eq("id", stored.id).eq("claim_token", claim).select("id").maybeSingle();
      if (checkpoint.error || !checkpoint.data) throw new Error("save_unconfirmed");
      const counted = await admin.from("rc_recall_grades").update({ judge_calls: Number(stored.judge_calls ?? 0) + 1 }).eq("id", stored.id).eq("claim_token", claim);
      if (counted.error) throw new Error("save_unconfirmed");
      const { assessment, usage } = await judge(source.text, asr.text);
      const saved = await admin.from("rc_recall_grades").update({ status: "ready", assessment, provider_usage: usage,
        claim_token: null, lease_until: null, updated_at: new Date().toISOString() }).eq("id", stored.id).eq("claim_token", claim).select("*").single();
      if (saved.error || !saved.data) throw new Error("save_unconfirmed");
      return json({ attemptId: attempt.id, items: [item(recap, saved.data)], build: BUILD });
    } catch (error) {
      // Never log recordings, transcripts, provider bodies, source text or signed URLs.
      const code = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "provider_unavailable";
      const status = permanent.has(code) ? "ungradable" : "failed";
      const { data: failed, error: failedError } = await admin.from("rc_recall_grades").update({ status, reason: code, claim_token: null, lease_until: null,
        ...(code === "capture_transcribing" ? { tries: Math.max(0, Number(stored.tries) - 1) } : {}),
        updated_at: new Date().toISOString() }).eq("id", stored.id).eq("claim_token", claim).select("*").maybeSingle();
      if (failedError || !failed) return json({ error: "The feedback result could not be saved. Your recording is kept." }, 503);
      return json({ attemptId: attempt.id, items: [item(recap, failed)], build: BUILD });
    }
  } catch { return json({ error: "Recall feedback is unavailable. Your recording is kept." }, 503); }
}

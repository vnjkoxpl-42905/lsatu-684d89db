// Shared LSAT knowledge retrieval helper.
//
// One entry point for tutor, explanations, drills, bootcamps, weakness
// analysis, and any future LSAT feature. Do NOT call the embedding endpoint
// or the retrieve_lsat_knowledge RPC directly from client code — always go
// through the retrieve-lsat-knowledge Edge Function so auth, embedding, and
// RPC access remain server-side.
//
// This helper deliberately does NOT touch Memory OS or Tutor Corpus. Those
// stay in their own retrieval paths; a higher-level orchestrator can combine
// results while preserving provenance.

import { supabase } from "@/integrations/supabase/client";

export interface LsatKnowledgeQuery {
  query: string;
  entity_type?: "question_type" | "reasoning_type" | null;
  entity_key?: string | null;
  section_key?: string | null;
  authority?: string | null;
  source_version?: string | null;
  match_count?: number;
  kinds?: string[];
  /** Exact canonical id lookup (e.g. "question-types/necessary-assumption/keywords"). */
  canonical_id?: string;
}

export interface LsatKnowledgeRecord {
  id: string;
  record_id?: string;
  kind: string;
  source_id: string;
  chunk_index: number;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
  heading_path?: string[] | unknown;
  fts_rank?: number;
  vector_similarity?: number;
  score?: number;
}

export interface LsatKnowledgeResponse {
  mode: "exact" | "hybrid";
  results: LsatKnowledgeRecord[];
  error?: string;
}

export async function retrieveLsatKnowledge(input: LsatKnowledgeQuery): Promise<LsatKnowledgeResponse> {
  const { data, error } = await supabase.functions.invoke("retrieve-lsat-knowledge", { body: input });
  if (error) return { mode: "hybrid", results: [], error: error.message };
  return data as LsatKnowledgeResponse;
}

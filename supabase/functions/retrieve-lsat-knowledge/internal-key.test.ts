// Deno test for the fail-closed internal-key check in retrieve-lsat-knowledge.
//
// Run with: deno test supabase/functions/retrieve-lsat-knowledge/internal-key.test.ts --allow-env
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isInternalRequest } from "./index.ts";

Deno.test("isInternalRequest: env secret missing → header cannot grant internal access", () => {
  Deno.env.delete("EDGE_INTERNAL_KEY");
  const req = new Request("http://x", { headers: { "X-Internal-Key": "___never___" } });
  assertEquals(isInternalRequest(req), false);
});

Deno.test("isInternalRequest: env secret empty → false", () => {
  Deno.env.set("EDGE_INTERNAL_KEY", "");
  const req = new Request("http://x", { headers: { "X-Internal-Key": "anything" } });
  assertEquals(isInternalRequest(req), false);
});

Deno.test("isInternalRequest: mismatched header → false", () => {
  Deno.env.set("EDGE_INTERNAL_KEY", "real-secret-value");
  const req = new Request("http://x", { headers: { "X-Internal-Key": "wrong" } });
  assertEquals(isInternalRequest(req), false);
});

Deno.test("isInternalRequest: missing header even when secret present → false", () => {
  Deno.env.set("EDGE_INTERNAL_KEY", "real-secret-value");
  const req = new Request("http://x");
  assertEquals(isInternalRequest(req), false);
});

Deno.test("isInternalRequest: exact match with real secret → true", () => {
  Deno.env.set("EDGE_INTERNAL_KEY", "real-secret-value");
  const req = new Request("http://x", { headers: { "X-Internal-Key": "real-secret-value" } });
  assertEquals(isInternalRequest(req), true);
});

Deno.test("isInternalRequest: literal '___never___' does not grant access when secret absent", () => {
  Deno.env.delete("EDGE_INTERNAL_KEY");
  const req = new Request("http://x", { headers: { "X-Internal-Key": "___never___" } });
  assertEquals(isInternalRequest(req), false);
});

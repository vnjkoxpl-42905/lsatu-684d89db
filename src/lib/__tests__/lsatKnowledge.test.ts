import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

import { retrieveLsatKnowledge } from "@/lib/lsatKnowledge";

describe("retrieveLsatKnowledge", () => {
  beforeEach(() => invokeMock.mockReset());

  it("invokes the retrieve-lsat-knowledge edge function with the payload", async () => {
    invokeMock.mockResolvedValue({ data: { mode: "hybrid", results: [] }, error: null });
    await retrieveLsatKnowledge({ query: "point at issue", entity_key: "agree-disagree", match_count: 5 });
    expect(invokeMock).toHaveBeenCalledWith("retrieve-lsat-knowledge", {
      body: { query: "point at issue", entity_key: "agree-disagree", match_count: 5 },
    });
  });

  it("surfaces edge-function errors as { error }", async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const r = await retrieveLsatKnowledge({ query: "x" });
    expect(r.error).toBe("boom");
    expect(r.results).toEqual([]);
  });
});

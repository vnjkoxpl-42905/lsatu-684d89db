import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { buildMcpSectionCatalog } from "../../../scripts/build-mcp-section-catalog.mjs";
import { drillRunSpecFromLaunch } from "../drillRunSpec";
import {
  resolveTeachingCatalogItem,
  searchTeachingCatalog,
  summarizeTeachingCatalogItem,
  type PrepTestSection,
} from "./assignmentCatalog";
import artifact from "./sectionCatalog.generated.json";

const noDb = {} as SupabaseClient;
const pt150 = { kind: "prep_test_section", prep_test: 150, section_type: "LR" } as const;

function catalogClient(rows: (query: URL) => object[]) {
  const fetch = vi.fn(async (input: RequestInfo | URL) => Response.json(rows(new URL(String(input)))));
  const client = createClient("https://catalog.test", "test-token", {
    global: { fetch },
    auth: { autoRefreshToken: false, persistSession: false, storageKey: crypto.randomUUID() },
  });
  return { client, fetch };
}

describe("MCP teaching catalog", () => {
  it("reproduces the checked-in section catalog from the editable question bank", () => {
    expect(artifact).toEqual(buildMcpSectionCatalog(resolve("public/data")));
  });

  it("resolves any PT150 LR to its first canonical section with the exact timed assignment queue", async () => {
    const item = await resolveTeachingCatalogItem(noDb, { ...pt150, any_section: true }) as PrepTestSection;
    expect(item).toMatchObject({
      id: "PT150.S2", section_type: "LR", question_count: 25, standard_minutes: 35,
    });
    expect(item.question_ids).toEqual(Array.from({ length: 25 }, (_, index) => "PT150-S2-Q" + (index + 1)));
    const run = drillRunSpecFromLaunch({ kind: "assignment", assignmentId: "test-assignment" }, item.question_ids);
    expect(run).toMatchObject({
      mode: "full-section", sealed: true, assignmentId: "test-assignment",
      config: { pt: 150, section: 2, timer: { mode: "35" } }, restrictQids: item.question_ids,
    });
    expect(summarizeTeachingCatalogItem(item)).not.toHaveProperty("question_ids");
  });

  it("requires a specific match unless any was explicitly requested", async () => {
    await expect(resolveTeachingCatalogItem(noDb, pt150)).rejects.toMatchObject({
      candidates: [expect.objectContaining({ id: "PT150.S2" }), expect.objectContaining({ id: "PT150.S3" })],
    });
    await expect(resolveTeachingCatalogItem(noDb, { ...pt150, section_number: 3 }))
      .resolves.toMatchObject({ id: "PT150.S3", section_type: "LR" });
    await expect(resolveTeachingCatalogItem(noDb, { ...pt150, section_number: 3, section_type: "RC" }))
      .rejects.toThrow("No matching");
    await expect(resolveTeachingCatalogItem(noDb, { kind: "prep_test_section", prep_test: 150, any_section: true }))
      .rejects.toThrow("explicit section_type");
  });

  it("keeps the published numbering gap for a removed LR question", async () => {
    const item = await resolveTeachingCatalogItem(noDb, { kind: "prep_test_section", prep_test: 118, section_number: 1 }) as PrepTestSection;
    expect(item.section_type).toBe("LR");
    expect(item.question_ids.slice(3, 6)).toEqual(["PT118-S1-Q4", "PT118-S1-Q6", "PT118-S1-Q7"]);
    expect(item.question_ids.at(-1)).toBe("PT118-S1-Q26");
    const unscored = await resolveTeachingCatalogItem(noDb, { kind: "prep_test_section", prep_test: 118, section_number: 3 }) as PrepTestSection;
    expect(unscored.question_ids).toHaveLength(24);
    expect(unscored.question_ids.slice(-4)).toEqual(["PT118-S3-Q21", "PT118-S3-Q23", "PT118-S3-Q24", "PT118-S3-Q25"]);
  });

  it("uses bank identification and all four ordered passage IDs for RC", async () => {
    const item = await resolveTeachingCatalogItem(noDb, { kind: "prep_test_section", prep_test: 118, section_type: "RC" }) as PrepTestSection;
    expect(item).toMatchObject({ id: "PT118.S2", section_type: "RC", question_count: 27, standard_minutes: 35 });
    expect(item.passage_ids).toHaveLength(4);
    expect(new Set(item.question_ids).size).toBe(27);
    await expect(resolveTeachingCatalogItem(noDb, { kind: "prep_test_section", prep_test: 119, section_number: 1, section_type: "RC" }))
      .rejects.toThrow("No matching");
  });

  it("returns Teacher Workspace day choices from the existing bootcamp registry", async () => {
    await expect(resolveTeachingCatalogItem(noDb, { kind: "bootcamp", query: "PRINCIPLE-FLAW" }))
      .resolves.toMatchObject({ id: "principle-flaw", days: expect.arrayContaining([expect.objectContaining({ day: 1 })]) });
    await expect(resolveTeachingCatalogItem(noDb, { kind: "bootcamp", query: "Conditional Logic" }))
      .resolves.toMatchObject({ id: "conditionals", supports_conditional_target: true, days: null });
  });

  it("reads activity behavior by exact title ahead of partial matches", async () => {
    const { client, fetch } = catalogClient((url) => {
      const pattern = url.searchParams.get("title");
      return pattern === "ilike.Read, Recall, Colour"
        ? [{ id: "door", title: "Read, Recall, Colour", slug: "read-recall-colour-sections", mode: "section-library" }]
        : [];
    });
    await expect(resolveTeachingCatalogItem(client, { kind: "activity", query: "Read, Recall, Colour" }))
      .resolves.toMatchObject({ id: "door", mode: "section-library" });
    expect(fetch.mock.calls.map(([url]) => new URL(String(url)).pathname))
      .toEqual(["/rest/v1/activities", "/rest/v1/activities"]);
  });

  it("returns guided drill defaults while refusing an ambiguous title", async () => {
    const data = [
      { id: "a", title: "Main Conclusion 1", slug: "main-conclusion-1", question_count: 8, difficulty_min: 1, difficulty_max: 3 },
      { id: "b", title: "Main Conclusion 2", slug: "main-conclusion-2", question_count: 10, difficulty_min: 2, difficulty_max: 5 },
    ];
    const { client } = catalogClient((url) => {
      if (url.searchParams.get("slug") === "eq.main-conclusion-1") return [data[0]];
      return url.searchParams.get("title") === "ilike.%Main Conclusion%" ? data : [];
    });
    const selector = { kind: "guided_drill", query: "Main Conclusion" } as const;
    await expect(searchTeachingCatalog(client, selector)).resolves.toMatchObject({
      items: [expect.objectContaining(data[0]), expect.objectContaining(data[1])], truncated: false,
    });
    await expect(resolveTeachingCatalogItem(client, selector)).rejects.toThrow("Multiple items match");
    await expect(resolveTeachingCatalogItem(client, { ...selector, query: "main-conclusion-1" }))
      .resolves.toMatchObject({ id: "a", question_count: 8, difficulty_min: 1, difficulty_max: 3 });
  });
});

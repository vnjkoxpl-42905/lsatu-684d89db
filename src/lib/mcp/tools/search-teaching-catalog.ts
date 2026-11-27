import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  searchTeachingCatalog,
  summarizeTeachingCatalogItem,
  teachingCatalogSelectorSchema,
} from "../assignmentCatalog";
import { requireAdmin, textResult } from "./_shared";

export default defineTool({
  name: "search_teaching_catalog",
  title: "Search the teaching catalog (admin)",
  description:
    "Find canonical full PrepTest sections, guided drills, bootcamps, and activities. PrepTest results show the bank's section type, standard clock, and question count. For other kinds, search by title, slug, or exact ID. Use the exact result in assignment preview.",
  inputSchema: {
    item: teachingCatalogSelectorSchema,
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ item, limit = 25 }, ctx) => {
    const admin = await requireAdmin(ctx);
    if (admin.error) return textResult(admin.error, true);
    try {
      const result = await searchTeachingCatalog(admin.supabase, item);
      const payload = {
        items: result.items.slice(0, limit).map(summarizeTeachingCatalogItem),
        truncated: result.truncated || result.items.length > limit,
      };
      return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
    } catch (error) {
      return textResult(error instanceof Error ? error.message : "Catalog search failed.", true);
    }
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { conditionalFullCourseAssignmentsReleased } from "../../conditionalCourseEdition";
import { toolError } from "../admin-client";
import { requireAdmin } from "./_shared";
import { resolveTeachingCatalogItem, summarizeTeachingCatalogItem, teachingCatalogSelectorSchema, TeachingCatalogResolutionError } from "../assignmentCatalog";
import { prepareTeachingAssignment, teachingAssignmentRpc, teachingAssignmentSettings } from "../teachingAssignment";

export const assignmentInput = {
  student_id: z.string().uuid().describe("Exact student ID from find_students or list_students."),
  item: teachingCatalogSelectorSchema,
  settings: teachingAssignmentSettings.optional(),
};

export default defineTool({
  name: "preview_teaching_assignment",
  title: "Preview an LSAT U teaching assignment",
  description: "Admin only. Resolve a timed PrepTest section, guided drill, activity, or bootcamp for an exact student. Shows work, dates, notification effects, and any active duplicate. Ask the teacher to approve the preview before assigning.",
  inputSchema: assignmentInput,
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    try {
      const admin = await requireAdmin(ctx);
      if (admin.error) throw new Error(admin.error);
      const client = admin.supabase;
      const item = await resolveTeachingCatalogItem(client, input.item);
      const settings = input.settings ?? {};
      const exactSelector = item.kind === "prep_test_section"
        ? { kind: item.kind, prep_test: item.prep_test, section_type: item.section_type, section_number: item.section_number }
        : { kind: item.kind, query: item.id };
      const draft = await prepareTeachingAssignment(item, settings, conditionalFullCourseAssignmentsReleased());
      const preview = await teachingAssignmentRpc(client, "mcp_preview_teaching_assignment", {
        p_student_id: input.student_id, p_item: draft, p_settings: settings,
      });
      const out = { ...preview, catalog_item: summarizeTeachingCatalogItem(item), execution: {
        student_id: input.student_id, item: exactSelector, settings, confirmation: preview.confirmation,
      } };
      return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: out };
    } catch (error) {
      if (error instanceof TeachingCatalogResolutionError && error.candidates.length) {
        return { content: [{ type: "text", text: JSON.stringify({
          error: error.message, candidates: error.candidates.map(summarizeTeachingCatalogItem),
        }, null, 2) }], isError: true };
      }
      return toolError(error);
    }
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { conditionalFullCourseAssignmentsReleased } from "../../conditionalCourseEdition";
import { toolError } from "../admin-client";
import { requireAdmin } from "./_shared";
import { resolveTeachingCatalogItem } from "../assignmentCatalog";
import { sendNotifyEmail } from "../notify-email";
import { prepareTeachingAssignment, teachingAssignmentRpc } from "../teachingAssignment";
import { assignmentInput } from "./preview-teaching-assignment";

export default defineTool({
  name: "assign_teaching_work",
  title: "Assign approved LSAT U teaching work",
  description: "Admin only. After teacher approval, execute the exact inputs and confirmation from preview_teaching_assignment. Reuse the same idempotency_key on retries. Returns the Classroom item and separately reports each notification channel.",
  inputSchema: {
    ...assignmentInput,
    confirmation: z.string().regex(/^[a-f0-9]{32}$/).describe("Confirmation from the approved preview."),
    idempotency_key: z.string().trim().min(8).max(160).describe("Stable unique key for this approved action. Reuse it on retries."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    try {
      const admin = await requireAdmin(ctx);
      if (admin.error) throw new Error(admin.error);
      const client = admin.supabase;
      const receiptArgs = { p_student_id: input.student_id, p_confirmation: input.confirmation, p_idempotency_key: input.idempotency_key };
      const { data: prior, error: priorError } = await client.rpc("mcp_read_teaching_assignment_receipt", receiptArgs);
      if (priorError) throw priorError;
      if (prior) return { content: [{ type: "text", text: JSON.stringify(prior, null, 2) }], structuredContent: prior };

      const item = await resolveTeachingCatalogItem(client, input.item);
      const settings = input.settings ?? {};
      const draft = await prepareTeachingAssignment(item, settings, conditionalFullCourseAssignmentsReleased());
      let out = await teachingAssignmentRpc(client, "mcp_execute_teaching_assignment", {
        ...receiptArgs, p_item: draft, p_settings: settings,
      });

      if (out.email_claimed === true) {
        const notification = await sendNotifyEmail(client, {
          studentId: input.student_id,
          title: String(out.title),
          description: typeof out.description === "string" ? out.description : undefined,
          route: String(out.route),
          assignmentType: String(out.assignment_type),
        });
        try {
          out = await teachingAssignmentRpc(client, "mcp_record_teaching_assignment_email", {
            ...receiptArgs, p_ok: notification.ok, p_error: notification.error?.slice(0, 300) ?? null,
          });
        } catch {
          out = { ...out, notification: { ...out.notification as object, email: {
            status: notification.ok ? "sent" : "failed", ...(notification.error ? { error: notification.error } : {}),
            persisted: false,
          } } };
        }
      }
      const { email_claimed: _claimed, ...receipt } = out;
      return { content: [{ type: "text", text: JSON.stringify(receipt, null, 2) }], structuredContent: receipt };
    } catch (error) {
      return toolError(error);
    }
  },
});

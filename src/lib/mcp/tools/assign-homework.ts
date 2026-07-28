import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, textResult } from "./_shared";

export default defineTool({
  name: "assign_homework",
  title: "Assign homework set to a student (admin)",
  description:
    "Admin only. Assign an existing homework set to a student. Creates a homework_assignments row and a classroom_items entry so the student sees it on their Classroom page. Get the set id from list_homework_sets and the student id from list_students.",
  inputSchema: {
    set_id: z.string().uuid().describe("homework_sets.id to assign."),
    student_id: z.string().uuid().describe("Target student's id (profiles.class_id / auth user id)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ set_id, student_id }, ctx) => {
    const admin = await requireAdmin(ctx);
    if (!admin.ok) return textResult(admin.error, true);
    const { supabase, userId } = admin;

    const { data: set, error: setErr } = await supabase
      .from("homework_sets")
      .select("id, title, description, question_qids, class_id")
      .eq("id", set_id)
      .maybeSingle();
    if (setErr) return textResult(setErr.message, true);
    if (!set) return textResult("Homework set not found", true);

    const { data: assignment, error: asgErr } = await supabase
      .from("homework_assignments")
      .insert({
        set_id: set.id,
        student_id,
        question_qids: set.question_qids,
        set_title: set.title,
        set_description: set.description,
        status: "assigned",
        assigned_by: userId,
        class_id: set.class_id,
      })
      .select("id")
      .single();
    if (asgErr) {
      if (asgErr.code === "23505") {
        return textResult(`"${set.title}" is already assigned to that student.`);
      }
      return textResult(asgErr.message, true);
    }

    const assignmentId = (assignment as { id: string }).id;
    const route = `/classroom/${assignmentId}`;

    const { error: itemErr } = await supabase.from("classroom_items").insert({
      student_id,
      created_by: userId,
      type: "homework",
      title: set.title,
      description: set.description ?? null,
      source_table: "homework_assignments",
      source_id: assignmentId,
      visible_to_student: true,
      status: "assigned",
      metadata_json: { assigned_route: route },
    });
    if (itemErr) return textResult(`Assigned, but classroom feed insert failed: ${itemErr.message}`, true);

    return {
      content: [{ type: "text", text: `Assigned "${set.title}" — student route: ${route}` }],
      structuredContent: { assignment_id: assignmentId, route },
    };
  },
});

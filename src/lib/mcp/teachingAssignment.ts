import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planBootcampAssignment } from "../bootcampAssignmentPlan";
import { bootcampDays } from "../bootcampDays";
import type { ConditionalAssignmentTarget } from "../conditionalBootcampAssignment";

export const teachingAssignmentSettings = z.object({
  scheduled_for: z.string().date().optional().describe("Calendar date in time_zone. Unlocks at local midnight."),
  due_on: z.string().date().optional().describe("Calendar date in time_zone. Due at the end of that day."),
  time_zone: z.string().trim().min(1).max(80).optional().describe("IANA time zone, such as America/Toronto. Required when specifying a date."),
  notify: z.boolean().optional().describe("Defaults to true. Future work sends only its scheduled in-app bell."),
  allow_repeat: z.boolean().optional().describe("Explicitly assign a second copy of a guided drill or activity, while still showing existing copies in preview."),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(4000).optional(),
  drill_level: z.enum(["beginner", "intermediate", "advanced"]).nullable().optional().describe("Defaults to the student profile level. Explicit null uses the drill's own range."),
  question_count: z.number().int().positive().max(2147483647).optional().describe("Guided-drill question count override."),
  timing_mode: z.enum(["35", "52.5", "70"]).optional().describe("Minutes for an assigned timed PrepTest section. Defaults to 35."),
  assigned_day_ids: z.array(z.number().int().positive()).min(1).max(50).optional(),
  conditional_target: z.object({
    scope: z.enum(["course", "stage", "area", "skill", "general", "activity"]),
    mode: z.enum(["learn", "practice"]),
    difficulty: z.enum(["beginner", "medium", "advanced"]),
    unitId: z.string().trim().min(1).max(80).optional(),
    area: z.enum(["understanding", "translation", "linking", "inference", "complex", "application", "quantifiers"]).optional(),
    curriculumVersion: z.union([z.literal(2), z.literal(3)]).optional(),
    courseEdition: z.literal("full-conditionals-v3").optional(),
    activityId: z.string().trim().min(1).max(80).optional(),
    activitySettings: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean(), z.array(z.enum(["g1", "g2", "g3", "g4"])).min(1).max(4)])).optional(),
  }).strict().optional(),
}).strict();

export type TeachingAssignmentSettings = z.infer<typeof teachingAssignmentSettings>;
type ExactItem = { kind: "prep_test_section"; id: string; prep_test: number; section_type: "LR" | "RC"; section_number: number; question_ids: string[] }
  | { kind: "guided_drill" | "activity" | "bootcamp"; id: string };

export async function prepareTeachingAssignment(item: ExactItem, settings: TeachingAssignmentSettings, fullCourseReleased: boolean) {
  if ((settings.scheduled_for || settings.due_on) && !settings.time_zone) throw new Error("Provide the teacher's IANA time zone when scheduling or setting a due date.");
  if (settings.time_zone) {
    try { new Intl.DateTimeFormat("en", { timeZone: settings.time_zone }); }
    catch { throw new Error("Provide a valid IANA time zone."); }
  }
  if (settings.scheduled_for && settings.due_on && settings.due_on < settings.scheduled_for) throw new Error("The due date precedes the scheduled unlock.");
  if (settings.allow_repeat !== undefined && item.kind !== "guided_drill" && item.kind !== "activity") throw new Error("Repeat overrides apply only to guided drills and activities.");
  if (item.kind !== "guided_drill" && (settings.drill_level !== undefined || settings.question_count !== undefined)) throw new Error("Level and question count apply only to guided drills.");
  if (item.kind !== "prep_test_section" && settings.timing_mode !== undefined) throw new Error("Timing mode applies only to PrepTest sections.");
  if (item.kind !== "bootcamp" && (settings.conditional_target || settings.assigned_day_ids)) throw new Error("Day selections and conditional targets apply only to bootcamps.");
  if (item.kind === "prep_test_section") return {
    kind: item.kind, pt: item.prep_test, section: item.section_number, section_type: item.section_type.toLowerCase(),
    question_ids: item.question_ids,
  };
  if (item.kind !== "bootcamp") return { kind: item.kind, id: item.id };

  const days = settings.assigned_day_ids ? [...new Set(settings.assigned_day_ids)].sort((a, b) => a - b) : undefined;
  if (days) {
    const availableDays = bootcampDays(item.id);
    if (!availableDays || days.some((day) => !availableDays.some((entry) => entry.day === day))) throw new Error("This bootcamp does not support the selected days.");
  }
  const bootcamp = await planBootcampAssignment(item.id, settings.conditional_target as ConditionalAssignmentTarget | undefined, fullCourseReleased);
  return {
    kind: item.kind, id: item.id, ...bootcamp,
    metadata: { ...bootcamp.metadata, ...(days ? { assigned_day_ids: days } : {}) },
  };
}

export async function teachingAssignmentRpc(client: SupabaseClient, name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("LSAT U did not return an assignment receipt.");
  return data;
}

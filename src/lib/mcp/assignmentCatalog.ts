import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { BOOTCAMPS } from "../bootcamps";
import { bootcampDays, type BootcampDay } from "../bootcampDays";
import { PRACTICE_TEST_SECTION_SECONDS } from "../practiceTest";
import sections from "./sectionCatalog.generated.json";

const catalogQuery = z.string().trim().min(1).max(160).describe("Title substring, exact title, slug, or exact catalog ID.");
const sectionSelectorSchema = z.object({
  kind: z.literal("prep_test_section"),
  prep_test: z.number().int().positive().describe("PrepTest number, for example 150."),
  section_type: z.enum(["LR", "RC"]).optional(),
  section_number: z.number().int().positive().optional(),
  any_section: z.boolean().optional().describe("Set true only when the teacher explicitly accepts any section of the specified type."),
}).strict();
export const teachingCatalogSelectorSchema = z.discriminatedUnion("kind", [
  sectionSelectorSchema,
  z.object({ kind: z.literal("guided_drill"), query: catalogQuery }).strict(),
  z.object({ kind: z.literal("activity"), query: catalogQuery }).strict(),
  z.object({ kind: z.literal("bootcamp"), query: catalogQuery }).strict(),
]);

export type TeachingCatalogSelector = z.infer<typeof teachingCatalogSelectorSchema>;

type CatalogBase = { id: string; title: string };
export type PrepTestSection = CatalogBase & {
  kind: "prep_test_section";
  prep_test: number;
  section_type: "LR" | "RC";
  section_number: number;
  question_count: number;
  question_ids: string[];
  passage_ids?: number[];
  standard_minutes: number;
};

type GuidedDrillItem = CatalogBase & {
  kind: "guided_drill";
  slug: string;
  question_count: number | null;
  estimated_minutes: number | null;
  difficulty_min: number | null;
  difficulty_max: number | null;
  level: string | null;
  is_published: boolean;
};

type ActivityItem = CatalogBase & {
  kind: "activity";
  slug: string;
  subtitle: string | null;
  mode: string | null;
  item_format: string;
  source_section: string | null;
};

type BootcampItem = CatalogBase & {
  kind: "bootcamp";
  description: string;
  route: string;
  outline?: string[];
  days: BootcampDay[] | null;
  supports_conditional_target: boolean;
};

export type TeachingCatalogItem = PrepTestSection | GuidedDrillItem | ActivityItem | BootcampItem;
type SearchMatch = { items: TeachingCatalogItem[]; truncated: boolean };

const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const maxResults = 50;

export function summarizeTeachingCatalogItem(item: TeachingCatalogItem) {
  if (item.kind !== "prep_test_section") return item;
  const { question_ids: _questionIds, ...summary } = item;
  return summary;
}

export class TeachingCatalogResolutionError extends Error {
  constructor(message: string, readonly candidates: TeachingCatalogItem[] = []) {
    super(message);
    this.name = "TeachingCatalogResolutionError";
  }
}

function matchingSections(selector: z.infer<typeof sectionSelectorSchema>): PrepTestSection[] {
  if (selector.any_section && (!selector.section_type || selector.section_number !== undefined)) {
    throw new TeachingCatalogResolutionError("Use any_section with an explicit section_type and without a section_number.");
  }

  return sections
    .filter((section) => section.prep_test === selector.prep_test &&
      (selector.section_type === undefined || section.section_type === selector.section_type) &&
      (selector.section_number === undefined || section.section_number === selector.section_number))
    .map((section) => {
      const sectionType = section.section_type;
      if (sectionType !== "LR" && sectionType !== "RC") throw new Error("Unknown section type in the canonical bank.");
      const id = "PT" + section.prep_test + ".S" + section.section_number;
      return {
        ...section,
        kind: "prep_test_section",
        id,
        title: id + " (" + sectionType + ")",
        section_type: sectionType,
        question_count: section.question_ids.length,
        standard_minutes: PRACTICE_TEST_SECTION_SECONDS / 60,
      };
    });
}

function exactTitleOrMatches<T extends CatalogBase>(items: T[], query: string): T[] {
  const exact = items.filter((item) => item.title.toLowerCase() === query.toLowerCase());
  return exact.length > 0 ? exact : items;
}

function matchingBootcamps(query: string): BootcampItem[] {
  const normalized = query.toLowerCase();
  const exactId = BOOTCAMPS.find((item) => item.id.toLowerCase() === normalized);
  const matches = exactId ? [exactId] : exactTitleOrMatches(
    BOOTCAMPS.filter((item) => item.title.toLowerCase().includes(normalized)), query,
  );
  return matches.map((bootcamp) => ({
    kind: "bootcamp",
    id: bootcamp.id,
    title: bootcamp.title,
    description: bootcamp.description,
    route: bootcamp.route,
    outline: bootcamp.outline,
    days: bootcampDays(bootcamp.id),
    supports_conditional_target: bootcamp.id === "conditionals",
  }));
}

function literalLike(query: string) {
  return query.replace(/[\\%_]/g, "\\$&");
}

async function databaseMatches(
  supabase: SupabaseClient,
  kind: "guided_drill" | "activity",
  query: string,
): Promise<SearchMatch> {
  const table = kind === "guided_drill" ? "guided_drills" : "activities";
  const columns: string = kind === "guided_drill"
    ? "id, title, slug, question_count, estimated_minutes, difficulty_min, difficulty_max, level, is_published"
    : "id, title, slug, subtitle, mode, item_format, source_section";

  const base = () => supabase.from(table).select(columns).order("title").order("id").limit(maxResults + 1);
  const exactKey = uuid.test(query) ? "id" : "slug";
  const normalized = query.toLowerCase();

  function acceptRows(
    { data, error }: { data: unknown; error: { message: string } | null },
    matches: (row: CatalogBase) => boolean = () => true,
  ): SearchMatch {
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as CatalogBase[];
    return {
      items: rows.filter(matches).slice(0, maxResults).map((row) => ({ ...row, kind } as TeachingCatalogItem)),
      truncated: rows.length > maxResults,
    };
  }

  const byKey = acceptRows(await base().eq(exactKey, normalized));
  if (byKey.items.length || exactKey === "id") return byKey;
  // PostgREST treats an asterisk as a LIKE wildcard alias. Broaden that
  // character to one position, then apply literal matching before returning rows.
  const pattern = literalLike(query).replace(/\*/g, "_");
  const exactTitle = acceptRows(
    await base().ilike("title", pattern),
    (row) => row.title.toLowerCase() === normalized,
  );
  if (exactTitle.items.length || exactTitle.truncated) return exactTitle;
  return acceptRows(
    await base().ilike("title", "%" + pattern + "%"),
    (row) => row.title.toLowerCase().includes(normalized),
  );
}

export async function searchTeachingCatalog(
  supabase: SupabaseClient,
  selector: TeachingCatalogSelector,
): Promise<SearchMatch> {
  if (selector.kind === "prep_test_section") {
    return { items: matchingSections(selector), truncated: false };
  }
  if (selector.kind === "bootcamp") return { items: matchingBootcamps(selector.query), truncated: false };
  return databaseMatches(supabase, selector.kind, selector.query);
}

export async function resolveTeachingCatalogItem(
  supabase: SupabaseClient,
  selector: TeachingCatalogSelector,
): Promise<TeachingCatalogItem> {
  const { items, truncated } = await searchTeachingCatalog(supabase, selector);
  if (truncated) {
    throw new TeachingCatalogResolutionError("More items may match. Choose the exact catalog ID.", items);
  }
  if (items.length === 0) {
    throw new TeachingCatalogResolutionError("No matching assignable item was found.");
  }
  if (items.length === 1 || (selector.kind === "prep_test_section" && selector.any_section)) {
    return items[0];
  }
  throw new TeachingCatalogResolutionError("Multiple items match. Choose the exact catalog ID or section number.", items);
}

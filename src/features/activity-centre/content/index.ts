// Authored Activity content, generated from the item banks in the vault
// (`~/ai-os/brainstorms/2026-08-03-*-bank.md`, which stay the authoring source
// of truth). These JSON files are what the seed migration inserts into
// `public.activities`; the app itself reads Activities from the database, not
// from here. Keeping them typed in the repo means a malformed item fails
// typecheck and the shape test rather than reaching a student.
//
// To regenerate after editing a bank, re-run the vault-side build script and
// commit the resulting JSON plus a new seed migration.

import type { ActivityInstructions, ActivityItem, ItemFormat } from "../api/types";

import conditionalRephrase from "./conditional-rephrase.json";
import dumbItDown from "./dumb-it-down.json";
import findTheConclusion from "./find-the-conclusion.json";
import rebuttalRephrase from "./rebuttal-rephrase.json";

/** An Activity definition as authored, before it exists as a row. */
export interface SeedActivity {
  slug: string;
  title: string;
  subtitle: string;
  item_format: ItemFormat;
  instructions: ActivityInstructions;
  items: ActivityItem[];
}

/**
 * Ordered easiest-first, which is the order they should be worked in and the
 * order the teacher library lists them.
 */
export const SEED_ACTIVITIES: SeedActivity[] = [
  findTheConclusion as SeedActivity,
  conditionalRephrase as SeedActivity,
  rebuttalRephrase as SeedActivity,
  dumbItDown as SeedActivity,
];

export const SEED_ACTIVITY_SLUGS = SEED_ACTIVITIES.map((a) => a.slug);

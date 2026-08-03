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
import spotTheCallback from "./spot-the-callback.json";
import spotTheRelationship from "./spot-the-relationship.json";
import vocabRehab from "./vocab-rehab.json";

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
 * Ordered by the scope of text the skill operates on, word up to passage, which
 * is both the teaching progression and the order the teacher library lists
 * them. Negation Station is not here: it predates this pipeline, its items are
 * authored verbatim, and it is deliberately left alone.
 */
export const SEED_ACTIVITIES: SeedActivity[] = [
  vocabRehab as SeedActivity, // a word
  spotTheRelationship as SeedActivity, // a sentence
  conditionalRephrase as SeedActivity, // a statement, translated
  findTheConclusion as SeedActivity, // an argument
  rebuttalRephrase as SeedActivity, // an argument, restated
  dumbItDown as SeedActivity, // a paragraph
  spotTheCallback as SeedActivity, // a passage
];

export const SEED_ACTIVITY_SLUGS = SEED_ACTIVITIES.map((a) => a.slug);

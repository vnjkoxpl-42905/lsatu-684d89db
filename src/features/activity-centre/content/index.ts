// Authored Activity content, generated from the item banks in the vault
// (`~/ai-os/brainstorms/2026-08-03-*-bank.md`, which stay the authoring source
// of truth). These JSON files are what the seed migration inserts into
// `public.activities`; the app itself reads Activities from the database, not
// from here. Keeping them typed in the repo means a malformed item fails
// typecheck and the shape test rather than reaching a student.
//
// To regenerate after editing a bank, re-run the vault-side build script and
// commit the resulting JSON plus a new seed migration.

import type {
  ActivityInstructions,
  ActivityItem,
  ActivityMode,
  ItemFormat,
  TimeGoalMinutes,
} from "../api/types";

import conditionalRephrase from "./conditional-rephrase.json";
import readRecallColour from "./read-recall-colour.json";
import readRecallColourPt1S3 from "./read-recall-colour-pt1-s3.json";
import readRecallColourPt21S3 from "./read-recall-colour-pt21-s3.json";
import readRecallColourPt102S3 from "./read-recall-colour-pt102-s3.json";
import readRecallColourPt105S2 from "./read-recall-colour-pt105-s2.json";
import readRecallColourPt134S3 from "./read-recall-colour-pt134-s3.json";
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
  /**
   * Section mode only, and absent on every Activity authored before it. A
   * section carries its own clock and names the captured section it came from;
   * the instructions block stays empty in the JSON and is carried from the base
   * Activity at seed time, so the rules are authored once.
   */
  mode?: ActivityMode;
  time_goal_minutes?: TimeGoalMinutes;
  source_section?: string;
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
  // Last, and not because its text is the longest. The order above is the scope
  // of text a skill works on, and this one is a different axis: a stimulus
  // worked from memory rather than analysed on the page. It is also the only
  // `spoken-recall` Activity, so it is the only one ActivityRunner hands to a
  // different player entirely.
  readRecallColour as unknown as SeedActivity,
  // The captured sections. Each is a whole LR section run unbroken against the
  // clock, and they sit after the base Activity because they are the same drill
  // at full scale rather than a different skill. Ordered by PrepTest so the
  // list does not reshuffle when the next one is built.
  readRecallColourPt1S3 as unknown as SeedActivity,
  readRecallColourPt21S3 as unknown as SeedActivity,
  readRecallColourPt102S3 as unknown as SeedActivity,
  readRecallColourPt105S2 as unknown as SeedActivity,
  readRecallColourPt134S3 as unknown as SeedActivity,
];

export const SEED_ACTIVITY_SLUGS = SEED_ACTIVITIES.map((a) => a.slug);

/**
 * The order the Activity library lists every Activity in, teaching progression
 * first: the scope of text the skill operates on, a word up to a passage.
 *
 * This is separate from SEED_ACTIVITIES on purpose. That array is the seed
 * pipeline's input and must stay exactly the Activities the migration
 * inserts. This one is the display order and includes Negation Station, which
 * predates the pipeline but still has to sit somewhere sensible in the list.
 * It goes with the other statement-level work, beside Conditional Rephrase:
 * one turns a statement around, the other negates it.
 *
 * Without this the library sorted by created_at, so it read newest-seeded
 * first and the Activities inserted by one migration tied arbitrarily among
 * themselves. An Activity not named here still appears, after these, so adding
 * one by hand never makes it vanish from the library.
 */
export const ACTIVITY_LIBRARY_ORDER = [
  "vocab-rehab", // a word
  "spot-the-relationship", // a sentence
  "conditional-rephrase", // a statement, translated
  "negation-station", // a statement, negated
  "find-the-conclusion", // an argument
  "rebuttal-rephrase", // an argument, restated
  "dumb-it-down", // a paragraph
  "spot-the-callback", // a passage
  "read-recall-colour", // a stimulus, from memory
  "read-recall-colour-pt1-s3", // a whole section, against the clock
  "read-recall-colour-pt21-s3",
  "read-recall-colour-pt102-s3",
  "read-recall-colour-pt105-s2",
  "read-recall-colour-pt134-s3",
] as const;

/**
 * Where an Activity sits in the library. Anything unlisted sorts after
 * everything listed, rather than jumping to the front on a falsy index.
 */
export function librarySortIndex(slug: string | null | undefined): number {
  const at = ACTIVITY_LIBRARY_ORDER.indexOf(slug as (typeof ACTIVITY_LIBRARY_ORDER)[number]);
  return at === -1 ? ACTIVITY_LIBRARY_ORDER.length : at;
}

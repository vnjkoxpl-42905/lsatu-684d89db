import type { ComponentType, ReactElement } from "react";
import type { ActivityItem, Verdict } from "../api/types";
import "./world-shells.css";

import { AtelierEntrance } from "./atelier/AtelierEntrance";
import { AtelierStage } from "./atelier/AtelierStage";
import { parseArgument, readBuild } from "./atelier/atelier";

import { ChamberEntrance } from "./chamber/ChamberEntrance";
import { ChamberStage } from "./chamber/ChamberStage";
import { parseRebuttal, readResolution } from "./chamber/chamber";

import { LoomEntrance } from "./loom/LoomEntrance";
import { LoomStage } from "./loom/LoomStage";
import { parseCallback, readThrow } from "./loom/loom";

import { ObservatoryEntrance } from "./observatory/ObservatoryEntrance";
import { ObservatoryStage } from "./observatory/ObservatoryStage";
import { matchesCredited, parseSignal, readAnswer } from "./observatory/observatory";

import { PolarityEntrance } from "./polarity/PolarityEntrance";
import { PolarityStage } from "./polarity/PolarityStage";
import { parsePlate, readPush } from "./polarity/polarity";

import { PressEntrance } from "./press/PressEntrance";
import { PressStage } from "./press/PressStage";
import { parsePress, readStroke } from "./press/press";

import { SpecimenLabEntrance } from "./specimen-lab/SpecimenLabEntrance";
import { SpecimenLabStage } from "./specimen-lab/SpecimenLabStage";
import { parseSpecimen, readExamination } from "./specimen-lab/specimen";

import { SwitchyardEntrance } from "./switchyard/SwitchyardEntrance";
import { SwitchyardStage } from "./switchyard/SwitchyardStage";
import { buildPaperDiagramChoices, type PaperDiagramChoice } from "./switchyard/diagramChoices";
import { derivedFlip, diagnose, flipIsDerivable, indicatorOf, judgeConditionalResponse, matchesAnyCredited, parseRouting, PARSER_VERSION } from "./switchyard/routing";

/**
 * Which world belongs to which Activity, and how to drive it from a live run.
 *
 * Eight worlds were built between 2026-08-03 and 2026-08-06, one per Activity,
 * and none of them was ever reachable: the only file that imported them was the
 * dev-only Activity Lab, so every Activity rendered the same generic hero panel.
 * This is the wiring that was missing.
 *
 * What a world replaces is the LEFT column of the running screen, the cover
 * rail. The answer box, the Coach and the verdict loop on the right are
 * untouched: a world is the surface an Activity is worked on, not a different
 * way of working it. The wings (SortingYard, TriggerGallery, Assay, and their
 * kin) are separate mini-rounds and are not part of this path.
 *
 * `render` returns null whenever the item does not parse into the world's
 * domain. The caller then falls back to the generic hero panel, so an Activity
 * whose content drifts away from what its world can read degrades to the plain
 * surface instead of crashing or drawing an empty set.
 *
 * Progress ornaments are fed real per-item verdicts, replayed from the saved
 * attempt log, via `mileposts`. A world that draws none simply ignores the
 * argument; a Stage handed nothing renders nothing rather than faking a run,
 * which stays the honest default for the worlds not yet wired to it.
 */

/**
 * One marker per item in the run. `outcome` is the verdict the student actually
 * earned, or null for items not yet reached: a world never renders progress it
 * cannot trace to a real answer. Replayed from the saved attempt log, so it
 * spans every sitting rather than only the current one.
 */
export interface RunMilepost {
  order: number;
  outcome: Verdict | null;
}

export interface WorldRenderArgs {
  item: ActivityItem;
  /** What the student wrote for this item. Absent before they commit. */
  response?: string;
  /** Whether the run has judged this item yet. Drives the world's phase. */
  answered: boolean;
  /** The answer is visible for study; this never awards credit. */
  revealed?: boolean;
  /**
   * The verdict the item resolved with, once it has. A world that reads the
   * answer for itself still has to defer to this: its reader is a quick
   * pattern match, and a student the Coach marked correct must not be told a
   * relationship is "still undrawn" because they phrased the type differently.
   */
  verdict?: Verdict | null;
  /** Actual items resolved correctly in this run, including restored progress. */
  completedItems?: ActivityItem[];
  /** The whole run's progress. Worlds that draw a rail read it; the rest ignore it. */
  mileposts?: RunMilepost[];
  /** Which milepost is the item on screen. */
  currentOrder?: number;
}

export interface WorldBinding {
  /** Matches the Activity's slug, which is also its normalized title. */
  slug: string;
  label: string;
  /**
   * The scope of text the skill works on, which is also why the library is
   * ordered the way it is: a word, then a sentence, up to a passage.
   */
  scope: string;
  /**
   * One muted hue per world, as an HSL triple. Used sparingly, a dot and an
   * eyebrow, never a fill: the surface stays monochrome editorial and the
   * accent only says which world a card leads into.
   */
  accent: string;
  /**
   * Whether this world shows the item's text as written.
   *
   * Six of the eight do: the plate, the field note, the statement card, the
   * bed and the woven cards all carry the prompt as written, so the answer
   * column repeating it puts the same words on screen twice, side by side. At
   * passage length that is two full paragraphs read twice.
   *
   * The Atelier and the Chamber do not: they take the argument apart, so the
   * panes and the claim cards are a reading of the prompt rather than the
   * prompt. The student still needs the original sentence to answer, and it
   * stays in the answer column for those two.
   */
  carriesPrompt: boolean;
  Entrance: ComponentType<{ onDone: () => void; title?: string }>;
  render: (args: WorldRenderArgs) => ReactElement | null;
  /**
   * A local, authoritative check that the student has written an answer the
   * author already wrote down. True means `correct`, decided without a model
   * call; false is not a claim that the answer is wrong, only that it cannot be
   * settled here and the Coach takes it. A world whose answers have no authored
   * structure omits this and always asks the Coach.
   */
  fastPath?: (item: ActivityItem, response: string) => boolean;
  /** An authoritative deterministic judge. Its presence disables AI judging. */
  localJudge?: (item: ActivityItem, response: string) => { verdict: Verdict; feedback: string };
  /** A paper-first structured answer set. Its presence replaces free text. */
  paperChoices?: (item: ActivityItem) => PaperDiagramChoice[];
  /**
   * What the world's structural classifier WOULD have called this answer.
   * Recorded next to the verdict the Coach actually gave, and never shown or
   * scored: it exists so a future decision to trust the classifier can be made
   * against a real disagreement rate instead of an argument.
   */
  shadowFault?: (item: ActivityItem, response: string) => string | null;
  /** Names the ruleset `shadowFault` used, so a rule change stays attributable. */
  parserVersion?: string;
}

/**
 * What a library card wears above the title: a name, a scope and an accent.
 *
 * Every Activity worked on a surface takes its world's. Read, Recall, Colour
 * has no world by design (ADR 0009) and, at Joshua's call, no themed name
 * either: it asks the student to stop looking at the screen, so inventing a
 * room for it works against the point. It still needs to be told apart in the
 * list, though, so it carries what it actually is instead of a place that does
 * not exist. Without this it is the one unlabelled row among labelled ones,
 * which reads as a bug rather than as a different kind of thing.
 */
export interface CardIdentity {
  label: string;
  scope: string;
  accent: string;
}

/**
 * Read, Recall, Colour wears one identity across every row it owns: the door
 * she picks a section from, and each captured section behind it. One drill, one
 * card, one label.
 *
 * Matched by title prefix rather than listed, because the sections are titled
 * for the section they are ("Read, Recall, Colour \u00b7 PT105 Section 2") and a
 * new one is built roughly whenever the source publishes more recordings. A
 * card left unlabelled reads as a bug rather than as a different kind of thing.
 *
 * The prefix has no trailing hyphen and that is load-bearing. The door is
 * titled plain "Read, Recall, Colour", so `read-recall-colour-` would miss it
 * and leave the one card a student is actually given as the unlabelled row.
 * There used to be a second entry here, keyed on that exact slug, for the base
 * Activity; it was removed with the Activity itself, and it had been holding
 * the door up by accident while telling her the wrong thing about it ("a
 * stimulus, from memory", on a page that starts a whole section).
 */
const SECTION_IDENTITY: CardIdentity = {
  label: "Out Loud",
  scope: "a whole section, against the clock",
  accent: "320 60% 62%",
};

export function cardIdentityFor(title: string | null | undefined): CardIdentity | null {
  const world = worldForTitle(title);
  if (world) return { label: world.label, scope: world.scope, accent: world.accent };
  const slug = slugFromTitle(title ?? "");
  return slug.startsWith("read-recall-colour") ? SECTION_IDENTITY : null;
}

const WORLDS: WorldBinding[] = [
  {
    slug: "negation-station",
    label: "The Polarity Chamber",
    scope: "a statement, negated",
    accent: "275 70% 58%",
    carriesPrompt: true,
    Entrance: PolarityEntrance,
    render: ({ item, response, answered }) => {
      const plate = parsePlate(item);
      if (!plate) return null;
      const reading = answered && response ? readPush(plate, response) : null;
      return <PolarityStage plate={plate} phase={answered ? "inverted" : "statement"} reading={reading} />;
    },
  },
  {
    slug: "vocab-rehab",
    label: "The Specimen Lab",
    scope: "a word",
    accent: "165 38% 34%",
    carriesPrompt: true,
    Entrance: SpecimenLabEntrance,
    render: ({ item, response, answered }) => {
      const specimen = parseSpecimen(item);
      if (!specimen) return null;
      const reading = answered && response ? readExamination(response, specimen) : null;
      return (
        <SpecimenLabStage specimen={specimen} phase={answered ? "read" : "collection"} reading={reading} />
      );
    },
  },
  {
    slug: "spot-the-relationship",
    label: "The Signal Observatory",
    scope: "a sentence",
    accent: "235 48% 56%",
    carriesPrompt: true,
    Entrance: ObservatoryEntrance,
    render: ({ item, response, answered, revealed, verdict, completedItems = [] }) => {
      const signal = parseSignal(item);
      if (!signal) return null;
      // A correct verdict draws the whole figure. The reader only decides what
      // to draw when the answer fell short, which is where it is useful.
      const reading =
        answered && !revealed && response && verdict !== "correct" ? readAnswer(signal, response) : null;
      const seals = { conditional: false, causal: false, comparative: false };
      for (const completed of completedItems) {
        for (const relation of parseSignal(completed)?.relations ?? []) seals[relation.kind] = true;
      }
      if (answered && verdict === "correct") {
        for (const relation of signal.relations) seals[relation.kind] = true;
      }
      return <div className="flex h-full flex-col">{revealed && <p className="px-5 pt-4 text-sm text-[hsl(var(--aw-ink))] md:px-12">Answer shown</p>}<ObservatoryStage signal={signal} phase={answered ? "drawn" : "arrival"} reading={reading} seals={seals} /></div>;
    },
    // Every credited answer here is a structured "type, indicator" list, so an
    // answer that names exactly those types and quotes a credited indicator for
    // each is correct without asking anyone. Anything else goes to the Coach.
    fastPath: (item, response) => matchesCredited(item, response),
  },
  {
    slug: "conditional-rephrase",
    label: "The Switchyard",
    scope: "a statement, translated",
    accent: "36 88% 46%",
    carriesPrompt: true,
    Entrance: SwitchyardEntrance,
    render: ({ item, response, answered, mileposts, currentOrder }) => {
      const credited = item.credited_answers?.[0];
      if (!credited) return null;
      const routing = parseRouting(credited);
      if (!routing) return null;
      const studentRouting = answered && response ? parseRouting(response) : null;
      // Only an item that passed the derivability gate is handed a structure to
      // perform. Everything else gets null and shows the authored plate, which
      // is correct by construction rather than derived and hoped over.
      const derived = flipIsDerivable(item.credited_answers) ? derivedFlip(routing) : null;
      return (
        <SwitchyardStage
          statement={item.prompt}
          routing={routing}
          derived={derived}
          contrapositive={item.credited_answers?.[1] ?? credited}
          indicator={item.explanation ? indicatorOf(item.explanation) : undefined}
          phase={answered ? "routed" : "arrival"}
          studentRouting={studentRouting}
          fault={answered ? diagnose(routing, studentRouting) : null}
          mileposts={mileposts}
          currentOrder={currentOrder}
        />
      );
    },
    fastPath: (item, response) => matchesAnyCredited(item.credited_answers, response),
    localJudge: (item, response) => judgeConditionalResponse(item.credited_answers, response),
    paperChoices: (item) => buildPaperDiagramChoices(item.credited_answers, item.order),
    shadowFault: (item, response) => {
      const credited = item.credited_answers?.[0];
      const routing = credited ? parseRouting(credited) : null;
      if (!routing) return null;
      const fault = diagnose(routing, parseRouting(response));
      return fault ? `${fault.kind}:${fault.side}` : null;
    },
    parserVersion: PARSER_VERSION,
  },
  {
    slug: "find-the-conclusion",
    label: "The Argument Atelier",
    scope: "an argument",
    accent: "40 78% 48%",
    carriesPrompt: false,
    Entrance: AtelierEntrance,
    render: ({ item, response, answered }) => {
      const argument = parseArgument(item);
      if (!argument) return null;
      const build = answered ? readBuild(argument, response) : null;
      return <AtelierStage argument={argument} phase={answered ? "built" : "table"} build={build} />;
    },
  },
  {
    slug: "rebuttal-rephrase",
    label: "The Debate Chamber",
    scope: "an argument, restated",
    accent: "356 48% 46%",
    carriesPrompt: false,
    Entrance: ChamberEntrance,
    render: ({ item, response, answered }) => {
      const rebuttal = parseRebuttal(item);
      if (!rebuttal) return null;
      const resolution = answered && response ? readResolution(rebuttal, response) : null;
      return (
        <ChamberStage
          rebuttal={rebuttal}
          phase={answered ? "resolved" : "unresolved"}
          response={response}
          resolution={resolution}
        />
      );
    },
  },
  {
    slug: "dumb-it-down",
    label: "The Press",
    scope: "a paragraph",
    accent: "14 70% 46%",
    carriesPrompt: true,
    Entrance: PressEntrance,
    render: ({ item, response, answered }) => {
      const press = parsePress(item);
      if (!press) return null;
      const stroke = answered && response ? readStroke(response, press) : null;
      return (
        <PressStage
          press={press}
          phase={answered ? "struck" : "arrival"}
          response={response}
          stroke={stroke}
        />
      );
    },
  },
  {
    slug: "spot-the-callback",
    label: "The Loom",
    scope: "a passage",
    accent: "224 52% 46%",
    carriesPrompt: true,
    Entrance: LoomEntrance,
    render: ({ item, response, answered }) => {
      const callback = parseCallback(item);
      if (!callback) return null;
      const result = answered && response ? readThrow(callback, response) : null;
      return <LoomStage callback={callback} phase={answered ? "thrown" : "call"} result={result} />;
    },
  },
];

const BY_SLUG = new Map(WORLDS.map((w) => [w.slug, w]));

/**
 * An assignment snapshot carries the Activity's title but not its slug, so the
 * slug is derived from the title. Every seeded Activity's title normalizes to
 * exactly its slug ("Spot the Callback" -> "spot-the-callback"), which a test
 * asserts against the seed content so a retitled Activity fails loudly here
 * rather than silently losing its world.
 */
export function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function worldForTitle(title: string | null | undefined): WorldBinding | undefined {
  if (!title) return undefined;
  return BY_SLUG.get(slugFromTitle(title));
}

export const WORLD_BINDINGS = WORLDS;

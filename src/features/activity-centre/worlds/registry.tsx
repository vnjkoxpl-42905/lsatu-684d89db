import type { ComponentType, ReactElement } from "react";
import type { ActivityItem } from "../api/types";

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
import { parseSignal, readAnswer } from "./observatory/observatory";

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
import { diagnose, indicatorOf, parseRouting } from "./switchyard/routing";

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
 * Progress ornaments (chips, plaques, the rail, mileposts) are deliberately
 * omitted. Each Stage documents that omitting them renders nothing rather than
 * faking a run, which is the honest default here; feeding them real per-item
 * verdicts is its own piece of work.
 */

export interface WorldRenderArgs {
  item: ActivityItem;
  /** What the student wrote for this item. Absent before they commit. */
  response?: string;
  /** Whether the run has judged this item yet. Drives the world's phase. */
  answered: boolean;
}

export interface WorldBinding {
  /** Matches the Activity's slug, which is also its normalized title. */
  slug: string;
  label: string;
  Entrance: ComponentType<{ onDone: () => void; title?: string }>;
  render: (args: WorldRenderArgs) => ReactElement | null;
}

const WORLDS: WorldBinding[] = [
  {
    slug: "negation-station",
    label: "The Polarity Chamber",
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
    Entrance: ObservatoryEntrance,
    render: ({ item, response, answered }) => {
      const signal = parseSignal(item);
      if (!signal) return null;
      const reading = answered && response ? readAnswer(signal, response) : null;
      return <ObservatoryStage signal={signal} phase={answered ? "drawn" : "arrival"} reading={reading} />;
    },
  },
  {
    slug: "conditional-rephrase",
    label: "The Switchyard",
    Entrance: SwitchyardEntrance,
    render: ({ item, response, answered }) => {
      const credited = item.credited_answers?.[0];
      if (!credited) return null;
      const routing = parseRouting(credited);
      if (!routing) return null;
      const studentRouting = answered && response ? parseRouting(response) : null;
      return (
        <SwitchyardStage
          statement={item.prompt}
          routing={routing}
          contrapositive={item.credited_answers?.[1] ?? credited}
          indicator={item.explanation ? indicatorOf(item.explanation) : undefined}
          phase={answered ? "routed" : "arrival"}
          studentRouting={studentRouting}
          fault={answered ? diagnose(routing, studentRouting) : null}
        />
      );
    },
  },
  {
    slug: "find-the-conclusion",
    label: "The Argument Atelier",
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

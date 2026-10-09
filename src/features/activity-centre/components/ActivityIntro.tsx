import { ActivityEditorialIntro, type ActivityIntroProps } from "./ActivityEditorialIntro";
import { SectionLaunch } from "./SectionLaunch";
import { DrillEntrance } from "../conditionals/DrillEntrance";

export type { ActivityIntroProps } from "./ActivityEditorialIntro";

/**
 * Extra facts a section's door needs and an Activity's door does not.
 *
 * They are optional because every caller that renders a typed Activity has no
 * assignment-level section to describe, and because `ActivityLab` renders this
 * for content that has never been assigned to anybody.
 */
export interface SectionLaunchExtras {
  timeGoalMinutes?: number | null;
  sourceSection?: string | null;
  studentId?: string | null;
  /**
   * Whether the reader is the person whose runs these are. Defaults to false,
   * so a caller that has not thought about it shows no history rather than the
   * wrong person's.
   */
  showHistory?: boolean;
}

/**
 * The front door of an Activity, which is now two different doors.
 *
 * A section is not a longer Activity, it is a different sitting: twenty-five
 * minutes, out loud, in one take, judged whole. The editorial intro was built
 * for the typed drills and, measured, ran 2778px with its Start button below
 * the fold. `SectionLaunch` is the surface for the section; everything else
 * keeps the page it has always had.
 *
 * This wrapper calls NO hooks, and that is the whole reason it exists rather
 * than being an early return inside the editorial component. That component
 * opens with `useReducedMotion`, a `useRef`, two `useState`s and a `useEffect`;
 * a `mode === "section"` return placed above them would be a conditional hook
 * and would break their order the first time `mode` changed without a remount.
 * Choosing between two child components instead means each child owns its own
 * hooks and React remounts cleanly when the choice changes.
 */
export function ActivityIntro(props: ActivityIntroProps & SectionLaunchExtras) {
  if (props.title === "Conditional Rephrase") {
    return <div className="conditional-general-entrance"><DrillEntrance mode="general" title="General Conditionals" onBack={props.onExit} onStart={props.onStart} questionCount={props.itemCount} startLabel={props.resumeAt && props.resumeAt > 1 ? "Continue practice" : "Start practice"} />
      <details className="conditional-rules-review"><summary>Review conditional rules and examples</summary><div className="conditional-rules-paper"><ActivityEditorialIntro {...props} /></div></details>
    </div>;
  }
  if (props.mode === "section") {
    return (
      <SectionLaunch
        title={props.title}
        subtitle={props.subtitle}
        instructions={props.instructions}
        itemCount={props.itemCount}
        timeGoalMinutes={props.timeGoalMinutes}
        sourceSection={props.sourceSection}
        studentId={props.studentId}
        showHistory={props.showHistory}
        onStart={props.onStart}
        onExit={props.onExit}
      />
    );
  }
  return <ActivityEditorialIntro {...props} />;
}

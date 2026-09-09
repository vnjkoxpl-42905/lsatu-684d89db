import type { ReactNode } from "react";
import type { ActivityInstructions } from "../api/types";
import { SectionLaunchFrame } from "./SectionLaunchFrame";
import "./section-launch.css";

export interface SectionLibraryLaunchProps {
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  /** The list itself, which owns the sections and the starting. */
  children: ReactNode;
  onExit?: () => void;
}

/**
 * The door to Read, Recall, Colour: the method, and the sections it is run on.
 *
 * One drill, and every section reachable from the page that explains it. Before
 * this there were three screens between her and a run — an editorial intro
 * written for the typed Activities, a bare list, and then the section's own
 * page — and only the last of them was designed for this drill.
 *
 * It carries no stat strip, and that is a refusal rather than an omission.
 * Trend and Target are per section: sections differ in length and in the clock
 * they are run against, so "−6:52 across 3 runs" spanning two different
 * sections would be a number about nothing. Each section row carries its own
 * attempts instead, and the four numbers appear on the section's own page,
 * where they mean something.
 */
export function SectionLibraryLaunch({
  title,
  subtitle,
  instructions,
  children,
  onExit,
}: SectionLibraryLaunchProps) {
  return (
    <SectionLaunchFrame
      title={title}
      subtitle={subtitle}
      instructions={instructions}
      onExit={onExit}
      showBreadcrumbs={false}
      sectionsFirst
    >
      <div className="sl-runs">
        <div>
          <span className="sl-label">Your sections</span>
          <div style={{ marginTop: 12 }}>{children}</div>
        </div>

        <aside className="sl-aside">
          <span className="sl-label">Before you start</span>
          <p>
            Read each piece silently. Then look away and say it back in your own
            words. Give your reaction out loud too. After the final piece,
            recall the whole argument out loud from memory. Your entire section
            is recorded in <strong>one take</strong>. You can pause: the text
            hides and the clock stops while you are away, and you cannot go back
            to a stimulus.
          </p>
          <p>
            Every completed attempt stays here. If you run a section again, it
            is saved as a new attempt. Your earlier attempts are never replaced.
          </p>
        </aside>
      </div>
    </SectionLaunchFrame>
  );
}

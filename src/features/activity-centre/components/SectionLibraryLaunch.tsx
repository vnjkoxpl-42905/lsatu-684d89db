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
      meta="Pick a section · aim for three in a row"
    >
      <div className="sl-runs">
        <div>
          <span className="sl-label">Your sections</span>
          <div style={{ marginTop: 12 }}>{children}</div>
        </div>

        <aside className="sl-aside">
          <span className="sl-label">Before you start</span>
          <p>
            Read silently. Say each retelling, reaction, and final recall out
            loud. The whole section records in <strong>one take</strong> and
            never pauses.
          </p>
          <p>
            Every completed attempt stays here. Running a section again creates
            a new attempt and never replaces an earlier one.
          </p>
        </aside>
      </div>
    </SectionLaunchFrame>
  );
}

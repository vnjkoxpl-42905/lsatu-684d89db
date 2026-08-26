"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, BookOpen, Layers, Search, ScrollText } from "lucide-react";
import { PracticeTile, SecondaryLink } from "@/components/mainhub/PracticeInsightStage";
import { RcSessionHistory } from "@/features/rc/components/RcSessionHistory";
import "@/features/rc/rc.css";

/**
 * The RC section's practice bay — the peer of `PracticeInsightStage`, and
 * deliberately the same shape: a tool row, secondary links, then live status
 * underneath. A student who has learned the LR side of the switch already
 * knows how to read this one.
 *
 * The builder itself is not here. It opens as a launcher stage the way Build a
 * Set does on the LR side, so the dense two-column hand-pick table gets the
 * full canvas instead of the ~600px bay.
 */
export default function RcPracticeStage({
  onOpenAnalytics,
  onOpenLauncher,
  canOpenAnalytics,
  canOpenJournal,
}: {
  /* Goes through the hub's own handler, which writes the active section into
     the URL alongside the stage. Hand-writing the analytics link here dropped
     `section=rc`, so a student who arrived by deep link came back from
     analytics into LR. */
  onOpenAnalytics: (tab?: string) => void;
  onOpenLauncher: (kind: "full-section" | "type-drill") => void;
  canOpenAnalytics: boolean;
  canOpenJournal: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="drill-observatory-practice relative flex flex-col overflow-hidden">
      <div>
        <p className="drill-observatory-label drill-observatory-ink-42 mb-4">
          Reading tools
        </p>
        <div className="drill-observatory-practice-tools">
          <PracticeTile
            icon={Layers}
            title="Full Section"
            description="Sit the four passages of one real section."
            onClick={() => onOpenLauncher("full-section")}
          />
          <PracticeTile
            icon={ScrollText}
            title="Build a reading drill"
            description="Choose passages by topic, format, and difficulty."
            onClick={() => onOpenLauncher("type-drill")}
          />
          <PracticeTile
            icon={Search}
            title="Search passages"
            description="Find a passage or a question by what it says."
            onClick={() => navigate("/rc/search")}
          />
        </div>
        <div className="mt-[18px] flex flex-wrap gap-2">
          {canOpenAnalytics && (
            <SecondaryLink
              icon={BarChart3}
              label="Analytics"
              onClick={() => onOpenAnalytics("overview")}
            />
          )}
          {canOpenJournal && (
            <SecondaryLink icon={BookOpen} label="Journal" onClick={() => navigate("/journal")} />
          )}
        </div>
      </div>

      {/* Live status, in the slot the LR side gives the rotating insight
          preview. RC analytics do not exist yet (see the spec's Phase C), and a
          placeholder chart would be a claim the data cannot back. */}
      <div className="drill-observatory-insight-section relative">
        <div className="mb-3.5 flex items-center justify-between">
          <p className="drill-observatory-label drill-observatory-ink-42">Your reading drills</p>
        </div>
        <RcSessionHistory tone="dark" />
      </div>
    </div>
  );
}

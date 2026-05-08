"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const ORBIT_RADIUS = 200;
const ORBIT_DIAMETER = ORBIT_RADIUS * 2;

export interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
  variant?: "stat" | "finder";
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
  onActivate?: (id: number) => void;
  renderExpandedContent?: (
    item: TimelineItem,
    close: () => void,
  ) => React.ReactNode;
}

export default function RadialOrbitalTimeline({
  timelineData,
  onActivate,
  renderExpandedContent,
}: RadialOrbitalTimelineProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const isPaused = expandedId !== null;

  const nodePositions = useMemo(() => {
    const total = timelineData.length;
    return timelineData.map((_, index) => {
      const angle = (index / total) * 360;
      const radian = (angle * Math.PI) / 180;
      const x = ORBIT_RADIUS * Math.cos(radian);
      const y = ORBIT_RADIUS * Math.sin(radian);
      return { x, y };
    });
  }, [timelineData]);

  const close = () => setExpandedId(null);

  return (
    <div className="relative w-full h-[520px] flex items-center justify-center overflow-visible select-none">
      {/* Orbit wrapper — spins via CSS animation */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: ORBIT_DIAMETER,
          height: ORBIT_DIAMETER,
          animationName: "foyer-orbit-spin",
          animationDuration: "22s",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {/* Center sphere */}
        <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/15 flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="absolute inset-2 rounded-full bg-white/5 animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-white/25" />
        </div>

        {/* Orbit ring */}
        <div
          className="absolute rounded-full border border-white/15 shadow-[0_0_60px_rgba(232,208,139,0.07)]"
          style={{ width: ORBIT_DIAMETER, height: ORBIT_DIAMETER }}
        />

        {timelineData.map((item, index) => {
          const { x, y } = nodePositions[index];
          const isExpanded = expandedId === item.id;
          const isFinderNode = item.variant === "finder";
          const Icon = item.icon;

          const handleClick = () => {
            if (isFinderNode) {
              setExpandedId(isExpanded ? null : item.id);
            } else {
              onActivate?.(item.id);
            }
          };

          return (
            <div
              key={item.id}
              className="absolute"
              style={{ transform: `translate(${x}px, ${y}px)`, zIndex: isExpanded ? 200 : 10 }}
            >
              {/* Counter-rotation wrapper keeps content upright while the orbit spins */}
              <div
                style={{
                  animationName: "foyer-orbit-counter",
                  animationDuration: "22s",
                  animationTimingFunction: "linear",
                  animationIterationCount: "infinite",
                  animationPlayState: isPaused ? "paused" : "running",
                }}
              >
                <button
                  type="button"
                  aria-label={item.title}
                  aria-expanded={isFinderNode ? isExpanded : undefined}
                  onClick={handleClick}
                  className={cn(
                    "relative flex flex-col items-center gap-2 group",
                    "focus-visible:outline-none",
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-200",
                      isExpanded
                        ? "bg-[#E8D08B] text-[#05070A] border-[#E8D08B] shadow-[0_0_32px_-2px_rgba(232,208,139,0.36)]"
                        : "bg-[#1A1E2B] text-[#CBD5E1] border-white/10 hover:border-[#E8D08B]/40 hover:text-[#E8D08B]",
                      "focus-visible:ring-2 focus-visible:ring-[#E8D08B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070A]",
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <span
                    className={cn(
                      "whitespace-nowrap text-xs font-semibold tracking-[0.18em] uppercase transition-colors duration-200",
                      isExpanded ? "text-[#E8D08B]" : "text-[#94A3B8] group-hover:text-[#CBD5E1]",
                    )}
                  >
                    {item.title}
                  </span>

                  {isExpanded && (() => {
                    const custom = renderExpandedContent?.(item, close);
                    if (!custom) return null;
                    return (
                      <div
                        className="absolute top-20 left-1/2 -translate-x-1/2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {custom}
                      </div>
                    );
                  })()}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

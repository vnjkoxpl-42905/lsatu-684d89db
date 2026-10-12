"use client";
import { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { Zap, Link as LinkIcon, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ORBIT_RADIUS = 200;
const RING_DIAMETER = ORBIT_RADIUS * 2;
const ROTATION_SPEED_DEG_PER_SEC = 6; // full revolution every 60s
// Cap per-frame dt so a backgrounded tab (rAF paused) doesn't dump a
// multi-second jump on resume — clamp to ~50ms (one prior interval tick).
const MAX_FRAME_DT_SEC = 0.05;

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
  variant?: string;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
  onActivate?: (nodeId: number | null) => void;
  renderExpandedContent?: (item: TimelineItem, close: () => void) => React.ReactNode;
}

export default function RadialOrbitalTimeline({
  timelineData,
  onActivate,
  renderExpandedContent,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const orbitRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  // Pause the rotation loop when the ring is scrolled off-screen so it doesn't
  // burn a 60fps rAF + per-frame React render forever (matters on the public
  // /auth landing; a no-op on the mainhub where the ring is always in view).
  const [inView, setInView] = useState(true);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    return getRelatedItems(activeNodeId).includes(itemId);
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState: Record<number, boolean> = {};
      Object.keys(prev).forEach((key) => {
        newState[parseInt(key)] = false;
      });
      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);
        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);
        onActivate?.(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
        onActivate?.(null);
      }
      return newState;
    });
  };

  // Pause rotation when the ring leaves the viewport (off-screen rAF + render
  // is wasted work). Defaults to running if IntersectionObserver is unavailable.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Frame-paced rotation loop. rAF auto-pauses on hidden tabs and resumes
  // cleanly without state queuing (a previous setInterval(50ms) approach
  // queued ticks under throttling and burst-applied them on focus return).
  useEffect(() => {
    if (!autoRotate || reducedMotion || !inView) return;
    let rafId = 0;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, MAX_FRAME_DT_SEC);
      lastTime = now;
      setRotationAngle((prev) => (prev + dt * ROTATION_SPEED_DEG_PER_SEC) % 360);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoRotate, reducedMotion, inView]);

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radian = (angle * Math.PI) / 180;
    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2);
    return { angle, zIndex, opacity };
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-black bg-white border-black";
      case "in-progress":
        return "text-black bg-black/5 border-black/70";
      case "pending":
        return "text-black/70 bg-white/60 border-black/40";
      default:
        return "text-black bg-white/60 border-black/50";
    }
  };

  return (
    <div
      className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-transparent overflow-visible"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full"
          ref={orbitRef}
          style={{ perspective: "1000px" }}
        >
          {/* Center orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-teal-400 animate-pulse flex items-center justify-center z-10">
            <div className="absolute w-20 h-20 rounded-full border border-black/20 animate-ping opacity-70" />
            <div className="absolute w-24 h-24 rounded-full border border-black/10" />
            <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-md" />
          </div>

          {/* Orbit ring — sized from ORBIT_RADIUS so the visual ring and node
              translateX can never drift apart. */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/20"
            style={{ width: RING_DIAMETER, height: RING_DIAMETER }}
          />

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(-50%, -50%) rotate(${position.angle}deg) translateX(${ORBIT_RADIUS}px) rotate(-${position.angle}deg)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                className="absolute top-1/2 left-1/2 cursor-pointer will-change-transform"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {isPulsing && (
                  <div className="absolute inset-0 -m-2 rounded-full border border-black/30 animate-ping" />
                )}

                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                    isExpanded
                      ? "bg-black text-white border-black ring-2 ring-black/30"
                      : isRelated
                      ? "bg-black/10 text-black border-black/60"
                      : "bg-white/80 text-black border-black/30"
                  }`}
                >
                  <Icon size={18} />
                </div>

                <div
                  className={`absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tracking-wider transition-colors duration-300 ${
                    isExpanded ? "text-black" : "text-black/70"
                  }`}
                >
                  {item.title}
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* Expanded overlay — hoisted out of the clipped orbital wrapper to a
          fixed-position spotlight with a dimmed backdrop. Backdrop click
          collapses the active node; the active node itself remains visible
          above the dim via z-index: 200. */}
      {(() => {
        const activeItem = activeNodeId
          ? timelineData.find((i) => i.id === activeNodeId)
          : null;
        if (!activeItem) return null;

        const knownRelatedIds = activeItem.relatedIds.filter((rid) =>
          timelineData.some((i) => i.id === rid),
        );

        return (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
              onClick={() => toggleItem(activeItem.id)}
              aria-hidden
            />

            {renderExpandedContent ? (
              <div
                className="fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-4rem)] overflow-auto rounded-2xl border border-black/[0.08] bg-white shadow-2xl p-4"
                onClick={(e) => e.stopPropagation()}
              >
                {renderExpandedContent(activeItem, () => toggleItem(activeItem.id))}
              </div>
            ) : (
              <div
                className="fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 w-72 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-4rem)] overflow-auto bg-white/95 backdrop-blur-lg border border-black/20 rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`px-2 text-[10px] tracking-wider ${getStatusStyles(activeItem.status)}`}
                  >
                    {activeItem.status === "completed"
                      ? "COMPLETE"
                      : activeItem.status === "in-progress"
                      ? "IN PROGRESS"
                      : "PENDING"}
                  </Badge>
                  <span className="text-[10px] text-black/60 font-mono">{activeItem.date}</span>
                </div>
                <div className="px-4 pt-2 pb-1 text-sm font-semibold text-black">{activeItem.title}</div>
                <div className="px-4 pb-3 text-xs text-black/70 leading-relaxed">{activeItem.content}</div>
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between text-[10px] text-black/60 mb-1">
                    <span className="flex items-center gap-1">
                      <Zap size={10} />
                      Energy Level
                    </span>
                    <span className="font-mono">{activeItem.energy}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-400 to-teal-300"
                      style={{ width: `${activeItem.energy}%` }}
                    />
                  </div>
                </div>
                {knownRelatedIds.length > 0 && (
                  <div className="px-4 py-3 border-t border-black/10">
                    <div className="flex items-center gap-1 text-[10px] text-black/60 mb-2">
                      <LinkIcon size={10} />
                      <span>Connected Nodes</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {knownRelatedIds.map((relatedId) => {
                        const relatedItem = timelineData.find((i) => i.id === relatedId);
                        return (
                          <button
                            key={relatedId}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItem(relatedId);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border border-black/20 text-black/80 hover:bg-black/10 transition-colors"
                          >
                            {relatedItem?.title}
                            <ArrowRight size={8} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

"use client";
import { useState, useEffect, useRef } from "react";
import { Zap, Link as LinkIcon, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ORBIT_RADIUS = 200;

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
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  const centerViewOnNode = (nodeId: number) => {
    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;
    setRotationAngle(270 - targetAngle);
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

  useEffect(() => {
    let rotationTimer: ReturnType<typeof setInterval> | undefined;
    if (autoRotate) {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => Number(((prev + 0.3) % 360).toFixed(3)));
      }, 50);
    }
    return () => {
      if (rotationTimer) clearInterval(rotationTimer);
    };
  }, [autoRotate]);

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radian = (angle * Math.PI) / 180;
    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2)));
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
      className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-transparent overflow-hidden"
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
            <div className="absolute w-24 h-24 rounded-full border border-black/10" style={{ animationDuration: "3s" }} />
            <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-md" />
          </div>

          {/* Orbit ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-black/20" />

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
                ref={(el) => {
                  nodeRefs.current[item.id] = el;
                }}
                className="absolute top-1/2 left-1/2 transition-all duration-700 cursor-pointer"
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

          {/* Expanded card — fixed slot below the ring, never attached to a node */}
          {(() => {
            const activeItem = activeNodeId
              ? timelineData.find((i) => i.id === activeNodeId)
              : null;
            if (!activeItem) return null;

            if (renderExpandedContent) {
              return (
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-[300px] rounded-xl border border-black/15 bg-white/95 backdrop-blur shadow-xl p-3"
                  style={{ top: "calc(50% + 220px)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderExpandedContent(activeItem, () => toggleItem(activeItem.id))}
                </div>
              );
            }

            return (
              <div
                className="absolute left-1/2 -translate-x-1/2 w-72 bg-white/95 backdrop-blur-lg border border-black/20 rounded-lg shadow-xl shadow-black/10 overflow-visible"
                style={{ top: "calc(50% + 220px)" }}
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
                {activeItem.relatedIds.length > 0 && (
                  <div className="px-4 py-3 border-t border-black/10">
                    <div className="flex items-center gap-1 text-[10px] text-black/60 mb-2">
                      <LinkIcon size={10} />
                      <span>Connected Nodes</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activeItem.relatedIds.map((relatedId) => {
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
            );
          })()}
        </div>
      </div>
    </div>
  );
}

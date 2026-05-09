"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link as LinkIcon, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const getRelatedItems = (itemId: number) =>
    timelineData.find((item) => item.id === itemId)?.relatedIds ?? [];

  const isRelatedToActive = (itemId: number) =>
    activeNodeId ? getRelatedItems(activeNodeId).includes(itemId) : false;

  const centerViewOnNode = (nodeId: number) => {
    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    if (nodeIndex === -1) return;
    const total = timelineData.length;
    const targetAngle = (nodeIndex / total) * 360;
    setRotationAngle(270 - targetAngle);
  };

  const expandNode = (id: number) => {
    setExpandedItems((prev) => {
      const next: Record<number, boolean> = {};
      Object.keys(prev).forEach((key) => {
        const k = parseInt(key);
        if (k !== id) next[k] = false;
      });
      next[id] = !prev[id];
      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);
        const related = getRelatedItems(id);
        const newPulse: Record<number, boolean> = {};
        related.forEach((relId) => {
          newPulse[relId] = true;
        });
        setPulseEffect(newPulse);
        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }
      return next;
    });
  };

  useEffect(() => {
    if (!autoRotate) return;
    const timer = setInterval(() => {
      setRotationAngle((prev) => Number(((prev + 0.3) % 360).toFixed(3)));
    }, 50);
    return () => clearInterval(timer);
  }, [autoRotate]);

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radian = (angle * Math.PI) / 180;
    return {
      x: ORBIT_RADIUS * Math.cos(radian),
      y: ORBIT_RADIUS * Math.sin(radian),
      angle,
      zIndex: Math.round(100 + 50 * Math.cos(radian)),
      opacity: Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))),
    };
  };

  const getStatusStyles = (status: TimelineItem["status"]) => {
    switch (status) {
      case "completed":
        return "text-white bg-black border-white";
      case "in-progress":
        return "text-black bg-white border-black";
      default:
        return "text-white bg-black/40 border-white/50";
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="relative w-full h-[520px] flex items-center justify-center overflow-visible select-none"
    >
      <div
        ref={orbitRef}
        className="relative w-full h-full flex items-center justify-center"
        style={{ perspective: "1000px" }}
      >
        {/* Center core */}
        <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/15 flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="absolute inset-2 rounded-full bg-white/5 animate-pulse" />
          <div className="absolute w-20 h-20 rounded-full border border-white/20 animate-ping opacity-70" />
          <div
            className="absolute w-24 h-24 rounded-full border border-white/10 animate-ping opacity-50"
            style={{ animationDelay: "0.5s" }}
          />
          <div className="w-3 h-3 rounded-full bg-white/25" />
        </div>

        {/* Orbit ring */}
        <div
          className="absolute rounded-full border border-white/15 shadow-[0_0_60px_rgba(232,208,139,0.07)]"
          style={{ width: ORBIT_RADIUS * 2, height: ORBIT_RADIUS * 2 }}
        />

        {/* Nodes */}
        {timelineData.map((item, index) => {
          const position = calculateNodePosition(index, timelineData.length);
          const isExpanded = !!expandedItems[item.id];
          const isRelated = isRelatedToActive(item.id);
          const isPulsing = !!pulseEffect[item.id];
          const isFinderNode = item.variant === "finder";
          const Icon = item.icon;

          const handleNodeClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (isFinderNode) {
              expandNode(item.id);
              return;
            }
            if (onActivate) {
              onActivate(item.id);
              return;
            }
            expandNode(item.id);
          };

          return (
            <div
              key={item.id}
              ref={(el) => (nodeRefs.current[item.id] = el)}
              className="absolute transition-all duration-700 cursor-pointer"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                zIndex: isExpanded ? 200 : position.zIndex,
                opacity: isExpanded ? 1 : position.opacity,
              }}
              onClick={handleNodeClick}
            >
              {/* Energy glow */}
              <div
                className={cn(
                  "absolute rounded-full -inset-1",
                  isPulsing && "animate-pulse",
                )}
                style={{
                  background:
                    "radial-gradient(circle, rgba(232,208,139,0.22) 0%, rgba(232,208,139,0) 70%)",
                  width: `${item.energy * 0.5 + 40}px`,
                  height: `${item.energy * 0.5 + 40}px`,
                  left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                  top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                }}
              />

              {/* Node icon */}
              <button
                type="button"
                aria-label={item.title}
                aria-expanded={isFinderNode ? isExpanded : undefined}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 transform",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8D08B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070A]",
                  isExpanded
                    ? "bg-[#E8D08B] text-[#05070A] border-[#E8D08B] shadow-[0_0_32px_-2px_rgba(232,208,139,0.36)] scale-150"
                    : isRelated
                      ? "bg-[#E8D08B]/40 text-[#05070A] border-[#E8D08B] animate-pulse"
                      : "bg-[#1A1E2B] text-[#CBD5E1] border-white/15 hover:border-[#E8D08B]/40 hover:text-[#E8D08B]",
                )}
              >
                <Icon className="w-5 h-5" />
              </button>

              {/* Label */}
              <div
                className={cn(
                  "absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tracking-[0.18em] uppercase transition-all duration-300",
                  isExpanded ? "text-[#E8D08B] scale-110" : "text-[#94A3B8]",
                )}
              >
                {item.title}
              </div>

              {/* Expanded content */}
              {isExpanded && (() => {
                const custom = renderExpandedContent?.(item, () => expandNode(item.id));
                if (custom) {
                  return (
                    <div
                      className="absolute top-20 left-1/2 -translate-x-1/2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {custom}
                    </div>
                  );
                }
                return (
                  <Card
                    className="absolute top-20 left-1/2 -translate-x-1/2 w-64 bg-black/90 backdrop-blur-lg border-white/30 shadow-xl shadow-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-white/50" />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge className={cn("px-2 text-xs", getStatusStyles(item.status))}>
                          {item.status === "completed"
                            ? "COMPLETE"
                            : item.status === "in-progress"
                              ? "IN PROGRESS"
                              : "PENDING"}
                        </Badge>
                        <span className="text-xs font-mono text-white/50">{item.date}</span>
                      </div>
                      <CardTitle className="text-sm mt-2 text-white">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-white/80">
                      <p>{item.content}</p>
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="flex items-center">
                            <Zap size={10} className="mr-1" />
                            Energy Level
                          </span>
                          <span className="font-mono">{item.energy}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#E8D08B] to-[#B8941F]"
                            style={{ width: `${item.energy}%` }}
                          />
                        </div>
                      </div>
                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center mb-2">
                            <LinkIcon size={10} className="text-white/70 mr-1" />
                            <h4 className="text-xs uppercase tracking-wider font-medium text-white/70">
                              Connected Nodes
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relatedId) => {
                              const rel = timelineData.find((i) => i.id === relatedId);
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center h-6 px-2 py-0 text-xs rounded-none border-white/20 bg-transparent hover:bg-white/10 text-white/80 hover:text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    expandNode(relatedId);
                                  }}
                                >
                                  {rel?.title}
                                  <ArrowRight size={8} className="ml-1 text-white/60" />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

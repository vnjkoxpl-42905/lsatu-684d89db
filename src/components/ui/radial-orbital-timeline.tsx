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
        return "text-black bg-white/95 border-white/95";
      case "in-progress":
        return "text-black bg-white/70 border-white/70";
      default:
        return "text-white/60 bg-white/10 border-white/20";
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="relative w-full h-[520px] flex items-center justify-center overflow-hidden select-none bg-black rounded-2xl"
    >
      <div
        ref={orbitRef}
        className="relative w-full h-full flex items-center justify-center"
        style={{ perspective: "1000px" }}
      >
        {/* Center core — glass orb refracting black */}
        <div
          className="absolute w-16 h-16 rounded-full flex items-center justify-center z-10 border"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), rgba(255,255,255,0.03))",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderColor: "rgba(255,255,255,0.18)",
            boxShadow:
              "inset 0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.08)",
          }}
        >
          <div className="absolute w-20 h-20 rounded-full border border-white/15 animate-ping opacity-70" />
          <div
            className="absolute w-24 h-24 rounded-full border border-white/8 animate-ping opacity-50"
            style={{ animationDelay: "0.5s" }}
          />
          <div className="w-2 h-2 rounded-full bg-white/80" />
        </div>

        {/* Orbit ring — nearly invisible until you focus */}
        <div
          className="absolute rounded-full border"
          style={{
            width: ORBIT_RADIUS * 2,
            height: ORBIT_RADIUS * 2,
            borderColor: "rgba(255,255,255,0.06)",
          }}
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
              {/* Energy aura — soft white falloff */}
              <div
                className={cn(
                  "absolute rounded-full -inset-1 pointer-events-none",
                  isPulsing && "animate-pulse",
                )}
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
                  width: `${item.energy * 0.5 + 40}px`,
                  height: `${item.energy * 0.5 + 40}px`,
                  left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                  top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                }}
              />

              {/* Node icon — glass chip */}
              <button
                type="button"
                aria-label={item.title}
                aria-expanded={isFinderNode ? isExpanded : undefined}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 transform",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  isExpanded
                    ? "scale-150"
                    : isRelated
                      ? "animate-pulse"
                      : "",
                )}
                style={
                  isExpanded
                    ? {
                        backgroundColor: "rgba(255,255,255,0.95)",
                        borderColor: "rgba(255,255,255,0.95)",
                        color: "#000",
                        boxShadow:
                          "0 0 32px rgba(255,255,255,0.4), 0 0 64px rgba(255,255,255,0.18)",
                      }
                    : isRelated
                      ? {
                          backgroundColor: "rgba(255,255,255,0.3)",
                          borderColor: "rgba(255,255,255,0.4)",
                          color: "#fff",
                        }
                      : {
                          backgroundColor: "rgba(255,255,255,0.08)",
                          borderColor: "rgba(255,255,255,0.18)",
                          color: "rgba(255,255,255,0.9)",
                          backdropFilter: "blur(8px) saturate(180%)",
                          WebkitBackdropFilter: "blur(8px) saturate(180%)",
                        }
                }
              >
                <Icon className="w-5 h-5" />
              </button>

              {/* Label */}
              <div
                className={cn(
                  "absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tracking-[0.18em] uppercase transition-all duration-300",
                  isExpanded ? "text-white/90 scale-110" : "text-white/40",
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
                    className="absolute top-20 left-1/2 -translate-x-1/2 w-64"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(40px) saturate(180%)",
                      WebkitBackdropFilter: "blur(40px) saturate(180%)",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderWidth: "1px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3"
                      style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                    />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge className={cn("px-2 text-xs", getStatusStyles(item.status))}>
                          {item.status === "completed"
                            ? "COMPLETE"
                            : item.status === "in-progress"
                              ? "IN PROGRESS"
                              : "PENDING"}
                        </Badge>
                        <span className="text-xs font-mono text-white/40">{item.date}</span>
                      </div>
                      <CardTitle className="text-sm mt-2 text-white/90">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-white/60">
                      <p>{item.content}</p>
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-xs mb-1 text-white/40">
                          <span className="flex items-center">
                            <Zap size={10} className="mr-1" />
                            Energy Level
                          </span>
                          <span className="font-mono">{item.energy}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-white/70 to-white/20"
                            style={{ width: `${item.energy}%` }}
                          />
                        </div>
                      </div>
                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center mb-2">
                            <LinkIcon size={10} className="text-white/40 mr-1" />
                            <h4 className="text-xs uppercase tracking-wider font-medium text-white/40">
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
                                  className="flex items-center h-6 px-2 py-0 text-xs rounded-none border-white/15 bg-transparent hover:bg-white/10 text-white/60 hover:text-white/90"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    expandNode(relatedId);
                                  }}
                                >
                                  {rel?.title}
                                  <ArrowRight size={8} className="ml-1 text-white/40" />
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

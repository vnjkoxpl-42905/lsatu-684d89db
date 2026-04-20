"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link as LinkIcon, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
  onActivate?: (id: number) => void;
}

export default function RadialOrbitalTimeline({
  timelineData,
  onActivate,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
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
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
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
        const newPulse: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulse[relId] = true;
        });
        setPulseEffect(newPulse);
        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
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
    const radius = 200;
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);
    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2)));
    return { x, y, angle, zIndex, opacity };
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-primary-foreground bg-primary border-primary";
      case "in-progress":
        return "text-foreground bg-background border-foreground";
      case "pending":
        return "text-foreground bg-muted border-border";
      default:
        return "text-foreground bg-muted border-border";
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
        className="relative w-[480px] h-[480px] flex items-center justify-center"
        style={{ perspective: "1000px" }}
      >
        {/* Center sphere — cool glass */}
        <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-border/50 via-border/25 to-transparent border border-border/40 flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="absolute inset-2 rounded-full bg-foreground/5 animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-foreground/40" />
        </div>

        {/* Orbit ring — Apple-like layered depth, razor thin */}
        <div className="absolute w-[420px] h-[420px] rounded-full border border-border/30 backdrop-blur-sm shadow-[0_0_60px_rgba(255,255,255,0.08)]" />
        <div className="absolute w-[400px] h-[400px] rounded-full border border-border/60" />
        <div className="absolute w-[400px] h-[400px] rounded-full border border-dashed border-border/25" />
        <div className="absolute w-[384px] h-[384px] rounded-full border border-border/35" />

        {timelineData.map((item, index) => {
          const position = calculateNodePosition(index, timelineData.length);
          const isExpanded = !!expandedItems[item.id];
          const isRelated = isRelatedToActive(item.id);
          const isPulsing = !!pulseEffect[item.id];
          const Icon = item.icon;

          const nodeStyle: React.CSSProperties = {
            transform: `translate(${position.x}px, ${position.y}px)`,
            zIndex: isExpanded ? 200 : position.zIndex,
            opacity: isExpanded ? 1 : position.opacity,
          };

          return (
            <div
              key={item.id}
              ref={(el) => (nodeRefs.current[item.id] = el)}
              className="absolute transition-all duration-700 cursor-pointer"
              style={nodeStyle}
              onClick={(e) => {
                e.stopPropagation();
                toggleItem(item.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onActivate?.(item.id);
              }}
            >
              {/* Pulse halo */}
              {isPulsing && (
                <div className="absolute -inset-2 rounded-full bg-primary/20 animate-ping" />
              )}

              <div
                className={cn(
                  "relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                  isExpanded
                    ? "bg-primary text-primary-foreground border-primary scale-110 shadow-[0_0_24px_hsl(var(--primary)/0.5)]"
                    : isRelated
                    ? "bg-primary/30 text-foreground border-primary/60"
                    : "bg-foreground text-background border-border hover:scale-105"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div
                className={cn(
                  "absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tracking-[0.18em] uppercase transition-colors",
                  isExpanded ? "text-foreground" : "text-foreground/70"
                )}
              >
                {item.title}
              </div>

              {isExpanded && (
                <Card
                  className="absolute top-24 left-1/2 -translate-x-1/2 w-72 bg-background/90 backdrop-blur-md border-border shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-border" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-1">
                      <Badge
                        className={cn("text-[10px] px-2 py-0.5", getStatusStyles(item.status))}
                      >
                        {item.status === "completed"
                          ? "COMPLETE"
                          : item.status === "in-progress"
                          ? "IN PROGRESS"
                          : "PENDING"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{item.content}</p>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Zap className="w-3 h-3" /> Energy
                        </span>
                        <span className="font-mono text-foreground">{item.energy}%</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${item.energy}%` }}
                        />
                      </div>
                    </div>

                    {item.relatedIds.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-border">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
                          <LinkIcon className="w-3 h-3" />
                          <span>Connected</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.relatedIds.map((relatedId) => {
                            const relatedItem = timelineData.find((i) => i.id === relatedId);
                            return (
                              <Button
                                key={relatedId}
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] px-2 gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleItem(relatedId);
                                }}
                              >
                                {relatedItem?.title}
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {onActivate && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          onActivate(item.id);
                        }}
                      >
                        Open
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

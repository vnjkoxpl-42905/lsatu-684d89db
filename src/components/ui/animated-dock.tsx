"use client";

import * as React from "react";
import { useRef } from "react";
import {
  type MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface AnimatedDockProps {
  className?: string;
  items: DockItemData[];
}

export interface DockItemData {
  link?: string;
  onClick?: () => void;
  Icon: React.ReactNode;
  label?: string;
  target?: string;
  badge?: number | boolean;
}

export const AnimatedDock = ({ className, items }: AnimatedDockProps) => {
  const mouseX = useMotionValue(Infinity);
  const navigate = useNavigate();

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className={cn(
          "mx-auto flex h-14 sm:h-16 items-end gap-2 sm:gap-4 rounded-2xl bg-secondary/80 sm:bg-secondary/50 backdrop-blur-xl border border-primary/10 shadow-md px-3 sm:px-4 pb-3",
          "[padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]",
          className,
        )}
      >
        {items.map((item, index) => (
          <DockItem key={index} mouseX={mouseX}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() =>
                    item.onClick
                      ? item.onClick()
                      : item.target
                        ? window.open(item.link!, item.target)
                        : navigate(item.link!)
                  }
                  className="relative grow flex items-center justify-center w-full h-full text-primary-foreground cursor-pointer"
                >
                  {item.Icon}
                  {/* Badge indicator */}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground ring-1 ring-background">
                      {typeof item.badge === "number" && item.badge > 0
                        ? item.badge > 9
                          ? "9+"
                          : item.badge
                        : ""}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              {item.label && (
                <TooltipContent side="top" className="text-xs">
                  {item.label}
                </TooltipContent>
              )}
            </Tooltip>
          </DockItem>
        ))}
      </motion.div>
    </TooltipProvider>
  );
};

interface DockItemProps {
  mouseX: MotionValue<number>;
  children: React.ReactNode;
}

export const DockItem = ({ mouseX, children }: DockItemProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const iconScale = useTransform(width, [40, 80], [1, 1.5]);
  const iconSpring = useSpring(iconScale, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className="aspect-square w-10 rounded-full bg-primary text-secondary-foreground flex items-center justify-center"
    >
      <motion.div
        style={{ scale: iconSpring }}
        className="flex items-center justify-center w-full h-full grow"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

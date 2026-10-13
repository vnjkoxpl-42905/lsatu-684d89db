import React, { useState, useEffect, useMemo } from "react";
import type { Preferences, ReaderTheme } from "../lib/types";
import { FONTS, THEME_CLASSES } from "../lib/constants";

export interface ReaderSurfaceProps {
  prefs: Preferences;
  children: React.ReactNode;
  className?: string;
}

export function ReaderSurface({ prefs, children, className = "" }: ReaderSurfaceProps): React.ReactElement {
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    media.addEventListener("change", handler);
    return () => {
      media.removeEventListener("change", handler);
    };
  }, []);

  const resolvedTheme: Exclude<ReaderTheme, "system"> = useMemo(() => {
    if (prefs.theme === "system") {
      return systemIsDark ? "dark" : "light";
    }
    return prefs.theme;
  }, [prefs.theme, systemIsDark]);

  const fontStack = useMemo(() => {
    const match = FONTS.find((f) => f.label.toLowerCase() === prefs.font_family.toLowerCase());
    return match ? match.stack : "Arial, Helvetica, sans-serif";
  }, [prefs.font_family]);

  const themeClass = THEME_CLASSES[resolvedTheme] ?? THEME_CLASSES.light;

  return (
    <div
      data-theme={resolvedTheme}
      className={`min-h-screen w-full ${themeClass} ${className}`}
      style={{
        fontFamily: fontStack,
        fontSize: `${prefs.font_size}px`,
        lineHeight: prefs.line_spacing,
      }}
    >
      {children}
    </div>
  );
}

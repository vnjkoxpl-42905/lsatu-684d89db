import React, { useState, useEffect, useMemo } from "react";
import type { Preferences, ReaderTheme } from "../lib/types";
import { FONTS, THEME_CLASSES } from "../lib/constants";

/** Apply to the element that holds the passage text (mode renderers, View panel body, e-Reader). */
export const READING_TEXT_STYLE: React.CSSProperties = {
  fontFamily: "var(--rc-font-family)",
  fontSize: "var(--rc-font-size)",
  lineHeight: "var(--rc-line-height)",
};

/**
 * The same reading style built straight from prefs, for text that renders outside
 * the surface: dialogs portal to <body>, so they cannot inherit the variables.
 */
export function readingTextStyleFor(prefs: Preferences): React.CSSProperties {
  const match = FONTS.find((f) => f.label.toLowerCase() === prefs.font_family.toLowerCase());
  return {
    fontFamily: match ? match.stack : "Arial, Helvetica, sans-serif",
    fontSize: `${prefs.font_size}px`,
    lineHeight: String(prefs.line_spacing),
  };
}

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
      // Reading styles are exposed as CSS variables, NOT applied to the whole page, so the top bar,
      // buttons and dialogs keep normal app sizing. Only the reading text uses them, via READING_TEXT_STYLE.
      style={{
        ["--rc-font-family" as string]: fontStack,
        ["--rc-font-size" as string]: `${prefs.font_size}px`,
        ["--rc-line-height" as string]: String(prefs.line_spacing),
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

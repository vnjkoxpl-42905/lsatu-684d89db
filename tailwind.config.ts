import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import containerQueries from "@tailwindcss/container-queries";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        "state-correct": {
          DEFAULT: "hsl(var(--state-correct))",
          foreground: "hsl(var(--state-correct-foreground))",
        },
        "state-incorrect": {
          DEFAULT: "hsl(var(--state-incorrect))",
          foreground: "hsl(var(--state-incorrect-foreground))",
        },
        "state-again": {
          DEFAULT: "hsl(var(--state-again))",
          foreground: "hsl(var(--state-again-foreground))",
        },
        "state-easy": {
          DEFAULT: "hsl(var(--state-easy))",
          foreground: "hsl(var(--state-easy-foreground))",
        },
        "state-warn": {
          DEFAULT: "hsl(var(--state-warn))",
          foreground: "hsl(var(--state-warn-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        /* Teacher workspace accent. Carries `<alpha-value>` (unlike the older
         * tokens above) because the Desk styles it replaces lean on opacity
         * steps — border-teacher-accent/30, bg-teacher-accent/10. */
        "teacher-accent": {
          DEFAULT: "hsl(var(--teacher-accent) / <alpha-value>)",
          hover: "hsl(var(--teacher-accent-hover) / <alpha-value>)",
          strong: "hsl(var(--teacher-accent-strong) / <alpha-value>)",
          soft: "hsl(var(--teacher-accent-soft) / <alpha-value>)",
          foreground: "hsl(var(--teacher-accent-foreground) / <alpha-value>)",
        },

        "surface-elevated": "hsl(var(--surface-elevated))",
        "text-primary": "hsl(var(--text-primary))",
        "text-secondary": "hsl(var(--text-secondary))",
        "text-tertiary": "hsl(var(--text-tertiary))",

        /* ── Main Conclusion bootcamp tokens (scoped to .mc-bootcamp) ─────────
         * These resolve only inside .mc-bootcamp ancestors, where the matching
         * RGB-triplet CSS vars are defined (src/bootcamps/main-conclusion/styles/scoped.css).
         * `mc-` prefix avoids collision with LSAT U's HSL-based shadcn tokens (accent, border).
         * Unprefixed bootcamp-only names (bg, surface, ink, role-*, success/warn/error/info)
         * are added as-is — they don't collide with anything in LSAT U.
         */
        "mc-accent": "rgb(var(--accent) / <alpha-value>)",
        "mc-accent-hover": "rgb(var(--accent-hover) / <alpha-value>)",
        "mc-accent-deep": "rgb(var(--accent-deep) / <alpha-value>)",
        bg: "rgb(var(--bg) / <alpha-value>)",
        "bg-2": "rgb(var(--bg-2) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-elev": "rgb(var(--surface-elev) / <alpha-value>)",
        "paper-texture": "var(--texture-paper)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--ink-soft) / <alpha-value>)",
        "ink-faint": "rgb(var(--ink-faint) / <alpha-value>)",
        "role-conclusion": "rgb(var(--role-conclusion) / <alpha-value>)",
        "role-premise": "rgb(var(--role-premise) / <alpha-value>)",
        "role-pivot": "rgb(var(--role-pivot) / <alpha-value>)",
        "role-opposing": "rgb(var(--role-opposing) / <alpha-value>)",
        "role-concession": "rgb(var(--role-concession) / <alpha-value>)",
        "role-background": "rgb(var(--role-background) / <alpha-value>)",
        "mc-success": "rgb(var(--success) / <alpha-value>)",
        "mc-warn": "rgb(var(--warn) / <alpha-value>)",
        "mc-error": "rgb(var(--error) / <alpha-value>)",
        "mc-info": "rgb(var(--info) / <alpha-value>)",

        /* ── Flaw & Famous Flaws bootcamp tokens (scoped to .ff-bootcamp) ────
         * These resolve only inside .ff-bootcamp ancestors, where the matching
         * CSS vars are defined (src/bootcamps/fallacy-flaw/fallacy-flaw.css).
         * Plain hex refs via var() — the source CSS sets hex values directly.
         */
        paper: "var(--paper)",
        "paper-bright": "var(--paper-bright)",
        "paper-deep": "var(--paper-deep)",
        // ink, ink-soft already defined above for MC bootcamp
        "ink-mute": "var(--ink-mute)",
        rule: "var(--rule)",
        "rule-soft": "var(--rule-soft)",
        verdigris: "var(--verdigris)",
        "verdigris-deep": "var(--verdigris-deep)",
        "verdigris-tint": "var(--verdigris-tint)",
        cake: "var(--cake)",
        "cake-deep": "var(--cake-deep)",
        "cake-tint": "var(--cake-tint)",
        g1: "var(--g1)",
        "g1-tint": "var(--g1-tint)",
        g2: "var(--g2)",
        "g2-tint": "var(--g2-tint)",
        g3: "var(--g3)",
        "g3-tint": "var(--g3-tint)",
        strike: "var(--strike)",
        "strike-tint": "var(--strike-tint)",

        /* Abstract bootcamp brutalist tokens (scoped to .topic-abstract)
         * These resolve only inside .topic-abstract ancestors, where the
         * matching CSS custom properties are defined
         * (src/topics/abstract/styles/brutal.css). Hex via var() because the
         * brutalist palette is intentionally non-themed. */
        "brutal-yellow": "var(--brutal-yellow)",
        "brutal-cyan": "var(--brutal-cyan)",
        "brutal-pink": "var(--brutal-pink)",
        "brutal-green": "var(--brutal-green)",
        "brutal-red": "var(--brutal-red)",
        "brutal-ink": "var(--brutal-ink)",
        "brutal-ink-soft": "var(--brutal-ink-soft)",
        "brutal-ink-faint": "var(--brutal-ink-faint)",
        "brutal-ink-trace": "var(--brutal-ink-trace)",
        "brutal-bg": "var(--brutal-bg)",
        "brutal-paper": "var(--brutal-paper)",

        /* Causation Station neon "punk" tokens (scoped to .cs-punk)
         * These resolve only inside .cs-punk ancestors, where the matching
         * hex CSS vars are defined (src/components/bootcamp/styles/cs-punk.css).
         * Flat hex fallbacks (not RGB-triplets) since the source AI Studio
         * prototype defines them as plain hex, not alpha-composable triplets. */
        "punk-base": "var(--punk-base, #06080C)",
        "punk-panel": "var(--punk-panel, #0B1118)",
        "punk-cyan": "var(--punk-cyan, #00FFF0)",
        "punk-magenta": "var(--punk-magenta, #FF1AFF)",
        "punk-lime": "var(--punk-lime, #A8FF00)",
        "punk-red": "var(--punk-red, #FF2A6D)",
        "punk-text": "var(--punk-text, #EAF2FF)",
        "punk-sub": "var(--punk-sub, #9BB0C8)",
      },
      backdropBlur: {
        glass: "12px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
        /* Abstract bootcamp brutalist hard-offset shadows. Reference
         * --brutal-ink so the tinted-neutral rule holds; --brutal-ink is
         * defined inside .topic-abstract. Outside the wrapper these tokens
         * fall back to the closest defined value (or transparent), which is
         * desired since shadow-brutal-* classes never appear outside it. */
        "brutal-sm": "2px 2px 0px 0px var(--brutal-ink, currentColor)",
        "brutal": "4px 4px 0px 0px var(--brutal-ink, currentColor)",
        "brutal-lg": "8px 8px 0px 0px var(--brutal-ink, currentColor)",

        /* Causation Station neon glow shadows (scoped to .cs-punk usage) */
        "neon-cyan": "0 0 8px var(--punk-cyan, #00FFF0), 0 0 20px var(--punk-cyan, #00FFF0)",
        "neon-magenta": "0 0 8px var(--punk-magenta, #FF1AFF), 0 0 20px var(--punk-magenta, #FF1AFF)",
        "neon-lime": "0 0 8px var(--punk-lime, #A8FF00), 0 0 20px var(--punk-lime, #A8FF00)",
        "neon-red": "0 0 8px var(--punk-red, #FF2A6D), 0 0 20px var(--punk-red, #FF2A6D)",
      },
      dropShadow: {
        /* Causation Station neon glow drop-shadows, for text/icons */
        "neon-cyan": "0 0 12px rgba(0, 255, 240, 0.6)",
        "neon-magenta": "0 0 12px rgba(255, 26, 255, 0.6)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        /* MC bootcamp numeric radii (no LSAT U conflict) */
        "2": "4px",
        "3": "8px",
        "5": "14px",
        "8": "24px",
      },
      fontFamily: {
        /* MC bootcamp font stacks — only consumed by classes inside .mc-bootcamp */
        "mc-sans": ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        "mc-serif": ['Georgia', '"Times New Roman"', 'ui-serif', 'serif'],
        "mc-mono": ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        /* FF bootcamp font stacks */
        display: ['Georgia', '"Times New Roman"', 'serif'],
        /* Causation Station stimulus/question serif (scoped to .cs-punk usage) */
        "punk-serif": ['"Source Serif Pro"', 'Georgia', '"Times New Roman"', 'Times', 'serif'],
      },
      fontSize: {
        /* MC bootcamp type scale (net-new names; no LSAT U conflict) */
        display: ['36px', { lineHeight: '1.1', fontWeight: '700' }],
        h1: ['28px', { lineHeight: '1.2', fontWeight: '600' }],
        h2: ['21px', { lineHeight: '1.25', fontWeight: '600' }],
        h3: ['17px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['14px', '1.6'],
        'body-prose': ['15px', '1.7'],
        small: ['12.5px', '1.55'],
        mono: ['11.5px', { lineHeight: '1.5', fontWeight: '600' }],
        label: ['10.5px', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '0.06em' }],
      },
      screens: {
        /* MC bootcamp breakpoints (net-new names) */
        phone: { max: '600px' },
        tablet: { min: '601px', max: '900px' },
        desktop: { min: '901px' },
      },
      transitionDuration: {
        '150': '150ms',
        '180': '180ms',
        '220': '220ms',
      },
      transitionTimingFunction: {
        eased: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 12px 0 rgba(176, 106, 62, 0.2)" },
          "50%": { boxShadow: "0 0 24px 0 rgba(176, 106, 62, 0.4)" },
        },
        "lift": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(-2px)" },
        },
        spotlight: {
          "0%": {
            opacity: "0",
            transform: "translate(-72%, -62%) scale(0.5)",
          },
          "100%": {
            opacity: "1",
            transform: "translate(-50%,-40%) scale(1)",
          },
        },
        "mc-shimmer-sweep": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "mc-zoom-fade-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "mc-tooltip-in": {
          from: { opacity: "0", transform: "translateY(-4px) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "lift": "lift 0.2s ease-out forwards",
        spotlight: "spotlight 2s ease .75s 1 forwards",
        "mc-shimmer-sweep": "mc-shimmer-sweep 1.6s ease-in-out infinite",
        "mc-zoom-fade-in": "mc-zoom-fade-in 180ms cubic-bezier(0.4, 0, 0.2, 1)",
        "mc-tooltip-in": "mc-tooltip-in 150ms cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [tailwindcssAnimate, containerQueries],
} satisfies Config;

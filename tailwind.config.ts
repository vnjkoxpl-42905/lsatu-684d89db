import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

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
        "surface-elevated": "hsl(var(--surface-elevated))",
        "text-primary": "hsl(var(--text-primary))",
        "text-secondary": "hsl(var(--text-secondary))",
        "text-tertiary": "hsl(var(--text-tertiary))",
        "accent-bronze": "hsl(var(--accent-bronze))",
        "accent-warm": "hsl(var(--accent-warm))",
        "glow-bronze": "hsl(var(--glow-bronze))",

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
        "glow-sm": "0 0 12px 0 rgba(176, 106, 62, 0.2)",
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
        "mc-sans": ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        "mc-serif": ['ui-serif', 'Iowan Old Style', '"Apple Garamond"', 'Georgia', 'serif'],
        "mc-mono": ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "lift": "lift 0.2s ease-out forwards",
        spotlight: "spotlight 2s ease .75s 1 forwards",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;



## Plan: Redesign Module 1 Intro Screen

### Problem
The intro screen (lines 74-93 of `InteractiveStemDrill.tsx`) renders the entire module opening as a single card with a paragraph of text and a button. It feels like static notes, not a training experience.

### Solution
Replace the single `intro` state with a multi-step cinematic onboarding flow using 3 sequential states: `intro-1`, `intro-2`, `intro-3`. Each step reveals one piece of the briefing with animation, creating a guided entry experience.

### The 3-Step Flow

**Step 1 — Module Title Card** (full-bleed hero feel)
- Large "01" numeral in faint oversized type (decorative)
- "The De-Abstraction Lab" as a bold heading
- Subtle animated border or glow accent
- Single line: "15 Exercises · Module 1"
- CTA: "→ Continue"

**Step 2 — The Mission** (why this matters)
- Heading: "Why This Matters"
- The existing `MODULE_1_INTRO` text, but broken into 2-3 visually distinct paragraphs with fade-in stagger
- Key phrase highlighted with a subtle pill/accent: "de-abstractify"
- CTA: "→ What You'll Do"

**Step 3 — The Briefing** (what the student will do)
- Heading: "Your Training"
- 3 icon-labeled items describing the exercise flow:
  - 🔍 Read the raw stem — try to decode it yourself
  - 🔑 Reveal keyword definitions — see what each term means
  - 💡 See the coach's translation — compare to your read
- Animated entrance for each item (staggered)
- CTA: "→ Begin Exercises" (transitions to the first stem)

### Visual Style
- Each step uses `AnimatePresence` with `motion.div` for smooth crossfade
- Large decorative numeral ("01") using `text-[120px] font-bold text-foreground/[0.03]` for depth
- Monochromatic palette — no color splashes except a thin primary accent line
- Generous whitespace, no card borders on step 1 (let it breathe)
- Steps 2 and 3 use subtle cards with `border-border` and slight backdrop blur

### Implementation
**File: `src/components/bootcamp/abstraction/InteractiveStemDrill.tsx`**

1. Change `DrillState` type to add `'intro-1' | 'intro-2' | 'intro-3'` replacing `'intro'`
2. Initialize state to `'intro-1'`
3. Update `advance()` to chain: `intro-1 → intro-2 → intro-3 → exercise`
4. Replace the single `if (state === 'intro')` block (lines 74-93) with 3 animated screens
5. Add a small step indicator (3 dots) during the intro sequence
6. Keep all existing exercise/keyword/translation logic unchanged

No other files modified. No content removed. Just the intro screen refactored into a 3-step guided entry.


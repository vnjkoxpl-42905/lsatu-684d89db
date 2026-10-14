# Shape: Diagnostic Profile Redesign

## The Problem
The current "Diagnostic Profile" feels like a generic SaaS dashboard. It uses clinical language ("Trait Coverage", "Retention Load") and a "metric grid" layout that clashes with Joshua's direct, personal coaching brand. The gauges are over-decorated slop, and the information hierarchy is flat.

## The Strategy: "The Coach's Briefing"
We are moving from a **Dashboard** (presentation of data) to a **Briefing** (narrative of progress).

### 1. Linguistic Pivot (Voice)
We will replace all clinical/SaaS terminology with "Coach Voice":
- **Trait coverage** -> **Mastery map** (What do we actually know about your skills?)
- **Retention load** -> **Review pressure** (How much is fading?)
- **Program memory** -> **Journey progress** (How far have you come?)
- **Stability over time** -> **Performance consistency** (Are you getting steadier?)
- **Calibration** -> **Diagnostic seed**

### 2. Visual Hierarchy (Layout)
- **The Lead (Hero):** A single, wide section for **Performance Consistency** (the rolling accuracy chart). This is the "fastest read" on health.
- **The Sidebar:** "Next Moves" (Recommendations) moves to the top right. "Compute the next step; do not present a grid." The most important thing to do next should be the first thing you see after the chart.
- **Mastery Grid (Bento):** Replace the identical card grid with a varied Bento-style layout for traits. 
- **The "Memory" Footer:** A simple, high-end typographic note about data persistence.

### 3. Sophisticated Simplicity (Refinement)
- **Banish Gauges:** No more circular "donuts". We use minimalist **Linear Progress Bars** integrated into the card typography.
- **Color Strategy:** "Restrained". Tinted neutrals + accent gold for key mastery signals. Success/Warn/Error status should be clear but not "loud".
- **Interactive Depth:** Hovering a trait in the Mastery Grid will highlight its specific impact in the "Stability" chart (if feasible with Recharts).

## IMPECCABLE_PREFLIGHT
`context=pass product=pass command_reference=pass shape=pass image_gate=skipped:visual_consistency mutation=open`

---

**Approval Required:** Do you approve this "Briefing" strategy and the linguistic pivots? If yes, I will begin implementing the `DiagnosticsAnalyticsSurface.tsx` overhaul.
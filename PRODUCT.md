# Product

## Scope

LSAT U — the full application. This file covers all surfaces: foyer, classroom, messenger/inbox, drills, admin workspace, and the bootcamp. Each surface may extend the global principles with specific guidance in dedicated sub-sections below.

The bootcamp's visual tokens remain governed by `DESIGN.md` (`/bootcamp/intro-to-lr/*`, `src/bootcamps/main-conclusion/`).

## Register

product

## Users

Two roles, one coaching relationship.

**Students (design north):** Paying clients in Joshua's Aspiring Attorneys program, or independent LSAT learners who arrived without prior coaching context. They are preparing seriously for the LSAT. On any given session they might be working through a bootcamp module, drilling weaknesses, reviewing an assignment, or sending Joshua a question. They expect every minute to be purposeful. They use the product on desktop and mobile, often in focused study sessions.

**Joshua (admin/instructor):** The sole instructor. He manages student access, sends assignments, publishes weekly plans, and maintains real back-and-forth with students through the messenger. The admin surface must be fully responsive — Joshua works from any device, at any hour.

## Product Purpose

LSAT U is the operational platform for Joshua's coaching practice. It delivers the method, tracks the work, and keeps the coaching relationship alive between sessions.

For students: a focused learning environment that compounds toward LSAT fluency — bootcamp modules, adaptive drills, assignments, and direct access to ask Joshua.

For Joshua: a workspace to manage students, assign and publish content, and stay in real communication without losing the one-on-one feel that defines his coaching style.

Success looks like a student who logs in daily, knows exactly what to do next, and feels the presence of a real coach even when Joshua is not in the room.

## Brand Personality

**Confident, considered, alive — and personal.**

The app speaks like a coach who built the system from scratch. No hedging, no softening, no "you might consider." Instructions are direct because the method is direct. The product never softens an instruction into a suggestion.

**Voice update (warm coach):** Student-facing copy across bootcamp lessons, drills, and coaching moments follows the warm-coach voice: collaborative second person ("let's," "you"), short calm sentences, struggle normalized, hard moments closed with a small lift. Directness still governs structure and instruction; warmth governs tone. The "no hedging" line above is about the method's confidence, not coldness. Route all student-facing copy through the vault's teaching-voice note before shipping.

**Messenger-specific voice:** one-on-one, hi-tech, interactive, engaging. The inbox is the closest thing to being in the room with Joshua. It should feel like a real conversation — not a support ticket, not a legal file. Fast enough to feel like messaging, structured enough to feel like coaching.

## Anti-references

**App-wide:**
- Generic LSAT prep platforms: 7Sage, Khan Academy LSAT, LSAT Demon, Blueprint. Card-grid hubs, hero-metric dashboards, gamification masking thin content.
- SaaS-cream startup aesthetic: pastels, gradient blobs, big-number stats tiles, "Get started in seconds" tone.
- Cookie-cutter LMS shells: linear "Lesson 1.1" pacing, generic progress bars, no coaching voice.
- Duolingo-shaped gamification: streak flames, XP bars, trophy popovers. The product does not reward attendance.

**Messenger-specific:**
- Legal client portal (too cold): formal, transactional, case-number adjacent. Every interaction feels like filing a document.
- Intercom/support chat (too service-desk): "How can I help you today?" patterns, ticket threads, canned responses, SLA framing.
- Slack/team chat (too busy): channels, reactions, status dots, workplace overhead. This is a coaching thread, not a team workspace.

**Drills / Labs-specific:**
- The multiple-choice quiz: a bare stem, five options, a right/wrong mark, a score. No coaching, no reason the answer is right, no takeaway that transfers to the next question. A drill that could have been a Google Form has failed.
- Blends into the drill page: a lab that reuses default app primitives with no identity of its own, so it reads like a generic list row instead of a built surface. This is the current ConclusionTypeLab problem.
- The score screen as ending: "you got X/Y" with no per-item insight, no view of which skill slipped, nothing concrete to do next.

## Design Principles

**App-wide:**

1. **Compute the next step; do not present a grid.** Every hub leads with one computed CTA. The student should never arrive at a screen and wonder what to do. Point, do not present.
2. **Truthfulness over performance.** Every progress claim, status badge, and CTA traces to real data. Honest empty states beat fabricated content. If Joshua hasn't assigned anything, say so plainly and stop there.
3. **Coach voice, not industry voice.** The product speaks like Joshua, not like an LSAT test-prep editor. "The argument" not "stimulus." No spec language in student-visible copy. No em dashes in computed or utility copy.
4. **Personal at scale.** Even when Joshua is not responding in real time, the product should feel like a one-on-one relationship. Assignments, feedback, classroom content, and inbox messages all carry the same direct, individual tone.
5. **Reuse the system; do not fork.** One motion library (framer-motion v12), one icon library (lucide-react), the app-wide neutral dark design system for all non-bootcamp surfaces. New components compose existing primitives first.

**Messenger-specific:**

6. **Between email and instant messaging.** The inbox is not a support ticket queue and not a live chat widget. Messages may be read hours later or replied to in seconds. The interface handles both without imposing urgency where there is none, or friction where speed is needed.
7. **One thread, one relationship.** Each student has exactly one thread with Joshua. The inbox is not a channel list. It is a record of a coaching relationship. Design for depth in a single thread, not breadth across many.
8. **Linear UI discipline meets iMessage warmth.** Crisp, purposeful, zero noise — but human. Every element earns its place by either carrying information or making the conversation feel real. Nothing is decorative for its own sake; nothing is so clinical it loses the person behind the message.

**Bootcamp-specific (preserved):**

9. **Attempt before reveal.** Passive reading is the enemy. Every lesson runs through the phase machine: briefing, demo, attempt, reveal, coach, checkpoint, cleared. Continue is gated until the student submits. Reveal copy references the student's actual attempt, not a generic answer.
10. **Compute the next step; do not present a grid.** Module hubs lead with one computed CTA. Card grids are how generic LSAT prep apps shrug at the student; this product points.

**Drills / Labs-specific:**

11. **The reveal teaches the weakness, not just the answer.** (the primary mandate) Naming the correct answer is the floor. The payoff is the predictable weakness that answer's category carries, tied to what the student actually picked. A student who finishes a Conclusion Type set should leave with a transferable reflex ("a recommendation conclusion is attacked on whether the action actually solves the stated problem"), not a tally. Reveal copy speaks to their pick, not a generic key.
12. **First Sentence vs Rebuttal is the craft bar.** Every lab rises to the `FirstSentenceVsRebuttalLab` standard: a distinct built identity, in-the-moment coaching feedback on a wrong pick, a saved session, and an end-of-set review that shows which skill slipped (per-component or per-type miss tracking) with an answer key to revisit any item. A single-skill classify drill keeps its single attempt per item but earns that same depth of reveal and review. It is not exempt from the bar because it is simpler.
13. **A lab is a built surface, not a list row.** Each drill carries its own visual signature within the bootcamp tokens. It must not read as a default card or blend into the drill index. The index lists labs; a lab, once entered, stands on its own.
14. **Calibration, not gatekeeping.** (echoes teach-first-calibrate-after) A drill measures after teaching, never gates before it. The verdict frames a miss as the next thing to work, warmly. `DrillVerdict`'s "Re-run open" framing, never "Failed," never a grade.

## Accessibility & Inclusion

WCAG 2.1 AA is the floor across all surfaces.

- Visible focus rings on every interactive element.
- `prefers-reduced-motion` respected throughout. Motion is decorative, never load-bearing.
- Touch targets meet 44×44px minimum.
- Screen reader announcements on unread counts, message send confirmation, and realtime inbox updates.
- Body text contrast is AAA-aspirational on extended reading surfaces (bootcamp lessons, conversation threads).
- Dark theme is the default across all non-bootcamp surfaces. Light mode is available via ThemeToggle and toggled per-user.

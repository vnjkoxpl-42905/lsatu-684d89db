# The drill works, but its presentation still needs another pass

Audited 2026-10-07 with Impeccable audit. Target: conditional translation practice at the local opening preview. No application code was changed. This is a technical and implementation audit, not evidence of teaching effectiveness or a complete WCAG conformance assessment.

## Anti-pattern verdict: fail the final craft check

The interface is not a generic AI template throughout. It avoids gradient text, decorative glass, metric heroes, repeated icon-card grids, and bouncing motion. Its examples and explanations teach actual distinctions.

Two noticeable patterns remain: nested exercise containers compete with the question, and template-generated wording produces awkward prompts. The independent-writing stage also loses the sentence hierarchy established by other stages. Those issues explain the remaining unfinished feel more convincingly than adding decorative animation would.

## Audit health score

| Dimension | Score | Evidence |
|---|---:|---|
| Accessibility | 3/4 | Labels, button states, progress semantics, feedback status regions and keyboard focus are present. Course category labels fail text contrast. |
| Performance | 3/4 | No observed runtime errors or verified rendering defect in the walkthrough. Visited questions remain mounted to preserve work. No controlled load/frame benchmark was performed. |
| Responsive design | 3/4 | Core exercise UI reflows at 320px and 768px. The drawer close target is only 16px square. |
| Theming | 2/4 | The runner uses shared course tokens, but the course shell mixes them with literal colors. Light mode was verified; dark-mode integration was not. |
| Anti-patterns | 2/4 | Nested containers and mechanical copy remain, particularly in independent writing. |
| **Total** | **13/20** | **Acceptable: significant refinement remains.** |

This is an Impeccable rubric score, not a price, certification, or measured learning outcome.

## Six issues, ordered by impact

Severity totals: **P0: 0 · P1: 1 · P2: 5 · P3: 0.**

### [P1] Course category labels are too faint

**Location:** [opening-course.css:5](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/opening-course.css:5), [opening-course.css:16](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/opening-course.css:16), and the previous/next captions at line 37.

**Category:** Accessibility.

**Verified evidence:** The 10px Practice eyebrow computes to `rgba(26,26,26,0.46)` over `rgb(245,242,237)`, approximately **2.90:1** after alpha compositing. Intro path, Practice and Tools in the rail use approximately **3.26:1**. These are visible informational labels, not disabled controls.

**Impact:** Readers with reduced contrast sensitivity may miss the categories and navigation context. The small uppercase typography compounds the faint appearance.

**Standard:** Normal text needs at least 4.5:1 under [WCAG 1.4.3, Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

**Recommendation:** Use a course muted-text token that clears 4.5:1 on the actual background. Apply it to the eyebrow, drawer/rail category labels and lesson navigation captions. Re-measure composited colors rather than judging a screenshot.

**Suggested command:** `$impeccable harden`.

### [P2] A completed practice session disappears on reload without a clear notice

**Location:** [OpeningMixedDrill.tsx:74](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/OpeningMixedDrill.tsx:74), [MixedFamilyPractice.tsx:92](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/MixedFamilyPractice.tsx:92), and [routes.tsx:202](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/routes.tsx:202).

**Category:** Interaction hardening / clarity.

**Verified evidence:** After finishing 24 questions and a fresh check, Review my answers retained the selected answer and feedback. Reloading the separate audit tab returned to the first stage introduction. Questions, results and written drafts live in React state. The authenticated shell additionally has a global Saved to your account status, while the opening route supplies no persistence callbacks to this runner. That authenticated chrome was source-inspected, not browser-verified under a logged-in account.

**Impact:** A student can lose substantial work and mistake the account saving status for a promise that this practice is saved.

**Standard:** No WCAG violation asserted. This is a mismatch between saving scope and likely user expectations.

**Recommendation:** Make the session-only scope explicit before starting and scope the authenticated saving status to the work it actually saves. If resumable practice is desired, define its persistence contract before connecting it to course progress. A local clarity fix does not require inventing a backend record.

**Suggested commands:** `$impeccable clarify`, then `$impeccable harden` if persistence is added.

### [P2] Review practice can open more questions

**Location:** [OpeningMixedDrill.tsx:106](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/OpeningMixedDrill.tsx:106) and [OpeningMixedDrill.tsx:146](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/OpeningMixedDrill.tsx:146).

**Category:** UX copy / interaction clarity.

**Verified evidence:** One deliberately incorrect first answer created a qualification follow-up. At question 24, clicking Review practice opened Try the distinction in a new case and then another question, rather than the review.

**Impact:** The action promises completion/review while asking the student to continue practicing. It makes a useful adaptive feature feel like an unexpected extension.

**Standard:** No WCAG violation asserted.

**Recommendation:** Use Try a fresh case when follow-ups are pending and Review practice when the next screen is the review. Share the branch decision between label and action so they cannot drift.

**Suggested command:** `$impeccable clarify`.

### [P2] Independent writing loses the shared exercise hierarchy

**Location:** [MixedFamilyPractice.tsx:108](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/MixedFamilyPractice.tsx:108), [opening-mixed-drill.css:24](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/opening-mixed-drill.css:24), and the shared wrappers at [OpeningCourse.tsx:121](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/OpeningCourse.tsx:121).

**Category:** Anti-patterns / typography / theming consistency.

**Verified evidence:** Choice-question sentences render at 28px on desktop and 23px at 320px. The independent-writing sentence renders at **14px**, even on desktop. Its `co-lab co-check` container also adds an inner rounded panel inside the outer course panel. After comparison, the diagram and feedback introduce further enclosed surfaces.

**Impact:** The sentence being tested becomes less prominent than instructions and fields. The stage looks like an embedded older component rather than the next part of one drill. Extra containers consume attention and mobile space.

**Standard:** Impeccable's shared hierarchy and nested-card guidance. No WCAG failure is asserted solely from a 14px font.

**Recommendation:** Give every stage a shared sentence treatment, instruction spacing, field spacing and feedback treatment. Use one exercise surface with internal spacing and dividers. Keep answer-input borders because they identify real controls. Consolidate course colors into scoped semantic tokens; do not assume the app's global dark mode already themes this light course shell.

**Suggested commands:** `$impeccable typeset`, then `$impeccable layout`.

![Independent writing: the tested sentence loses prominence inside nested panels](C:/Users/Joshu/.codex/visualizations/2026/10/07/01a117ea-7c95-7813-af3b-866b05ec963a/conditional-audit-written-stage.jpg)

### [P2] Mobile menu controls do not consistently meet the 44px target

**Location:** [sheet.tsx:60](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/components/ui/sheet.tsx:60), [OpeningCourse.tsx:25](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/OpeningCourse.tsx:25), [opening-course.css:99](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/opening-course.css:99).

**Category:** Responsive design / accessibility usability.

**Verified evidence:** At 320px, the drawer Close button measures **16 × 16px**. The Conditional logic link is **27.2px** high. The exercise buttons and Course menu trigger are at least 44px high. Close has an accessible name and visible keyboard ring; Escape closes the drawer.

**Impact:** Closing the drawer is unnecessarily precise on a touch screen, despite good keyboard behavior.

**Standard:** The Impeccable 44px target and [WCAG 2.5.5, Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html). This is **not automatically an AA violation**: [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) permits smaller targets under spacing and other exceptions.

**Recommendation:** Keep the icon small but provide a 44px hit area. Give the mobile course-title link comparable vertical padding. Scope the close override to this drawer unless a shared-component change is intentionally reviewed across the app.

**Suggested command:** `$impeccable adapt`.

### [P2] Generated question copy is still mechanical

**Location:** [MixedFamilyPractice.tsx:118](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/MixedFamilyPractice.tsx:118), feedback at line 130, and [OpeningMixedDrill.tsx:31](C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp/src/bootcamps/conditionals/components/OpeningMixedDrill.tsx:31).

**Category:** Anti-patterns / UX copy.

**Verified evidence:** The template actually renders In this sentence, what does required make required? Other prompts use what does every make enough? The summary still says Keeping the complete condition, while the corresponding stage now says What does the rule cover? Incorrect feedback retains complete target.

**Impact:** Students must interpret the wording of the question before they can practice interpreting the sentence. It also reintroduces language Joshua already asked to replace.

**Standard:** Joshua's selected teaching voice and Impeccable clarity guidance. No WCAG violation asserted.

**Recommendation:** Author concrete prompts per item, following stage one's approach. For the terrace sentence: What do you need to eat on the terrace? For the bus sentence: Which buses does every refer to? Follow with Which condition is enough to establish the other? Use Who or what the rule covers for the corresponding review label, and replace target wording with the specific condition or clause being discussed.

**Suggested command:** `$impeccable clarify`.

## The recurring cause

The newer runner establishes a consistent flow, but surrounding shell styles and reused exercise components retain separate typography, container rules and copy templates. Styling only the runner cannot finish the entire experience. The next pass should establish a shared exercise presentation and authored item prompts across those boundaries.

Saving is a separate contract: retaining mounted React state protects in-session navigation, while it does not provide reload recovery or account history.

## Keep these strengths

- Each stage pauses to explain its purpose and gives a distinct example before questions begin.
- Independent writing comes before supplied choices. Results explicitly distinguish checked choices from ungraded written translations.
- First-attempt results remain separate from corrected answers; new cases revisit actual errors.
- Feedback explains lost restrictions, reversed arrows, and the difference between obligations, permission and completed actions.
- Progress uses an accessible name, current value and separate denominator for fresh checks.
- Native buttons, labeled textareas, pressed states and status regions are present. Visible keyboard focus was verified on sampled controls and navigation.
- Core controls reflow without horizontal overflow in the sampled 320px and 768px states. The requested start pulse becomes animation: none under reduced-motion emulation.
- The walkthrough completed without a runtime error. Existing React Router future-version warnings are not drill failures.

## Evidence and limits

Used a separate hidden **Codex in-app browser** tab. The user's practice tab was not reset. Walked all 24 main questions, a deliberately triggered qualification follow-up, summary, review and reload. Examined stage introductions, incorrect/correct feedback, field labels, button states, mobile drawer behavior and source code. Responsive samples: 320px for choice, diagram, writing and menu states; 768px for transfer; 1280px for desktop. Document widths were 305px at 320 and 753px at 768 because of the vertical scrollbar, with no horizontal overflow in those samples.

Contrast calculations used computed browser colors, alpha compositing and relative luminance, not screenshot pixel sampling. Main runner text was approximately 13.51:1 against its panel; muted runner text and primary-button text approximately 7.5:1. Normal unselected choice borders were approximately 3.35:1 against the panel. Disabled controls were not incorrectly counted as text-contrast failures.

No physical-device, screen-reader, 200% text-resize, authenticated-browser saving, dark-theme, throttled-network or frame-timing assessment was completed. Theming and performance scores reflect source inspection plus the limited browser walkthrough. No empirical claim is made about retention, item difficulty or mastery.

## Run the next pass in this order

1. **[P1] `$impeccable harden`**: correct course-label contrast and make the saving scope explicit.
2. **[P2] `$impeccable clarify`**: author concrete item prompts, align the results vocabulary, and label the adaptive branch accurately.
3. **[P2] `$impeccable typeset`**: give the tested sentence consistent prominence in all stages.
4. **[P2] `$impeccable layout`**: remove redundant exercise containers and normalize field/feedback spacing and tokens.
5. **[P2] `$impeccable adapt`**: enlarge the drawer close and course-title hit areas; verify text enlargement and remaining mobile states.
6. **`$impeccable polish`**: finish the shared presentation after the substantive fixes.

These commands can be run individually, together, or in another chosen order. Re-run `$impeccable audit` after fixes.

The separately maintained refinement log already tracks delayed retention checks, student calibration, history contracts and physical-device/assistive-technology work. Those remain learning and production-validation follow-ups, rather than fabricated defects proved by this audit.

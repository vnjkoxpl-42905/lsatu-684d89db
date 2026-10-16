# LSAT U student experience, first visual version

Date: 2026-09-28
Status: revised design prototype; Practice Exams placement confirmed 2026-09-28; not an app change
Companion: [platform adoption game plan](../implementation-plans/2026-09-27-platform-adoption.md)
Prototype: [clickable student view](../design-previews/2026-09-28-student-experience.html)

## What the current student screen tells us

Joshua's 2026-09-28 screenshot shows a recognizable LSAT U Home: warm surfaces, a greeting, a prominent overdue assignment, quick actions, assigned work, a message from Joshua, and a seven-day strip. These are useful starting points. It also shows the cost of the current rail: Home, Drill, Practice Exams, Assigned work, Notes and recaps, Bootcamps, Activities, Review, Analytics, Admissions, History, Messages, and Schedule all compete at the same level. The Home hero and large assigned-work card leave little room to see the next study decision and its reason together.

The student design keeps the product's warm tone and the approved Home v3 direction. It makes the next action, assigned work, and teacher message easier to scan in the first viewport. The page is a sample interface, so its names, dates, counts, and question references are illustrative and must not be interpreted as live student data.

## One rail, with destinations students can predict

| Current student entry | Proposed place | Access detail |
|---|---|---|
| Home | Home | Next action, assignments, teacher message, review due, and week ahead. |
| Drill | Practice > Drills | Smart Drill stays one action away from Home and Practice. |
| Practice Exams / Testing Centre | Practice > Practice Exams | Keep its own landing page with two start actions, Unfinished exams and sections, All Exams, and Attempts. A timed launch names the clock and requires a deliberate start. |
| Assigned work | My Work > To do / Completed | Each work row links to the right Practice, Activity, or test surface. |
| Notes and recaps | My Work > Notes & recaps | Notes and recaps retain their own record types and context. |
| Bootcamps | Library > Bootcamps | Continue and progress appear on the item card. |
| Activities | Library > Activities | The assigned instance also appears in My Work. |
| Review, Wrong answers, Flagged | Review > To review / Wrong answers / Flagged | A single queue explains why each question is there. |
| Analytics and History | Progress > Overview / History / Topics | Counts disclose the included source and sample size. |
| Admissions | Library > Admissions | Keep the tab visible and locked for students while the page is unfinished. Joshua/admins retain access. This is an immediate access decision, not a change that waits for the redesign. |
| Messages | Persistent Inbox control in the top bar, with full thread view | Badge and recent message remain visible from Home. Preserve direct message links. |
| Schedule | Schedule | The next session and Book a session are visible without leaving the student shell. |
| Find question | Persistent top-bar search | Keep exact PT/S/Q and text lookup, then return to the originating page. |

The seven primary rail destinations are Home, My Work, Practice, Review, Progress, Library, and Schedule. Settings and account controls stay with the profile. A student with restricted access still sees every tab; unavailable tabs show a lock and cannot open their pages. Existing child permission rules still apply to direct links. Existing deep links and saved rail preferences need migration as specified in the main game plan.

## Student screen behavior

1. **Home answers what to do next.** The first recommendation states its source, why it is next, and a single Continue action. A message and a second assignment stay nearby. A short review-due line links directly into Review. The seven-day strip stays, but it does not crowd out the work.
2. **My Work is the teacher relationship.** To do and Completed keep every issued assignment, even when Joshua assigns the same drill twice. Opening work does not make it In progress. Measurable practice moves to Completed only after its finish is saved. Notes & recaps includes Joshua's notes, session recaps, and the student's own notes with clear author and type labels. An unstarted assignment appears before any attempt exists.
3. **Practice separates stakes.** Its first level has Drills and Practice Exams. Drills holds Smart Drill, Choose questions, and Saved sets. Practice Exams retains an Overview landing page, All Exams, and Attempts. The landing page has two start actions and one list for unfinished full exams and standalone timed LR/RC sections. Opening a test shows its sections and the student's attempts. Timed work gets a start summary. Inspecting a known question is clearly different from scoring a new attempt.
4. **Review is a task, then a record.** To review includes missed, flagged, skipped, and explicitly Joshua-selected questions or responses. Wrong answers and Flagged let students audit the underlying history. The view keeps the first answer, any blind answer, written diagnosis, explanation, and Joshua's note. For a missed answer, a short error explanation is required before Mark reviewed. That action clears the task but retains the flag and history; a new miss creates a new task.
5. **Progress explains a next action.** Summary cards link to the underlying attempts and to a relevant review or drill. Empty data says there is not enough evidence, rather than displaying zero accuracy.
6. **Library holds longer-lived material.** Lessons, Activities, Bootcamps, and Admissions live here. Students see Admissions locked while it is unfinished; Joshua/admins retain access. Assigned Activities also appear in My Work so the student can find them through either task or resource context.
7. **Schedule closes the loop.** Preparation links to the upcoming session, which links to the recap and follow-up work. Booking remains a clear action.

## Visual decisions for this version

- The rail target is 248 to 256 px with seven full labels, one active state, and no second permanent navigation column. This is a prototype target to test at laptop widths.
- The top bar carries search and Inbox. Search is a task shortcut; Inbox's unread count is persistent without making Messages an eighth primary destination.
- The first Home row uses a compact recommendation panel rather than the screenshot's tall welcome block. It keeps the warm gradient and dark work card as LSAT U accents, while letting the assigned list and message enter the first viewport.
- Local tabs sit directly below each page title. Their active states and URL state should match; the static prototype demonstrates the interaction, while production must retain browser history and direct links.
- Main buttons name the exact action: Continue assignment, Start timed section, Open recap, Mark reviewed. Labels for first answer, correct answer, and review state use words as well as color.
- Responsive behavior preserves question reading width. On phones the rail becomes a drawer, cards stack, and the top bar keeps Inbox and search available.

## The approved Practice Exams flow inside Practice

Joshua confirmed on 2026-09-28 that Practice is the student rail destination and Practice Exams is a distinct area inside it. This keeps the shorter rail without losing the [2026-09-26 Practice Exams decisions](2026-09-26-practice-exams-discovery.md). The first level is **Drills | Practice Exams**. Practice Exams then has **Overview | All Exams | Attempts** with links that reopen the same selected view.

Overview starts with **Start a full PrepTest** and **Start a timed section**. Below them, **Unfinished exams and sections** shows both kinds of work with a clear Continue action. All Exams lists PrepTests; a detail page shows sections, start options, and that student's attempts. Attempts lists in-progress and completed full exams and timed sections, with Results for completed work. General question history remains in Progress.

New full-exam attempts save answers, position, elapsed time, and results to the student's account database. The clock runs when the student changes browser tabs, but pauses when they leave the exam page or close the browser. A second device must explicitly take over and stop the first from saving. Existing results remain visible after access changes, while resume into inaccessible questions is blocked. Earlier browser-only runs without an account identity remain a separate migration limit; do not attach them to the next person who signs in.

The prototype illustrates these screens and states. It has no backend, does not start a clock, and does not prove cross-device resume or access behavior. The implementation must verify those against the real account and permission model.

## What to validate before adopting the design

Walk one current student through finding an assigned Activity, opening a recap, starting a timed section, reviewing a flagged question, and booking a session. Repeat on a 1024 px laptop and a phone. Confirm the student can locate Inbox quickly despite its move to the top bar. Inspect actual access tiers before placing Admissions or any other gated tab. Keep the approved Home v3 data and chart rules; this prototype does not replace that implementation brief.

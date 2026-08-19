# Classroom

The student's own room: the first surface a 1:1 student lands on. It is a reading surface, not a workspace. Its language is second person, and the coach is never named in the furniture.

## Terms

**Classroom frame** — the persistent layout every Classroom route is drawn in: the cream left rail, an optional middle list, and the white reading surface. Implemented by `ClassroomLayout`. Navigating between surfaces it draws swaps the content only and never remounts the rail. A page "sits in the Classroom frame" regardless of its URL; `/flagged` and `/journal` both do.

**StudentShell** — the older, separate frame with its own 240px rail, still drawing `/mainhub`, `/practice` and the rest. A student moving between a Classroom-frame page and a StudentShell page sees the whole page rebuild. Reducing that boundary is ongoing work, one surface at a time.

**Reading column** — the white content column. Most routes use one reading column on the right. A Wrong answers detail uses a four-column Classroom frame: cream rail, entries list, vertical question, and review panel. Below its journal-only breakpoints the entries list becomes an overlay and the review panel moves under the question.

**Drill landing workspace** — the pre-question surface at `/classroom/drill`, drawn inside the Classroom frame. It includes drill selection, launch controls, practice insights, and today's work; it excludes the official question-answering experience.
_Avoid_: Drill page (when the question experience could be confused with the landing surface), Mainhub

**Question finder** — the one control that turns something a student can say about a question into that question opened. It takes free text, matched against question text, and it takes a question address (PT 90, Section 1, Question 12) typed or picked from PrepTest / Section / Question selectors. It searches both banks and groups its results by bank, Logical Reasoning first, because a hit lands differently in each: an LR hit opens that one question, an RC hit opens its whole passage with every question on it. The finder is a finding aid, not the scope of the work it opens. It appears on Classroom Home and in the Drill landing workspace; it never builds a set, it hands that to the Drill console.
_Avoid_: search bar, command palette, spotlight, quick access, find bar

**Drill console** — the control surface inside the Drill landing workspace where a student assembles a set: the filters, the preview of the exact set, and the start action. Finding one named question is not its job; that is the Question finder.
_Avoid_: Control pane, picker card

**Drill canvas** — the route-specific visual composition to the right of the persistent Classroom rail, containing the Drill hero, Drill console, practice/insight workspace, and Today focus. The Classroom rail is not part of the canvas.
_Avoid_: Drill side pane, dashboard grid

**Section** — a middle-column list paired with the reading column: Notes and recaps, Assigned work, Flagged. A section is picked in the rail, lists its items in the middle column, and shows the chosen item in the reading column.

**Flag** — a come-back-to-this marker the student raises *during* a question, from a drill or a blind review. It records intent to return, and says nothing about whether the question was answered correctly. Stored in `flagged_questions`.

**Flagged question** — a question carrying a flag. The Flagged section is the student's unfinished business: questions they chose to set aside. Clearing a flag is the student's own act (Unflag), not something the system does when they get the question right.

**Wrong answer** — a question the student actually missed, recorded in `wrong_answer_journal` and worked through in Wrong answers at `/journal`. Distinct from a flag in both meaning and storage: a flag is chosen, a wrong answer is earned. A question can be both, one, or neither. Do not treat the two lists as views of the same thing.

**Journal entry** — the review of one wrong answer at `/journal/:qid`. The URL is the selection: it resolves only by `qid`, never by the journal row id, and `/journal` does not silently select the first entry. Its review fields autosave without a visible save state.

**Ask** — sending a question to the coach from the surface the student is looking at, with their own comment attached. Always labelled "Ask", never with the coach's name; the name belongs in messaging itself, not in the furniture that leads to it.

## Boundaries

The Classroom owns presentation and the student's own annotations of their work. It does not own the work: assignments, drills, attempts and the question bank all belong to their own contexts and are read here, not authored here.

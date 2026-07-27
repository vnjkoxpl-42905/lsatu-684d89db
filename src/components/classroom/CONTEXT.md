# Classroom

The student's own room: the first surface a 1:1 student lands on. It is a reading surface, not a workspace. Its language is second person, and the coach is never named in the furniture.

## Terms

**Classroom frame** — the three-part layout every Classroom route is drawn in: the cream left rail, the optional middle column, and the white reading column. Implemented by `ClassroomLayout`. The frame is persistent: navigating between surfaces it draws swaps the reading column only, and never remounts the rail. A page "sits in the Classroom frame" regardless of its URL; `/flagged` does, `/journal` does not.

**StudentShell** — the older, separate frame with its own 240px rail, still drawing `/mainhub`, `/practice`, `/journal` and the rest. A student moving between a Classroom-frame page and a StudentShell page sees the whole page rebuild. Reducing that boundary is ongoing work, one surface at a time.

**Reading column** — the white column on the right. The only place page content appears. Content is embedded here; the Classroom never takes over the screen.

**Section** — a middle-column list paired with the reading column: Notes and recaps, Assigned work, Flagged. A section is picked in the rail, lists its items in the middle column, and shows the chosen item in the reading column.

**Flag** — a come-back-to-this marker the student raises *during* a question, from a drill or a blind review. It records intent to return, and says nothing about whether the question was answered correctly. Stored in `flagged_questions`.

**Flagged question** — a question carrying a flag. The Flagged section is the student's unfinished business: questions they chose to set aside. Clearing a flag is the student's own act (Unflag), not something the system does when they get the question right.

**Wrong answer** — a question the student actually missed, recorded in `wrong_answer_journal` and worked through in the Wrong Answer Journal at `/journal`. Distinct from a flag in both meaning and storage: a flag is chosen, a wrong answer is earned. A question can be both, one, or neither. Do not treat the two lists as views of the same thing.

**Ask** — sending a question to the coach from the surface the student is looking at, with their own comment attached. Always labelled "Ask", never with the coach's name; the name belongs in messaging itself, not in the furniture that leads to it.

## Boundaries

The Classroom owns presentation and the student's own annotations of their work. It does not own the work: assignments, drills, attempts and the question bank all belong to their own contexts and are read here, not authored here.

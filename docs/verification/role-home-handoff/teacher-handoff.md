# Review the LSAT U teacher and admin dashboard

You are reviewing an implemented teacher Home, not creating a generic analytics dashboard. Open the accompanying `teacher-dashboard.html` in a browser first. If you cannot render HTML, inspect `teacher-dashboard.png` and the HTML source, and state that limitation. Do not claim browser or interaction verification from source alone.

## What the attachment represents

This is a self-contained offline export compiled from the current production TeacherHomeView and typed sample-data preview. Fonts, CSS, JavaScript and GSAP are embedded. No login, backend connection or real student messages are included. Buttons simulate or log actions; this does not prove production authorization, roster completeness, read receipts, persistence or calendar integrations.

The companion `student-dashboard.html` is intentionally different. The teacher is Joshua Fisseha, the instructor/admin. He does not receive student homework. Never show Assigned to you, homework waiting for him, student drill prompts or booking-purchase prompts on his Home.

## The owner's direction

- Preserve the approved warm white paper and ink contrast. Key colors: canvas `#f7f4ee`, ink `#252b26`, dark action surface `#131718`, action paper `#eeebe2`, on-dark text `#efede6`. Preserve the editorial display type and readable interface type. Do not add gold decoration, glass effects or fake premium styling.
- The teacher's jobs are to assign work, find a student, open student context, see genuinely unread conversations, and understand scheduled teaching work. Prioritize useful actions over decorative metrics.
- Keep the open, ruled composition and quiet supporting rail. Avoid boxed sections nested inside more boxes, duplicate actions and excess badges.
- Joshua specifically wants to retain the older sleek horizontal seven-day strip: rounded date cards, a dark current-day highlight and an inline week range. Keep it full-width below the dashboard grid rather than replacing it with a vertical list in the rail. Its labels must not invent availability or imply that a capped session feed is a complete calendar.
- Current Home sessions come only from platform `student_sessions`. They do not establish Google Calendar availability or the teacher's complete schedule. Do not invent empty-day availability, sync status, financial queues, tasks or counts.
- A conversation is unread when an incoming message is beyond the viewer's read receipt. Opening a loaded thread clears unread; responding is separate. The message must remain in history. The rail, Home and inbox should use the same unit: unread conversations.
- The full inbox redesign is a separate queued project. Focus this review on Home and its entry points. Do not expand into unrelated bookings, payment systems, curriculum, drill builders or a platform navigation rebuild.

## Inspect before recommending changes

1. Render the full-data dashboard at 1440, 980, 768, 390 and 320 CSS pixels, and in a narrow content pane equivalent to a docked sidebar. Inspect below the fold and long names/messages.
2. Assess the hierarchy between greeting, Assign work, unread conversations, student finder and upcoming sessions. Are the most useful actions clear without searching the page?
3. Test student filtering, including a student outside the initially visible recent list, no matches, clearing, keyboard Enter and Escape. Avoid a UI implying it searches more than the available data.
4. Inspect empty, loading, error, cold-role loading/error and cached-role refresh-error states. Failed reads must not turn into confident Nothing unread or No sessions statements. Cached content should remain usable with a retry notice.
5. Inspect conversation previews. Attention rows should show the unread incoming student message, even when the latest overall message is an outgoing teacher reply. Distinguish unread from needs reply.
6. Review keyboard focus, accessible names, contrast, touch targets, wrapping, zoom and reduced motion. Watch the brief GSAP entrance for double animation, blurry text, delayed controls and count-triggered replays.
7. Check the retained horizontal calendar strip, including its current-day highlight, small-screen scrolling and date labels. Distinguish displayed platform events from complete calendar availability. Do not present a proposed calendar integration as implemented.

## Output requested

Give a candid overall assessment, then concrete prioritized findings. For each, include severity, selector or source path, observed evidence, teacher impact and a specific correction. Separate functional defects, visual issues and optional design opportunities. Do not invent a quota of findings.

Preserve what works. If a revised design is useful, show a coherent hierarchy and calendar-strip proposal rather than scattered cosmetic changes. Explain effects on small screens, role isolation, data truthfulness, reading workflow and action count.

End with a coverage table of widths, states, interactions, motion and accessibility, plus unverified production dependencies. This request is for review. Do not publish, send messages, modify student work, change roles, or claim fixture actions prove backend correctness.

## Source orientation if the repository is available

- `src/components/classroom/home/teacher/TeacherHomeView.tsx`: exact teacher presentation and student filter.
- `src/components/classroom/home/teacher/teacherHomeModel.ts`, `useTeacherHome.ts`: mapping of roster, unread messages and platform sessions.
- `src/components/classroom/home/home.css`, `useHomeEntrance.ts`: shared visual and GSAP behavior.
- `src/components/classroom/home/ClassroomHome.tsx`, `src/hooks/useUserPermissions.ts`: permission resolution, cached failures and actor identity.
- `src/hooks/inboxSummaries.ts`, `src/hooks/useInbox.ts`: shared unread summaries, pagination and rendered-message read receipts.
- `docs/verification/role-home-preview.tsx`: typed sample data and simulation callbacks used by this export.
- `docs/verification/role-home-20261022.md`: earlier actual-app verification and limits.

The export is a presentation artifact; full shell navigation and backend contracts must be checked in the repository and authenticated app. Claude reviewed the spec and implemented source, but a usage limit interrupted its correction pass. Later independent source review found no remaining blocking findings. This does not constitute a final Claude approval or a production release.

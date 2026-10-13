# LSAT U Messaging Command Center Design Brief

Date: 2026-06-12

## Objective

Redesign LSAT U messaging from a generic inbox into a premium instant messaging platform for high-touch tutoring. The product should feel fast and efficient like a top-tier communication tool, but warm and personal like a direct coaching relationship with Joshua.

The core visual direction is **Hybrid Command Desk**: dark command structure, warm coaching conversation space, subtle academic cues, and richer stateful UI.

## Product Model

Messages, Gmail, and Drive remain separate workspaces, but they share a connected data layer.

- **Messages** is the student-thread-first communication center.
- **Gmail** remains a full Gmail-like surface. It should emulate Gmail in layout and behavior rather than becoming an LSAT U triage panel.
- **Drive** remains a file/source workspace.
- Admin Messages can retrieve Gmail and Drive data as tagged context.
- Student Messages should not expose Gmail, aliases, delivery intelligence, or admin-only context.

## Role Split

### Admin / Joshua

Admin Messages becomes a full communication command center:

- hybrid command-desk visual style
- right-side student intelligence panel
- Smart Delivery for Message / Email / Both
- Gmail data retrieval as context
- Drive and file context
- account email and alias linking
- advanced read/delivery status
- AI drafting and composer polish
- admin-only notes and follow-up tasks
- context-aware New command

### Student

Student Messages is visual/UX polish only for this phase:

- premium personal chat with Joshua
- simple, warm, low-density UI
- easy PDF, screenshot, and image attachment
- easy assignment/material context attachment
- no Gmail tab
- no email aliases
- no delivery recommendations
- no Smart Delivery training
- no admin notes
- no right-side intelligence panel

## Visual Direction

Use **Option 3: Hybrid Command Desk** from the preview.

The admin surface should combine:

- dark command sidebar/header for focus and sophistication
- warm parchment/off-white conversation canvas
- ink/navy message surfaces
- sage, terracotta, and brass accents for state and warmth
- subtle academic cues through type, file cards, assignment cards, and document treatments
- refined shadows, borders, and density

Avoid:

- sterile black-and-white
- generic SaaS inbox styling
- oversized empty white space
- random sparkles or AI decoration
- making Gmail look like an LSAT U-custom panel
- cluttering the student experience with admin intelligence

## Admin Layout

Desktop admin Messages should use three primary zones:

1. **Left thread list**
   - rich but scannable student rows
   - selected student state
   - last message
   - current assignment/material
   - timestamp
   - unread / needs reply / waiting state
   - attachment indicator
   - Gmail indicator when email exists or was used
   - read/delivery indicator where relevant

2. **Center conversation**
   - instant-message-first timeline
   - normal messages as polished bubbles
   - assignments as richer cards
   - files/PDFs as file cards
   - emails as event cards only when acted on/logged/used
   - subtle system timeline chips
   - admin-only status metadata kept compact

3. **Right intelligence panel**
   - pinned top summary
   - scrollable intelligence cards below
   - always available for Joshua on desktop
   - collapsible/adaptive on smaller screens

## Right Intelligence Panel

Use a **pinned top summary + scrollable cards** structure.

### Pinned Top Summary

Show the most important identity and work state:

- student name and status
- app account email
- linked Gmail aliases
- match confidence or alias note when relevant
- active bootcamp/current material
- current assignment and due date
- reply/read/delivery headline state

### Scrollable Cards

Include all of the following:

- **Student identity**: account email, linked emails, aliases, status.
- **Recent Gmail**: latest related Gmail threads, open/use as context.
- **Drive/files**: recent shared files, uploads, PDFs, attach from Drive.
- **Assignments/material**: active bootcamp, current assignment, due dates.
- **Smart Delivery**: recommendation, reason, training history.
- **Quick actions**: send assignment, request screenshot, schedule, create follow-up, link email alias.
- **AI reply context**: selected sources, summary, suggested response type, insert draft.
- **Admin notes/tasks**: follow-ups, reminders, warnings/preferences, waiting states.

## Gmail Integration

Gmail tab should remain a full Gmail-like workspace:

- inbox
- search
- threads
- labels
- compose/reply
- archive
- read/unread
- attachments

Messages should not become Gmail, but Messages can retrieve Gmail data as context.

Inside Messages:

- Gmail appears in the right panel as context and source material.
- Recent relevant Gmail threads can be used for AI drafts.
- If Joshua acts on an email, logs it, links it, or replies from Messages, show an email event card in the center timeline.
- Otherwise, email history stays in the right panel or Gmail tab.

## Identity Linking

Inbound emails should link to students intelligently:

- exact account email or saved alias links automatically
- high-confidence match can auto-link with a visible note
- medium/low confidence appears as unmatched with suggestions
- Joshua can confirm, reject, or create alias
- every confirmed match becomes durable account-linking data

Admin should always be able to tell why an email is linked:

- matched by account email
- matched by saved alias
- suggested by name/content/contact
- manually linked by Joshua

## Smart Delivery

The composer should support **Smart Delivery**:

- Message only
- Email only
- Both

Default behavior should be adaptive, not static.

The recommendation should consider:

- message type
- student history
- Joshua's prior choices
- attachments/files
- assignments
- urgency
- student app activity
- email effectiveness for that student
- previous overrides by Joshua

The system should save training data:

- recommended delivery
- final delivery choice
- reason/signals
- message category
- student
- whether Joshua overrode the recommendation
- engagement outcome if available

The AI should use a hybrid classification model:

- AI suggests message type while Joshua writes.
- Joshua can override the type.
- Overrides train future recommendations.

## Composer

Use a **compact composer that expands into a command composer on focus**.

### Default State

- clean message input
- attach button
- send button
- compact Smart Delivery pill such as `Smart: Both -> ethan@email.com`

### Focused / Active State

Show richer controls:

- message type chip
- Smart Delivery recommendation and reason
- Message / Email / Both selector
- attach PDF/image
- attach from Drive
- templates
- AI polish
- schedule/follow-up
- selected context sources
- override/training feedback

## AI Drafting

Use two AI surfaces:

1. **Right panel AI drafts**
   - generate a reply from selected context
   - summarize recent Gmail/message history
   - suggest message type
   - suggest delivery mode
   - show sources used
   - insert draft into composer

2. **Composer AI polish**
   - polish current text
   - shorten
   - soften
   - clarify
   - make it sound more like Joshua

## Read / Delivery State

Use admin-only advanced read and delivery intelligence.

Admin sees:

- thread read/unread
- needs reply
- delivered in-app
- read in-app
- emailed
- email opened/replied if available
- bounced/failed
- student inactive, email recommended
- manual mark read/unread

Student sees only simple, non-invasive messaging state.

## Attachments

Attachments should be first-class and role-aware.

Admin supports:

- PDFs
- screenshots/images
- Drive files
- Gmail attachments
- assignment/context cards

Student supports:

- PDFs
- screenshots/images
- assignment/drill context cards

Attachment cards should feel intentional, with preview metadata and clear source labels.

## Top Navigation

Keep the top-level idea:

- Messages
- Gmail
- Drive
- New

Refine it with richer state:

- Messages: unread/needs-reply count
- Gmail: sync status, unread or unmatched count
- Drive: recent/shared file count or sync status
- New: context-aware command button

## New Command

The New button should be context-aware.

If a student is selected:

- message student
- email student
- send both
- attach/send Drive file
- send assignment/material
- request screenshot/PDF
- schedule follow-up
- create internal note/task

If no student is selected:

- new message
- new email
- new assignment
- import/link contact
- upload/attach file

## Conversation Timeline Rules

Keep the center timeline primarily chat-first.

- Normal email history lives in the right context panel.
- Email appears inline only when Joshua acts on it, uses it as context, logs it, links it, or replies from Messages.
- Message bubbles remain lightweight.
- Assignments, files, and email events get richer cards.

## Student Messages UX

The student side should be a full Messages page, not primarily a floating widget.

Priorities:

- premium personal chat with Joshua
- easy screenshot/file attachment
- easy assignment/material context

It should share LSAT U design DNA but be warmer, simpler, and less dense than admin.

## First Design Pass Deliverables

The first redesign pass should produce:

- admin Messages desktop layout
- admin right intelligence panel
- admin composer collapsed/focused states
- rich thread row design
- mixed message/card timeline system
- student Messages visual refresh
- Gmail tab styling improvements only if they preserve Gmail-like behavior

## Open Implementation Questions

These should be answered during technical planning:

- Which Gmail data is already synced versus fetched live?
- Where should email aliases be stored?
- How are message delivery outcomes tracked today?
- Does the current schema support per-message read receipts?
- Should Smart Delivery training start rule-based before AI classification?
- What data is available for student activity and assignment context?
- How should admin notes/tasks relate to existing teacher/student records?


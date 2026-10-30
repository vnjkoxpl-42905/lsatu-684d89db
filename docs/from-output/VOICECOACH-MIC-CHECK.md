# VoiceCoach Mic Check (owed live verify)

Unblocks COMPREHENSIVEAUDIT **Phase 6E item 4** + **Phase 4 item 2**. Everything except the actual mic is done and code-verified; this is the only step a browser harness cannot drive (`getUserMedia` + `webkitSpeechRecognition`).

Regression guard already passed on current HEAD (post-`51e5587a` merge, 2026-07-10): chip renders after reveal, modal mounts, "Click to start recording" shows, 0 console errors. So the flow below is reachable; you are only testing the live mic + edge round trip.

## Setup
- Dev :8080 or prod lsatprep.study, admin login (memory `lsatu-app-login`). Use Chrome (webkitSpeechRecognition).
- Smart Drill (or any drill), auto-reveal ON.
- Answer a question -> "Explain your reasoning" chip appears below the question -> click it -> mic modal opens.

## Test 1 (6E-4): 1-min drill serves real questions
1. Click the mic, speak 3+ words for 2+ seconds explaining your answer, click to stop.
2. Wait for "Coach feedback", then click **1-min drill (2 Qs)**.
3. PASS = a real type-drill launches with 2 questions matching the current question's qtype + difficulty (no `micro-<ts>` placeholder ids). If the bank has no other matching question, PASS = a toast "No similar questions available for a mini drill right now." and no drill launches.
4. FAIL = fabricated/placeholder questions, or a `micro-<ts>` id, or a silent no-op.

## Test 2 (P4-2): error path shows a real error, mic releases
1. Force `voice-coach-respond` to fail: easiest is DevTools -> Network -> offline (or block the function URL), then record + stop.
2. PASS = modal shows "Could not process your explanation. Please try again." and returns to the idle mic state. NO coach feedback text appears (no fabricated analysis).
3. Mic release: after any recording stops, the browser tab mic indicator turns OFF (the getUserMedia probe stops its tracks immediately; recognition stops on stop). PASS = indicator not stuck lit for the rest of the session.
4. FAIL = canned/fabricated feedback shown instead of the error, or the mic indicator stays lit after stopping.

## After you run it
Tell the session the result; `/wrapup` moves both items to Done. If either fails, the fix lives in `src/components/drill/VoiceCoachModal.tsx` (micro_drill: L233-252; error path: L156-179; mic probe: L99-100).

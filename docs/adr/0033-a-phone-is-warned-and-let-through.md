# 0033 — A phone is warned and let through, so it must be able to advance

Date: 2026-09-04
Status: accepted

## Context

The drill advances on Space and on nothing else. That is deliberate and it is
the whole interaction: one key, no mouse in the loop, so her hands never leave
the argument.

A phone has no Space key.

The 2026-09-03 audit found what that costs. The briefing, the door and the
library all render correctly at 390x844, so nothing before the run said a
keyboard was required. She could open the drill, read stimulus 1, and then find
there was no way to reach stimulus 2 — by which point the recording was already
running and the take was already spoiled. The only control on the screen was
"Leave".

The order (W9) put two options to Joshua and refused to pick: support the
phone, or refuse it at the door. The recommendation was to refuse.

## Decision

**Neither. Warn her, and let her through.** Joshua's call, 2026-09-04, against
the recommendation.

That answer carries a requirement the order did not state, and it is the whole
of this ADR: **letting her through is only honest if she can actually run the
drill.** A warning followed by a screen she cannot advance is not a choice she
was given, it is a trap she was told about. So the decision is two things, and
neither works alone:

1. **The door says what the run needs.** A notice on `SectionLaunch` when the
   pointer is coarse: this is built for a laptop, it records for the whole
   section in one take so a call or a locked screen ends the run, the phone
   microphone hears her less well, and she can carry on if she wants to. It
   disables nothing. Start stays exactly where it was.
2. **The run gives her a way to advance.** An on-screen control in the stage
   footer calling the same `press()` the keyboard calls.

**`(pointer: coarse)`, not a width.** The question is "is there a keyboard",
not "is the screen small". A narrow desktop window has a keyboard and must keep
the pure one-key loop; a large tablet has none and needs the control. Width
answers neither, and `useIsMobile`'s 768px breakpoint would have got both wrong.

**Space stays authoritative everywhere,** including on the device that gets the
button. The control is an addition for a device that cannot reach the key, not
a second way of doing things.

**The control is not rendered where a keyboard exists.** This is the part that
protects the drill. "No mouse in the loop" is a rule about attention, and a
laptop run is untouched by this decision.

## Consequences

- It is drawn as chrome, not as a call to action: a large filled button in the
  footer of a drill that judges nothing would read as a verdict, and nothing in
  that footer may.
- It is disabled through the ready beat, for the same reason the key hint reads
  "in a moment": nothing may advance before the section has started.
- Its label names the next act ("Recall full stimulus", "Next stimulus") rather
  than a key, because on this device there is no key to name.
- 44px minimum height. A 25-minute run is many presses and a mis-tap costs a
  take that cannot be repeated.
- The known hazards of a phone run remain real and are now hers to accept: an
  incoming call suspends the tab, the microphone is worse, and
  `SpeechRecognition` is unreliable. The notice says so in her language. If
  those turn out to spoil real runs, the evidence for revisiting this is a run
  that ended early, not an argument.

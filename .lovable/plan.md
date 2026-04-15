

## Plan: Fix Stem Labels, Remove Quotes, Add Student Response Input

### Changes to `InteractiveStemDrill.tsx`

**1. Remove quotation marks from stem display (line 283)**
Remove the `"` characters wrapping the `<HighlightedStem>` component.

**2. Fix the header label (line 280)**
Change from "Analyze this stem" to just "Analyze This Stem" — keeping the existing label but confirming no "Question Stem" text exists (the current code already says "Analyze this stem"). Will audit for any other "question stem" references.

**3. Add a student response textarea in the `exercise` state**
Before the student clicks "Reveal Keywords", add:
- A prompt: "What do you think this means?"
- A `<textarea>` for the student to type their interpretation
- Store the response in component state (`studentResponse`)
- The response is optional — they can skip and reveal directly

**4. Show AI comparison in the `translation` state**
After the coach's translation is revealed, if the student typed a response:
- Call the Lovable AI gateway (Gemini Flash) with a prompt comparing the student's interpretation to the coach's translation
- Display the AI feedback in a new panel: "Your Analysis" showing their text + AI evaluation
- Show a loading state while the AI responds
- If no response was typed, skip this panel entirely

### Files modified
| File | Change |
|------|--------|
| `InteractiveStemDrill.tsx` | Remove quotes, add textarea + state, add AI comparison panel |

### State additions
```
studentResponse: string        // what the student typed
aiFeedback: string | null      // AI evaluation result  
isAnalyzing: boolean           // loading state for AI call
```

### AI prompt structure
```
"The student was given this abstract LSAT stem: [stem]. 
They interpreted it as: [student response]. 
The correct coach translation is: [coach translation].
Give brief, encouraging feedback (2-3 sentences). 
Note what they got right, and clarify anything they missed."
```

Uses `google/gemini-2.5-flash` via the Lovable AI edge function pattern — no API key needed.


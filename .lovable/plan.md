## Add `ai-prompt-box.tsx` component

**File to create:** `src/components/ui/ai-prompt-box.tsx` — paste the provided `PromptInputBox` component verbatim.

**Dependencies:** All four (`lucide-react`, `framer-motion`, `@radix-ui/react-dialog`, `@radix-ui/react-tooltip`) are already installed in the project — no install needed.

**Notes / minor cleanups during paste:**
- Guard the top-level `document.head.appendChild(styleSheet)` with `if (typeof document !== 'undefined')` to be safe (no-op in this CSR app, but cleaner).
- Component is dark-themed with hardcoded hex colors (`#1F2023`, `#444444`, etc.) rather than our semantic tokens. Pasting as-is per your request; we can later refactor to design tokens if you want it to match the bronze/glass system.
- No `demo.tsx` file will be created (the demo snippet in your paste is incomplete/garbled). Usage example:
  ```tsx
  import { PromptInputBox } from "@/components/ui/ai-prompt-box";
  <PromptInputBox onSend={(msg, files) => console.log(msg, files)} />
  ```

**Out of scope:** Wiring it into any page (Inbox, TutorChatModal, etc.). Let me know where you want it used next.

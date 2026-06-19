# Model Picker Next to Send Button (Gemini + ChatGPT, all tiers)

Add a model picker pill immediately to the left of the send (↑) button in the Teacher Desk composer. Lets you pick any supported Gemini or GPT model — every tier exposed, grouped by provider. Selection persists and is used for the next message.

## UX

- Small pill button left of the send button. Shows the active model's short label + chevron.
- Click opens a dropdown grouped by provider, with all models listed and a check on the active one. Each row shows label + short hint (e.g. "fastest", "balanced", "smartest").
- Choice persists in `localStorage` under `desk.assistant.model`. Default = `google/gemini-3-flash-preview`.
- Tooltip on the pill = full model id.

## Models exposed (all viable via Lovable AI Gateway)

**Google — Gemini**
- `google/gemini-3-flash-preview` — Gemini 3 Flash (default, fast)
- `google/gemini-3.1-flash-lite` — Gemini 3.1 Flash Lite (cheapest)
- `google/gemini-3.5-flash` — Gemini 3.5 Flash (fast + strong)
- `google/gemini-3.1-pro-preview` — Gemini 3.1 Pro (smartest preview)
- `google/gemini-2.5-pro` — Gemini 2.5 Pro (strong multimodal)
- `google/gemini-2.5-flash` — Gemini 2.5 Flash (balanced)
- `google/gemini-2.5-flash-lite` — Gemini 2.5 Flash Lite (cheap/fast)

**OpenAI — ChatGPT**
- `openai/gpt-5` — GPT-5 (all-rounder)
- `openai/gpt-5-mini` — GPT-5 Mini
- `openai/gpt-5-nano` — GPT-5 Nano (fastest/cheapest)
- `openai/gpt-5.2` — GPT-5.2
- `openai/gpt-5.4` — GPT-5.4 (advanced reasoning)
- `openai/gpt-5.4-mini` — GPT-5.4 Mini
- `openai/gpt-5.4-nano` — GPT-5.4 Nano
- `openai/gpt-5.4-pro` — GPT-5.4 Pro
- `openai/gpt-5.5` — GPT-5.5 (most capable)
- `openai/gpt-5.5-pro` — GPT-5.5 Pro (premium)

## Frontend changes

1. **New** `src/pages/teacher/desk/ModelPicker.tsx`
   - Exports `AVAILABLE_MODELS` (id, label, provider, hint) and a `<ModelPicker value onChange />` component built on Radix `DropdownMenu`, styled to match the dark composer.
2. **Edit** `src/pages/teacher/desk/AssistantComposer.tsx`
   - Add `selectedModel` state hydrated from localStorage; persist on change.
   - Render `<ModelPicker />` in the right-side action row, just before the send button (line ~620).
   - Add `model: string` to `ComposerSubmitSources`; include it in the `onSubmit` payload (line ~224).
3. **Edit** `src/pages/teacher/desk/DeskChatPanel.tsx` and `src/pages/teacher/desk/MiniChat.tsx`
   - Forward `sources.model` into the `context` object sent to the operator (`context.model = sources.model`).

## Backend changes

`supabase/functions/teacher-operator-chat/index.ts`
- Add an `ALLOWED_MODELS` set containing exactly the ids above.
- Read `context.model`; if present and allow-listed, pass it to the chat call instead of the hardcoded `"google/gemini-3-flash-preview"` (line 827). Otherwise fall back to the default.
- Redeploy `teacher-operator-chat`.

## Out of scope

- Per-message override (selection is sticky).
- Image / TTS / embeddings model selection — text chat only.
- Anthropic Claude (not on the gateway).

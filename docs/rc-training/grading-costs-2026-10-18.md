# RC grading cost controls

Checked on 2026-10-18 against official provider documentation.

- Deepgram Nova-3 monolingual prerecorded transcription: USD0.0043 per audio minute, billed by audio duration. [Deepgram pricing](https://deepgram.com/pricing).
- Gemini3.1 Flash-Lite text judgment: USD0.25 per million input tokens and USD1.50 per million output tokens. [Google pricing](https://ai.google.dev/gemini-api/docs/pricing).
- Lovable lists Gemini3.1 Flash Lite for inexpensive, high-volume text tasks and bases gateway rates on provider costs. Gateway grants/account credits and actual bills remain account-specific. [Lovable AI documentation](https://docs.lovable.dev/features/ai).

Use one transcription per continuous recording, then reuse timestamped words for its recall windows. Reading and checking remain in the private recording but are excluded from the text judged for each paragraph. Persist immutable source/audio hashes, ASR version, rubric version and results. Cache ready grades and reuse confirmed transcripts after judging failures. Do not add automatic premium-model fallback or unbounded retries.

Illustrative estimate, not a billing promise: 20 recorded minutes cost USD0.086 for transcription. Eight paragraph judgments at 3,000 input and 1,000 output tokens each add USD0.018, for USD0.104 total before storage, other hosting charges and account-specific gateway billing. Real lengths and token counts vary. Recording all reading/checking time increases transcription cost compared with submitting recall speech alone.

The numerical grade must be computed from fixed source units with explicit points, not generated as a model-supplied percentage. Model suitability is established through accurate-paraphrase, omission, changed-claim and audio-window acceptance controls; a low price alone does not establish grading quality.

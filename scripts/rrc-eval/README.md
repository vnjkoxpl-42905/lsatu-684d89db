# Evaluate LR Recall meaning judgments

Run from this repository root with its installed dependencies:

```powershell
npx vite-node scripts/rrc-eval/run.ts -- --dry-run
```

The default is offline. It checks source and original script SHA-256 hashes, question citations and every expected detail against the authored question key. It uses the shared production prompt builder and parser, and writes prompt/hash manifests under `verification/rrc-meaning-eval/<timestamp>/`. A passing dry run is not evidence that the AI graded anything correctly.

After review, the explicit provider-call command is:

```powershell
npx vite-node scripts/rrc-eval/run.ts -- --run
```

This uses an **existing** `GEMINI_API_KEY` from the process, the central `~/dev/ai-os/.env`, or this repository's `.env`. It never prints or persists that key. If none exists it stops with zero calls. The deployed proxy requires its private internal key; the harness does not bypass that restriction, log in, create credentials or fall back to another service.

The runner uses Gemini 3.1 Flash-Lite, temperature zero, at most 15 sequential calls, no retries and a 8,192 output-token cap. It does not override the model's thinking configuration. Before any call it reserves a conservative batch allowance using UTF-8 prompt bytes plus envelope overhead as the input-token bound, the output cap, and direct rates of $0.25/M input and $1.50/M output. It refuses a reservation above $0.50. This reservation is not a provider invoice. Actual token usage is preserved in the report. Stop on the first provider or parser error; rerunning is a new paid batch. The direct Google route differs from the production gateway route, so this is not a full runtime-parity test. Both code paths now request the same output-token cap. The report records the generation configuration.

The harness reads local fixture transcripts and source questions only. It does not listen to audio, independently establish script-to-recording alignment, read or modify student attempts, inject an instructor walkthrough, publish code, or regrade stored results. Owner-designated 10/10 performances and authored expected detail coverage are distinct assertions. The source fixture provenance records that distinction. Reports include both false deductions on expected paraphrases and missed meaning changes in altered controls.

# Spot the Relationship instruction film

An eight-scene, approximately 65-second narrated walkthrough, built from deterministic JavaScript canvas frames and local Kokoro speech. No paid generation API is called. It demonstrates the task and response format, conditional, causal and comparative examples, then a sentence with two relationship types. It does not reveal a live exercise answer or narrate attempt limits.

## Edit and regenerate

1. Edit `script.json`. This is the narration source. The entry-page transcript was explicitly removed by Joshua on 2026-10-15; do not restore it.
2. Run `build_audio.py` with a Python interpreter containing `kokoro_onnx`, `numpy` and `soundfile`. The existing `contrapositive-video/.venv/Scripts/python.exe` provides these on Joshua's Windows machine. The local model defaults to `~/.cache/hyperframes/tts/models/kokoro-v1.0.onnx`, voices to `~/.cache/hyperframes/tts/voices/voices-v1.0.bin`; environment variables `KOKORO_MODEL` and `KOKORO_VOICES` override them. This directly uses the installed local engine, not HyperFrames cloud rendering.
3. Run `node scripts/media/spot-the-relationship/render.cjs` from the app root with FFmpeg on PATH and `@napi-rs/canvas` available to Node. Set `NODE_PATH` to an existing installation's `node_modules` if needed. Codex's bundled workspace dependencies provide canvas; the production app does not depend on it.
4. Inspect `.render/contact-sheet.jpg` and actual playback. Check narration, captions, readable examples, all answer pairs and the mixed example. `--stills` renders only the review sheet and poster; `--encode-only` reuses existing numbered JPEG frames after an encoding failure. Do not reuse frames after changing the composition or timing.

Generated deliverables: `public/media/spot-the-relationship/how-to-play-v1.mp4`, `.webp` poster, and `.vtt` captions. The MP4 uses H.264/AAC, 1280 by 720, 24 fps, with a fast-start header. Intermediate audio and numbered frames remain ignored under `.render/`.

Windows FFmpeg N-126374's default AAC coder stalls on the existing narration WAV, including an audio-only encode. `-aac_coder fast` completes the full WAV; disabling PNS alone still stalls. The renderer first encodes AAC with `-aac_coder fast -aac_pns 0`, then copies that audio while encoding the existing JPEG frames to H.264. Decoder, filter and video encoder threading remain constrained; threading was not established as the cause. Each FFmpeg stage has a three-minute timeout. Reproduce without regenerating frames or narration with `node scripts/media/spot-the-relationship/render.cjs --encode-only`; successful encoding also finalizes the poster, captions and contact sheet.

## Inline behavior

The entry page uses native playback controls and English captions. Playback is user-initiated, with no autoplay or forced completion. The player requests no video bytes until used (`preload="none"`). Written instructions remain available with an explicit playback-error fallback. The transcript disclosure beneath the video was removed at Joshua's request on 2026-10-15. Watching the film does not mark activity progress.

The film's colors distinguish labeled relationship types within this activity only. They are not new global design tokens. The narration and layout implement Joshua's request and remain open to his review.

## Workspace provenance

The second-brain source is `wiki/sources/claude-now-does-video-free-javascript.md` in ai-os, compiled from the Chase AI clip. Existing local narration precedent: sibling `contrapositive-video/lecture`. That older film uses HyperFrames/HTML/SVG; this film renders JavaScript canvas directly to JPEG frames, then FFmpeg, while reusing its installed offline speech engine. The two workflows are distinct.

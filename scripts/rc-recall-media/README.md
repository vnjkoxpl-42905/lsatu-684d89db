# RC Recall media pipeline

Local only. Nothing here is uploaded, deployed, committed or placed under `public/`.

**Status: local-only media build.** The manifest's `verified` field stays false until
the edit-boundary review is complete. Each clip has MP3 and plain-text transcript
downloads in the app. Captions and transcripts are machine-generated, not checked by
a person.
The app hides every player until
`VITE_RC_RECALL_MEDIA_BASE` is set, and hides Watch Instructions until
`VITE_RC_RECALL_INSTRUCTIONS_VERIFIED=true` as well.

## Run it

Needs `ffmpeg` and `ffprobe` on PATH.

```
node scripts/rc-recall-media/build.mjs            # examples + instruction video
node scripts/rc-recall-media/build.mjs --reuse-existing # validate existing clips; build missing ones + instruction video
node scripts/rc-recall-media/build.mjs --only examples
node scripts/rc-recall-media/serve.mjs            # http://127.0.0.1:8787
VITE_RC_RECALL_MEDIA_BASE=http://127.0.0.1:8787 npm run dev
```

Sources default to `C:/Users/Joshu/dev/ai-os/Loophole Lecture` (override with
`RC_RECALL_SOURCE_ROOT`). They are only read. Output goes to `.local-media/rc-recall/`
(override with `RC_RECALL_MEDIA_OUT`), which Git ignores.

## What it makes

- 480p / 30 fps H.264 + AAC MP4s, MP3 audio, WebVTT captions, and plain-text transcripts for the seven
  Cumulative Recall (source: Decaf) clips, the RC Recall (source: Cappuccino) note
  and the three RC Recall examples.
- Each source VTT is checked against its video's length before it is copied, and is
  stamped as auto-generated and not human-verified.
- `how-and-why-to-do-rc-recall.mp4`, `.mp3`, `.vtt` and `.txt`: the two full strategy videos with
  chapter cards ("The source calls Cumulative Recall “Decaf”", "The source calls RC
  Recall “Cappuccino”"). The Cappuccino 35-minute variant is cut (two ranges in
  `config.mjs`). Captions are re-timed for the cards and cuts.
- `manifest.json` with sizes, SHA-256 and a budget check (200 MB target; passage-text
  legibility overrides it). `verified` is always written as `false`.

## Before building everything

The recordings show the instructor, not passage text. Inspect a representative
presenter frame and verify that each source WebVTT covers its clip duration.
Captions are auto-generated and are not a human-verified transcript.

## Edit boundary checks (required before enabling Watch Instructions)

`build.mjs` writes `_qa/join-NN.mp3` (8 seconds around each join) and
`_qa/join-NN.txt` (the captions near it). For every join:

1. Play the audio. No clipped word, no half sentence, no audible jump.
2. Read the caption text. It matches what is said, at the same moment.
3. Confirm the cut-in after the second Cappuccino cut ("Got it. And like I said…")
   still reads as a complete thought. Move the cut points in `config.mjs` if not.
4. Watch both chapter cards. The names read exactly as above.
5. Confirm the finished video never presents the 35-minute variant as an option.

Only then set `VITE_RC_RECALL_INSTRUCTIONS_VERIFIED=true` locally.

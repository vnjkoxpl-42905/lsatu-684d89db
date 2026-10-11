# Necessary-condition film, 2026-10-10

Joshua requested verification/restoration of the earlier sufficient-condition Kling films and a similar new necessary-condition film. Local only: no commit, push or deployment.

## Generation receipt

- Official Kling CLI 0.2.x, authenticated existing installation.
- Model: `kling-video-v3_0`; duration: 11 seconds; resolution: 720p; ratio: 16:9; native audio and multishot enabled; one output.
- Live account before submission: 106 credits. Submission charged 99 credits.
- Generation ID: `AY4N74tL-kd-J5zSi0EjGO_x23OPmHGOdV9YDcsLZEMW6P0iNB8LnNzQ51HvSsVAf-i7cTtC`.
- Initial status: QUEUING. Completion and verification recorded below when available.

## Exact prompt

Create a quiet cinematic educational film for an LSAT lesson, natural live-action university footage, warm ivory walls, navy clothing, wood desks, soft window daylight, restrained camera movement and realistic adult students. Two clear shots: first an adult law-school student reading in a university law library; second a different adult history student studying an old map and history books at a library desk. These are illustrative examples, not the same person switching subjects. No graphics, no on-screen words or subtitles, no logos, no diagrams, no magical changes, no music. Clear calm English offscreen teacher narration, warm measured ordinary speaking voice, exactly these words: Law-school enrollment requires being a student. But studying history also makes you a student. That requirement alone does not establish law-school enrollment. Finish the entire narration naturally within eleven seconds. The law student and history student are both students; never imply being any student guarantees enrollment in law school.

## Placement

The original two sufficient clips are restored as optional examples after the definition and interactive group visual, with explicit hypothetical context. Their later missing-requirement placement is preserved. The new necessary film follows the requirement comparison, before Group 2 indicators. Written explanations and learner-controlled playback remain available.

## Completed and verified

- Kling returned COMPLETED. Original output: https://v15-kling.klingai.com/bs2/upload-ylab-stunt-sgp/fc9837f0-abf0-4bff-afd1-b868803a9a41-o4HQzAkgVDjUcbe5HXwWpQ-output.mp4?x-kcdn-pid=112372
- Original preserved in `originals/required-not-enough.mp4`. Optimized H264/AAC faststart output, poster and WebVTT captions are in `public/media/conditionals/necessity/`. No further generation was submitted.
- Public MP4 SHA256: `b32e59e98a5b14e16e8fb262d0a54e76cee1c15c1c8ad1d248478c0128bbdd42`.
- Local faster-whisper `base.en` transcription of the final embedded MP4 matches the intended spoken words. Receipt: `verification/required-not-enough.transcript.json`. Automated transcription does not certify subjective voice quality.
- Six sampled frames inspected in `verification/necessary-frames.jpg`: two distinct adult students, books/map, natural university-library lighting and navy clothing. Similar visual style to existing films; no claim of identical speaker or character continuity.
- Codex Browser: both restored sufficient clips played; changing clip resets paused at time zero. All three media files reached readyState4 and caption readyState2. Necessary video advanced past 7 seconds with captions visible. Native keyboard playback tested; no autoplay.
- Navigation from sufficient clip 2 to necessary leaves the new player available. Distinct definition-player keys and regression coverage protect player selection state.
- Both pages at actual CSS widths 320, 400, 960, 1200 and 1600: no document overflow or visible lesson buttons below44px. Viewport override reset. Actual devices and screen-reader speech were not tested.
- 35 focused tests passed; 14 affected course tests passed again after navigation-key revision. Full app typecheck passed. Final code build/postbuild passed (`films-20261010-build.log`); that build preceded arrival of the new static media. The final media was verified through the local Vite preview.
- Screenshot: `C:/Users/Joshu/.codex/visualizations/2026/10/10/01a1282c-ac7e-7380-90fe-9ca58e32512f/necessary-film-playing.png`.
- Local only. No commit, push, deployment or claim of production acceptance.

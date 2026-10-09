# Local speech verification, 2026-10-09

Run the reusable script through an isolated uv environment:

```powershell
uv run --with faster-whisper --with av==16.1.0 python docs/agent/conditional-recovery-20261007/media/verification/transcribe_clip.py public/media/conditionals/sufficiency/enough-to-know.mp4 --output docs/agent/conditional-recovery-20261007/media/verification/enough-to-know.transcript.json
```

The CPU int8 `base.en` model is cached. Media is processed locally; no transcription API receives the audio. Hugging Face supplies public model weights during initial preparation.

Both generated clips transcribed to their intended narration, including Maya's name and the sufficient-condition guarantee versus the unknown reverse inference. This is automated speech evidence, not speaker identity verification or a substitute for listening and visual inspection.

`enough-to-know.mp4` contains H264 1920×1080 video at 24 fps and AAC audio. Container duration is 15.041995 seconds. The recognizer places the last segment end at 15.27 seconds, slightly beyond the actual duration; any captions should clamp that end to the media duration. Keep raw transcription timestamps in the receipt as evidence.

Initial latest-PyAV execution failed with `TypeError: open() got an unexpected keyword argument 'metadata_errors'`. Pinning `av==16.1.0` in the ephemeral uv environment resolved it. No global package installation or CLI authentication change was needed.

Transcript receipts record media SHA256 hashes, model configuration, duration, full text and timestamped segments.

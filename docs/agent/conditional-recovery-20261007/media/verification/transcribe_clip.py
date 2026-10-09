"""Local speech review; run with uv run --with faster-whisper --with av==16.1.0 python this_file.py.

Transcription is evidence for human review, not proof that every spoken word is correct.
Audio remains local. Model weights may download from Hugging Face on first use.
"""

import argparse
import hashlib
import json
from pathlib import Path

from faster_whisper import WhisperModel


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", nargs="?", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--model", default="base.en", choices=("base.en", "small.en"))
    parser.add_argument("--prepare", action="store_true", help="Cache and load model only")
    args = parser.parse_args()
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    if args.prepare:
        print(json.dumps({"ready": True, "model": args.model, "device": "cpu", "compute_type": "int8"}))
        return
    if args.video is None or args.output is None:
        parser.error("video and --output are required unless --prepare is used")
    source = args.video.resolve(strict=True)
    segments, info = model.transcribe(str(source), language="en", beam_size=5, vad_filter=True)
    rows = [{"start": segment.start, "end": segment.end, "text": segment.text.strip()} for segment in segments]
    with source.open("rb") as stream:
        source_hash = hashlib.file_digest(stream, "sha256").hexdigest()
    receipt = {
        "source": str(source),
        "sha256": source_hash,
        "model": args.model,
        "device": "cpu",
        "compute_type": "int8",
        "language": info.language,
        "duration_seconds": info.duration,
        "text": " ".join(row["text"] for row in rows),
        "segments": rows,
        "verification_note": "Automated local transcription; manually check names, logical claims, and wording against intended narration.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"receipt": str(args.output.resolve()), "text": receipt["text"]}))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Prove the printable drill is real text, not a picture of text.

The PDF is rendered by Chromium from the same HTML as the interactive file. If
a style change ever pushes it down the rasterising path, it still looks perfect
in a viewer, still has the right page count, and is silently useless: the
student cannot select a phrase to search, and nothing in the build would fail.

So this asserts the actual words are in there. It reads the manifest, pulls
each question's stimulus out of the bank, and requires a distinctive run of
that stimulus to appear in the extracted text.

Comparison is on letters and digits only. PDF extraction reflows lines,
hyphenates across breaks, and turns some spaces into nothing at all; none of
that changes whether the words are present, and all of it breaks a naive
substring match.

Usage: verify-drill-pdf.py <manifest.json>
Exit 0 when every check passes, 1 otherwise.
"""
import json
import pathlib
import re
import sys

try:
    from pypdf import PdfReader
except ImportError:
    print("FAIL  pypdf is not installed (pip3 install pypdf)")
    sys.exit(1)

BANK_DIR = pathlib.Path("public/data")

# How much of a stimulus has to be found. Long enough to be distinctive, short
# enough to survive a page break landing in the middle of it.
PHRASE_CHARS = 60

failures = 0


def check(label, ok, detail=""):
    global failures
    print(f"  {'ok  ' if ok else 'FAIL'}  {label}{f' — {detail}' if detail else ''}")
    if not ok:
        failures += 1


def squash(text):
    """Letters and digits only, lowercased."""
    return re.sub(r"[^a-z0-9]", "", text.lower())


def stimulus_for(qid):
    m = re.match(r"^(PT\d+)-S(\d+)-Q(\d+)$", qid)
    if not m:
        return None
    path = BANK_DIR / f"{m.group(1)}-S{m.group(2)}-LR.json"
    if not path.exists():
        return None
    for q in json.loads(path.read_text()):
        if (
            q.get("practiceTest") == m.group(1)
            and q.get("sectionNumber") == int(m.group(2))
            and q.get("questionNumber") == int(m.group(3))
        ):
            return q.get("stimulus")
    return None


def main():
    if len(sys.argv) < 2:
        print("usage: verify-drill-pdf.py <manifest.json>")
        return 1

    manifest = json.loads(pathlib.Path(sys.argv[1]).read_text())
    pdf_entry = manifest.get("files", {}).get("pdf")
    if not pdf_entry:
        print("  ok    no PDF in this manifest, nothing to check")
        return 0

    pdf_path = pathlib.Path(pdf_entry["path"])
    check("pdf exists", pdf_path.exists(), str(pdf_path))
    if not pdf_path.exists():
        return 1

    reader = PdfReader(str(pdf_path))
    pages = len(reader.pages)
    check("has pages", pages > 0, f"{pages} pages")

    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    squashed = squash(text)

    # A rasterised PDF extracts to almost nothing. A real one carries the whole
    # drill, so the floor is set well above "a title and a page number".
    check("carries selectable text", len(squashed) > 2000, f"{len(squashed)} characters")

    missing = []
    unavailable = []
    for qid in manifest["qids"]:
        stimulus = stimulus_for(qid)
        if not stimulus:
            unavailable.append(qid)
            continue
        needle = squash(stimulus)[:PHRASE_CHARS]
        if len(needle) < 20 or needle not in squashed:
            missing.append(qid)

    check(
        "every question's stimulus appears",
        not missing,
        f"missing: {', '.join(missing)}" if missing else f"{len(manifest['qids'])} questions",
    )
    if unavailable:
        check("every question was readable from the bank", False, f"not found: {', '.join(unavailable)}")

    # The key is what makes the printed version usable on its own.
    check("answer key is present", "answerkey" in squashed or "answers" in squashed)

    print(f"\n{'PASS' if failures == 0 else 'FAIL'}  {pdf_path.name}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

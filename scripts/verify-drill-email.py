#!/usr/bin/env python3
"""Check the drill email with an implementation that did not write it.

scripts/lib/mime.mjs assembles the message by hand. A hand-rolled encoder that
validates itself proves nothing, so this parses the result with Python's
stdlib email package and compares the attachments byte for byte against the
files on disk and the hashes in the manifest.

It also enforces the house rule the generator cannot check for itself: no
em-dashes anywhere a student reads. Joshua does not type them, and one in a
drill email is the tell that a machine wrote it.

Usage: verify-drill-email.py <manifest.json> [draft.eml]
Exit 0 when every check passes, 1 otherwise.
"""
import email
import email.policy
import hashlib
import json
import pathlib
import sys

failures = 0


def check(label, ok, detail=""):
    global failures
    print(f"  {'ok  ' if ok else 'FAIL'}  {label}{f' — {detail}' if detail else ''}")
    if not ok:
        failures += 1


def main():
    if len(sys.argv) < 2:
        print("usage: verify-drill-email.py <manifest.json> [draft.eml]")
        return 1

    manifest_path = pathlib.Path(sys.argv[1])
    manifest = json.loads(manifest_path.read_text())
    eml_path = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else manifest_path.parent / "draft.eml"

    check("draft exists", eml_path.exists(), str(eml_path))
    if not eml_path.exists():
        return 1

    raw = eml_path.read_bytes()

    # Every line break in a MIME message is CRLF. A lone LF is the classic way
    # a hand-built message parses locally and is rejected or mangled upstream.
    lone_lf = raw.replace(b"\r\n", b"").count(b"\n")
    check("no lone LF line endings", lone_lf == 0, f"{lone_lf} found")

    longest = max((len(line) for line in raw.split(b"\r\n")), default=0)
    check("no line over the RFC 5322 limit", longest <= 998, f"longest {longest}")

    msg = email.message_from_bytes(raw, policy=email.policy.default)
    check("parses as a MIME message", msg is not None)
    check("is multipart/mixed", msg.get_content_type() == "multipart/mixed", msg.get_content_type())
    check("sets no From header, so Gmail stamps the sender", msg.get("From") is None)
    check("has a subject", bool(msg.get("Subject")), msg.get("Subject") or "")

    parts = list(msg.walk())
    types = [p.get_content_type() for p in parts]
    check("offers a plain-text alternative", "text/plain" in types, ", ".join(types))
    check("offers an HTML body", "text/html" in types)

    # Bodies, for the copy rules. Attachments are excluded: the drill itself
    # carries LSAT prose that is not Joshua's writing.
    bodies = [
        p.get_content()
        for p in parts
        if p.get_content_maintype() == "text" and not p.get_filename()
    ]
    check("found the rendered bodies", len(bodies) >= 2, f"{len(bodies)} parts")

    dashes = [b for b in bodies if "—" in b or "–" in b]
    check("no em-dashes in anything the student reads", not dashes, f"{len(dashes)} part(s) contain one")

    # Attachments must be exactly the files that were verified, not a re-encode.
    attachments = {p.get_filename(): p.get_payload(decode=True) for p in parts if p.get_filename()}
    expected = {}
    for kind, entry in manifest.get("files", {}).items():
        expected[pathlib.Path(entry["path"]).name] = entry

    check(
        "carries every generated file",
        set(attachments) == set(expected),
        f"attached {sorted(attachments)} vs expected {sorted(expected)}",
    )

    for name, entry in expected.items():
        payload = attachments.get(name)
        if payload is None:
            check(f"{name} attached", False)
            continue
        digest = hashlib.sha256(payload).hexdigest()
        check(f"{name} survives the round trip", digest == entry["sha256"], digest[:12])
        check(f"{name} is the size the manifest recorded", len(payload) == entry["bytes"], str(len(payload)))

    # A text/html attachment gets a preview in Gmail; octet-stream does not.
    html_name = pathlib.Path(manifest["files"]["html"]["path"]).name
    html_part = next((p for p in parts if p.get_filename() == html_name), None)
    if html_part is not None:
        check(
            "the drill is attached as text/html so Gmail previews it",
            html_part.get_content_type() == "text/html",
            html_part.get_content_type(),
        )

    print(f"\n{'PASS' if failures == 0 else 'FAIL'}  {eml_path.name}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

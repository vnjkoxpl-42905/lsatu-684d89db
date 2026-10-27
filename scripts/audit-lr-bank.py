#!/usr/bin/env python3
"""Audits every LR question in public/data for formatting a student would see.

Companion to repair-lr-bank.py: this one only reports. Run it after any bank
import to catch records that would render wrong before a student meets them.

The checks, in the order they cost a student:

  missing-stimulus           the left column renders empty
  split-stem                 the stem's first half is stranded on the stimulus
  answer-choice-in-stimulus  a choice leaked into the passage
  stem-text-in-stimulus      stem wording sits inside the passage
  authoring-marker / html    import artifacts that render literally
  hard-wrapped               newlines from the printed test's column; these are
                             reflowed at render by unwrapSourceLineBreaks, so
                             they are reported for information, not as defects

Exit code is 1 when any student-visible defect is found, 0 otherwise.
"""
import argparse
import collections
import glob
import json
import re
import sys

STEM_RE = re.compile(r'which one of the following|the (argument|reasoning) above', re.I)
BAD_CP = re.compile('[�\x00-\x08\x0b\x0c\x0e-\x1f]')
BLANK_TAIL = re.compile(r'(_{3,}|\.\.\.|…)\s*[.:]?\s*$')
TERMINAL = re.compile(r'[.!?"”\'\)\]]\s*$')

# Reported but not failing: the renderer already handles these.
INFORMATIONAL = {'hard-wrapped', 'hyphen-split-word'}


def audit(paths):
    rows, counts, total = [], collections.Counter(), 0
    for path in paths:
        name = path.split('/')[-1]
        try:
            data = json.load(open(path))
        except Exception as exc:
            counts['unparseable-file'] += 1
            rows.append((name, '-', 'unparseable-file', str(exc)[:80]))
            continue
        questions = data['questions'] if isinstance(data, dict) and 'questions' in data else data
        for q in questions:
            total += 1
            qid = '%s-S%s-Q%s' % (q.get('practiceTest'), q.get('sectionNumber'), q.get('questionNumber'))

            def flag(kind, detail=''):
                counts[kind] += 1
                rows.append((name, qid, kind, str(detail)[:100]))

            stim = q.get('stimulus')
            stem = q.get('questionStem') or ''
            if not isinstance(stim, str) or not stim.strip():
                flag('missing-stimulus')
            else:
                body = [l for l in stim.split('\n') if l.strip()]
                if len(body) > 1 and any(
                    not re.search(r'[.!?:;"”\)]$', l.strip()) for l in body[:-1]
                ):
                    flag('hard-wrapped', 'longest source line %d chars' % max(len(l) for l in body))
                if '{#' in stim:
                    flag('authoring-marker', stim[max(0, stim.find('{#') - 20):stim.find('{#') + 20])
                for pattern, kind in (
                    (r'<[a-zA-Z/][^>]*>', 'html-tag'),
                    (r'&[a-z]+;|&#\d+;', 'html-entity'),
                    (r'\S{0,12}-\n[a-z]\w{0,12}', 'hyphen-split-word'),
                ):
                    m = re.search(pattern, stim)
                    if m:
                        flag(kind, m.group(0).replace('\n', '\\n'))
                if BAD_CP.search(stim):
                    flag('bad-codepoint', repr(BAD_CP.search(stim).group(0)))
                if re.match(r'^\s*\(?\d+[.)]\s', stim):
                    flag('leading-question-number', stim[:30])
                # Stem wording is only a leak when it sits at the end, where the
                # import strands it. Passages quote the phrase legitimately
                # ("which one of the following two scenarios they would prefer").
                if STEM_RE.search(stim[-200:]):
                    flag('stem-text-in-stimulus', STEM_RE.search(stim[-200:]).group(0))
                # "(A) the text" at the start of a line, but not the initials in
                # a name — "C. F. Providence" opens plenty of passages.
                if re.search(r'^\s*(\([A-E]\)|[A-E]\.(?!\s+[A-Z]\.))\s', stim, re.M):
                    flag('answer-choice-in-stimulus', stim[:50])
                # A stimulus that stops mid-sentence is the split-stem defect,
                # unless it ends open on purpose: a fill-in-the-blank, or a
                # signed notice whose last line is the signature.
                tail = stim.strip()
                signature = tail.split('\n')[-1].strip()
                signed = (
                    len(tail.split('\n')) > 1
                    and len(signature) <= 40
                    and TERMINAL.search('\n'.join(tail.split('\n')[:-1]).strip() or ' ')
                )
                if not TERMINAL.search(tail) and not BLANK_TAIL.search(tail) and not signed:
                    flag('split-stem', tail[-60:])

            if not stem.strip():
                flag('missing-stem')
            choices = q.get('answerChoices') or {}
            if sorted(choices) != list('ABCDE'):
                flag('choice-set-not-ABCDE', sorted(choices))
            if any(not isinstance(v, str) or not v.strip() for v in choices.values()):
                flag('empty-choice')
            if q.get('correctAnswer') not in choices:
                flag('correct-answer-not-in-choices', q.get('correctAnswer'))
    return rows, counts, total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='public/data')
    ap.add_argument('--json', help='write the full row list here')
    ap.add_argument('--list', action='store_true', help='print every flagged question')
    args = ap.parse_args()

    paths = sorted(glob.glob(f'{args.data}/*LR*.json'))
    rows, counts, total = audit(paths)

    print(f'{len(paths)} files, {total} questions')
    defects = 0
    for kind, n in counts.most_common():
        tag = '(handled at render)' if kind in INFORMATIONAL else ''
        if kind not in INFORMATIONAL:
            defects += n
        print(f'{n:6d}  {kind} {tag}'.rstrip())
    if not counts:
        print('     0  nothing to report')
    if args.list:
        for name, qid, kind, detail in rows:
            if kind not in INFORMATIONAL:
                print(f'  {qid:16s} {kind:28s} {detail}')
    if args.json:
        json.dump([{'file': a, 'qid': b, 'kind': c, 'detail': d} for a, b, c, d in rows],
                  open(args.json, 'w'), indent=1)
    return 1 if defects else 0


if __name__ == '__main__':
    sys.exit(main())

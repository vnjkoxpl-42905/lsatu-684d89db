#!/usr/bin/env python3
"""Restores LR bank slots holding a question that is not the real one.

Some slots carry the real question's metadata — type, difficulty, correct
answer — but a completely different stimulus, stem and answer set. The vault's
LSAT Lab transcription is the authority for what the question actually is, and
it carries all five answer choices with the credited one marked, so a slot can
be restored in full rather than merely flagged.

A slot is only rewritten when all of this holds:

  * the vault has a complete record at that exact section and question number
    (stimulus, prompt, five choices, one marked correct);
  * the bank's stimulus matches that vault record nowhere, and matches no other
    transcribed question in any PT either, so this is a substitution rather
    than a numbering difference;
  * the credited letter the vault marks agrees with the one the bank already
    stores, which is the metadata that survived the substitution.

Dry run by default; pass --write to save. --list prints each restoration.
"""
import argparse
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import util as _util

_spec = _util.spec_from_file_location(
    'repair', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'repair-lr-bank.py'))
_repair = _util.module_from_spec(_spec)
_spec.loader.exec_module(_repair)
words, comparable, typeset = _repair.words, _repair.comparable, _repair.typeset

VAULT = '/Users/joshuaf/ai-os/wiki/explanations'
HEADING = re.compile(r'^## S(\d+) · Q(\d+)\b', re.M)
CHOICE = re.compile(
    r'^\*\*([A-E])\.\s+(.+?)\*\*\s*(?:—|-)\s*(Correct|Incorrect)?',
    re.M,
)


def section(body, name):
    found = re.search(rf'^### {name}\n(.*?)(?=^### |\Z)', body, re.M | re.S)
    return found.group(1).strip() if found else None


def parse_choices(body):
    """The transcription lists the five choices in bold, the credited one
    labelled. Returns ({letter: text}, correct_letter) or (None, None)."""
    start = body.find('**Answer choices**')
    if start == -1:
        return None, None
    choices, correct = {}, None
    for letter, text, verdict in CHOICE.findall(body[start:]):
        if letter in choices:
            continue
        choices[letter] = re.sub(r'\s+', ' ', text).strip()
        if verdict == 'Correct':
            correct = letter
    if sorted(choices) != list('ABCDE') or not correct:
        return None, None
    return choices, correct


def load_vault(pt):
    path = os.path.join(VAULT, f'{pt}-explanations.md')
    if not os.path.exists(path):
        return {}
    text = open(path).read()
    entries, marks = {}, list(HEADING.finditer(text))
    for i, mark in enumerate(marks):
        body = text[mark.end():marks[i + 1].start() if i + 1 < len(marks) else len(text)]
        choices, correct = parse_choices(body)
        entries[(int(mark.group(1)), int(mark.group(2)))] = {
            'stimulus': section(body, 'Stimulus'),
            'prompt': section(body, 'Prompt'),
            'choices': choices,
            'correct': correct,
        }
    return entries


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--data', default='public/data')
    args = ap.parse_args()

    vaults, every_stimulus = {}, []
    for path in sorted(glob.glob(f'{VAULT}/PT*-explanations.md')):
        pt = os.path.basename(path).split('-')[0]
        vaults[pt] = load_vault(pt)
        every_stimulus += [words(e['stimulus']) for e in vaults[pt].values() if e.get('stimulus')]

    restored, blocked = [], []
    for path in sorted(glob.glob(os.path.join(args.data, '*LR*.json'))):
        data = json.load(open(path))
        questions = data['questions'] if isinstance(data, dict) and 'questions' in data else data
        dirty = False
        for q in questions:
            pt, sec, num = q.get('practiceTest'), q.get('sectionNumber'), q.get('questionNumber')
            entry = vaults.get(pt, {}).get((sec, num))
            if not entry or not entry.get('stimulus') or not entry.get('prompt'):
                continue
            bank_key = words(comparable(q.get('stimulus') or '', num))[:45]
            vault_key = words(entry['stimulus'])
            if not bank_key or vault_key.startswith(bank_key) or bank_key in vault_key:
                continue
            qid = f'{pt}-S{sec}-Q{num}'
            if any(k.startswith(bank_key) or bank_key in k for k in every_stimulus):
                continue  # a real question, just filed under a different number
            if not entry.get('choices'):
                blocked.append((qid, 'vault record has no complete answer set'))
                continue
            if entry['correct'] != q.get('correctAnswer'):
                blocked.append((
                    qid,
                    f"credited letter disagrees: bank {q.get('correctAnswer')}, vault {entry['correct']}",
                ))
                continue
            q['stimulus'] = typeset(entry['stimulus'])
            q['questionStem'] = typeset(entry['prompt'])
            q['answerChoices'] = {k: typeset(v) for k, v in entry['choices'].items()}
            restored.append((qid, entry['stimulus'][:60]))
            dirty = True
        if dirty and args.write:
            with open(path, 'w') as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)
                fh.write('\n')

    if args.list:
        for qid, opening in restored:
            print(f'restored {qid:16s} {opening}…')
    for qid, why in blocked:
        print(f'blocked  {qid:16s} {why}')
    print(f'\n{len(restored)} restored, {len(blocked)} blocked'
          f'{"" if args.write else " (dry run — pass --write to save)"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

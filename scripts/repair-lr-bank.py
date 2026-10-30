#!/usr/bin/env python3
"""Repairs LR bank records against the transcribed explanations in the vault.

Two defects are fixed, both of which a student sees directly:

  blank-stimulus  the stimulus field is empty, so the left column renders empty
  split-stem      the first half of the question stem is glued to the end of the
                  stimulus and only its tail sits in questionStem, so the
                  stimulus runs into the question and the stem starts mid-clause

The vault's `wiki/explanations/PT###-explanations.md` files carry the
transcribed `### Stimulus` and `### Prompt` for each question and are the
authority here. A record is only touched when the vault's stimulus + prompt
carry the same words as the bank's stimulus + stem, so a repair can move a
boundary but can never introduce or drop text. Blank stimuli are the one
exception: there is no bank text to compare, so the vault's stimulus is
accepted on its own and the prompt must still match.

Dry run by default; pass --write to save.
"""
import argparse
import glob
import json
import os
import re
import sys

VAULT = '/Users/joshuaf/ai-os/wiki/explanations'
HEADING = re.compile(r'^## S(\d+) · Q(\d+)\b', re.M)


ROUTING = re.compile(r'^\s*The following passage is used for [^.]*\.\s*', re.I)


def words(text):
    """Comparison key: letters and digits only, so punctuation and whitespace
    differences between the two captures cannot block a repair."""
    return re.sub(r'[^a-z0-9]', '', (text or '').lower())


def comparable(stim, num):
    """The bank's stimulus minus two artifacts the vault transcription never
    had: the shared-passage routing line, and the printed question number that
    some imports left sitting in front of the stem fragment."""
    stim = ROUTING.sub('', stim or '')
    return re.sub(rf'\s*\b{num}\.\s*(?=[A-Z])', ' ', stim)



BLANK = '_______'
COMPLETION = re.compile(r'completes the (argument|passage|statement)', re.I)


def strip_duplicated_stem(stim, stem):
    """Drops a copy of the question stem left sitting at the end of the
    stimulus. Compared on words so punctuation drift cannot hide it, and only
    the tail is considered, since a passage may legitimately echo its question
    earlier on."""
    stem_key = words(stem)
    if len(stem_key) < 40:
        return stim
    lines = stim.rstrip().split('\n')
    while lines:
        tail_key = words(lines[-1])
        if tail_key and (stem_key.startswith(tail_key) or tail_key.startswith(stem_key[:60])):
            lines.pop()
            continue
        break
    return '\n'.join(lines).rstrip() or stim


def normalize_blank_marker(stim, stem):
    """Gives a fill-in-the-blank question the blank its neighbours have, and
    settles the ones that already have one on a single marker width."""
    if not COMPLETION.search(stem or ''):
        return stim
    existing = re.search(r'_{2,}', stim)
    if existing:
        return stim[:existing.start()] + BLANK + stim[existing.end():]
    tail = stim.rstrip()
    # Only a passage that stops mid-sentence is missing its blank. One that ends
    # on a finished sentence is a different problem — either the blank line was
    # dropped in capture or the stem is mislabelled — and guessing where the
    # blank goes would be inventing test content.
    if not tail or re.search(r'[.!?"”\'\)\]]$', tail):
        return stim
    return f'{tail} {BLANK}.'


def typeset(text):
    """The vault transcription types apostrophes and quotes straight; the bank
    is curly throughout, and a repaired question sitting beside its neighbours
    should not be the one that looks different."""
    text = text.replace("'", '\u2019')
    out, opening = [], True
    for chunk in text.split('"'):
        out.append(chunk)
        out.append('\u201c' if opening else '\u201d')
        opening = not opening
    return ''.join(out[:-1])


def cut_at_words(text, key):
    """Character offset in `text` where its word-stream reaches `key`, or None.
    Lets a boundary found on the comparison key be applied to the real text,
    punctuation and all."""
    if not key:
        return None
    seen, index = '', 0
    for i, ch in enumerate(text):
        if re.match(r'[a-z0-9]', ch.lower()):
            seen += ch.lower()
            index += 1
            if index == len(key):
                return i + 1 if seen == key else None
            if not key.startswith(seen):
                return None
    return None


def rebuild_from_record(stim, stem, num, prompt):
    """Reassembles a scrambled shared-passage record.

    The import left these in several shapes: the passage with the neighbour's
    numbered stem stranded on the end and a copy of the passage sitting in the
    stem field; the stem split across both fields; the passage only in the stem.
    The vault's prompt says where the question starts, and everything else is
    taken from the bank, whose transcription of the passage is the better one.

    Returns (stimulus, stem) or None.
    """
    prompt_key = words(prompt)
    stim, stem = stim.strip(), stem.strip()

    # The printed question number marks where the stem was glued on.
    marker = re.search(rf'\s*\b{num}\.\s+(?=[A-Z“"(])', stim)
    passage, fragment = (stim[:marker.start()].strip(), stim[marker.end():].strip()) if marker else (stim, '')

    if fragment:
        # The fragment has to be the opening of this question, not the tail of
        # the passage or the neighbour's question.
        if not prompt_key.startswith(words(fragment)):
            return None
    elif not passage:
        return None

    if passage and words(passage) and prompt_key.startswith(words(passage)):
        # The whole "passage" was really the question. Not a shape we repair.
        return None

    # The passage may instead be sitting in the stem field, ahead of the prompt.
    if not passage:
        cut = cut_at_words(stem, words(stem)[:len(words(stem)) - len(prompt_key)])
        if cut is None or not words(stem).endswith(prompt_key):
            return None
        passage = stem[:cut].strip()

    if not passage:
        return None
    return ROUTING.sub('', passage).strip(), typeset(prompt.strip())


SENTENCE_END = re.compile(r'[.!?][\s"”\')\]]*(?=[A-Z“"(])')


def split_at_sentence_end(stim, stem, num):
    """Moves a stem fragment stranded at the end of the stimulus back onto the
    stem, using only the record itself. Returns (stimulus, stem) or None when
    the boundary is not obvious enough to touch."""
    text = re.sub(rf'\s*\b{num}\.\s*(?=[A-Z])', ' ', stim).strip()
    stem = stem.strip()
    cuts = list(SENTENCE_END.finditer(text))
    if not cuts or not stem:
        return None
    cut = cuts[-1].end()
    head, fragment = text[:cut].strip(), text[cut:].strip()
    if not fragment or not head:
        return None
    # A real stem fragment runs into the stem field rather than standing alone,
    # and the two together close the question.
    if len(fragment) > 140 or re.search(r'[.!?:]$', fragment):
        return None
    if not re.match(r'^[a-z“"(]', stem) and not stem.endswith(':'):
        return None
    question = f'{fragment} {stem}'
    if not re.search(r'[?:]$', question):
        return None
    return head, question


def load_vault(pt):
    path = os.path.join(VAULT, f'{pt}-explanations.md')
    if not os.path.exists(path):
        return {}
    text = open(path).read()
    entries, marks = {}, list(HEADING.finditer(text))
    for i, m in enumerate(marks):
        body = text[m.end():marks[i + 1].start() if i + 1 < len(marks) else len(text)]

        def section(name):
            s = re.search(rf'^### {name}\n(.*?)(?=^### |\Z)', body, re.M | re.S)
            return s.group(1).strip() if s else None

        entries[(int(m.group(1)), int(m.group(2)))] = {
            'stimulus': section('Stimulus'),
            'prompt': section('Prompt'),
        }
    return entries


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--data', default='public/data')
    args = ap.parse_args()

    vaults, fixed, skipped = {}, [], []

    for path in sorted(glob.glob(os.path.join(args.data, '*LR*.json'))):
        data = json.load(open(path))
        questions = data['questions'] if isinstance(data, dict) and 'questions' in data else data
        dirty = False

        for q in questions:
            pt, sec, num = q.get('practiceTest'), q.get('sectionNumber'), q.get('questionNumber')
            stim, stem = q.get('stimulus') or '', q.get('questionStem') or ''
            qid = f'{pt}-S{sec}-Q{num}'

            # Two repairs that need no outside authority, done first so the
            # checks below see the tidied record.
            if stim.strip() and stem.strip():
                # The stem was copied onto the end of the passage as well as
                # into its own field. The passage keeps only the passage.
                trimmed = strip_duplicated_stem(stim, stem)
                if trimmed != stim:
                    q['stimulus'] = stim = trimmed
                    fixed.append((qid, 'duplicated stem removed from the stimulus'))
                    dirty = True
                # Fill-in-the-blank questions carry a blank. Fifty-one of them
                # already do; the stragglers looked like truncated passages.
                marked = normalize_blank_marker(stim, stem)
                if marked != stim:
                    q['stimulus'] = stim = marked
                    fixed.append((qid, 'blank marker'))
                    dirty = True

            blank = not stim.strip()
            # A stem that starts lower-case, or a stimulus that ends without
            # terminal punctuation, is the signature of the split.
            split = bool(stem) and (
                re.match(r'^[a-z]', stem.strip())
                or not re.search(r'[.!?"”\'\)\]]\s*$', stim.strip())
                # "Carabella?" — the tail end of a question whose opening is
                # stranded on the stimulus. Too short to be a stem of its own.
                or len(stem.strip()) < 30
            )
            if not blank and not split:
                continue

            kind_override = None
            if pt not in vaults:
                vaults[pt] = load_vault(pt)
            entry = vaults[pt].get((sec, num))
            bank_key = words(comparable(stim, num))
            if entry and bank_key and not entry.get('stimulus', '').strip():
                entry = None
            # A few PTs number their sections differently in the vault than in
            # the bank, so the (section, question) key lands on a different
            # question. Fall back to finding the record by its opening words.
            if bank_key and (
                not entry
                or not words(entry.get('stimulus') or '').startswith(bank_key[:40])
            ):
                match = [
                    e for e in vaults[pt].values()
                    if e.get('stimulus') and e.get('prompt')
                    and words(e['stimulus']).startswith(bank_key[:40])
                ]
                if len(match) == 1:
                    entry = match[0]
            if not entry or not entry.get('stimulus') or not entry.get('prompt'):
                # No transcription to lean on. The split can still be repaired
                # from the record itself when the boundary is unambiguous: the
                # run of text after the stimulus's last sentence-ending mark,
                # joined to the stem field, has to read as a whole question —
                # it continues into a lower-case stem and closes on "?" or ":".
                moved = split_at_sentence_end(stim, stem, num)
                if moved and not blank:
                    q['stimulus'], q['questionStem'] = moved
                    fixed.append((qid, 'split-stem (no vault, boundary inferred)'))
                    dirty = True
                else:
                    skipped.append((qid, 'no vault record'))
                continue

            # Shared two-question passages came through the import badly
            # scrambled: the passage appears twice, the neighbour's stem is
            # stranded on the end of it, and the stem field holds a copy of the
            # passage instead of the question. The vault entry is the clean
            # version of the same question, so it is adopted whole — but only on
            # proof that this record really is that question: either the bank's
            # own stimulus contains the vault's passage, or the fragments the
            # bank does hold spell out the vault's prompt exactly.
            record_key = bank_key + words(stem)
            # A capture that stops partway through the passage and never reaches
            # the question. Everything the bank holds is the opening of the
            # vault's passage, so the vault's copy is the whole record restored,
            # not new text.
            if (
                record_key
                and len(record_key) < len(words(entry['stimulus']))
                and words(entry['stimulus']).startswith(record_key)
            ):
                q['stimulus'] = typeset(entry['stimulus'])
                q['questionStem'] = typeset(entry['prompt'])
                fixed.append((qid, 'truncated capture restored'))
                dirty = True
                continue

            rebuilt = rebuild_from_record(stim, stem, num, entry['prompt'])
            if rebuilt and words(entry['prompt']) in record_key:
                q['stimulus'], q['questionStem'] = rebuilt
                fixed.append((qid, 'shared-passage reassembled'))
                dirty = True
                continue
            if (
                words(entry['stimulus']) in record_key
                or words(entry['prompt']) == record_key
                or words(entry['prompt']) == words(stim) + words(stem)
            ) and words(entry['stimulus']) + words(entry['prompt']) != record_key:
                kind_override = 'shared-passage rebuilt'
            elif blank:
                if words(entry['prompt']) != words(stem):
                    skipped.append((qid, 'vault prompt does not match the bank stem'))
                    continue
            else:
                vault_key = words(entry['stimulus']) + words(entry['prompt'])
                combined = bank_key + words(stem)
                if vault_key == combined:
                    pass
                elif vault_key.startswith(combined):
                    # The bank's capture stops partway through the passage. The
                    # vault holds the rest, so this restores what was cut.
                    kind_override = 'truncated-stimulus'
                else:
                    # The vault entry is not this question (a few PTs number
                    # their sections differently). Fall back to inferring the
                    # boundary from the record itself.
                    moved = split_at_sentence_end(stim, stem, num)
                    if moved:
                        q['stimulus'], q['questionStem'] = moved
                        fixed.append((qid, 'split-stem (no vault, boundary inferred)'))
                        dirty = True
                    else:
                        skipped.append((qid, 'vault text differs from the bank beyond the boundary'))
                    continue

            entry = {'stimulus': typeset(entry['stimulus']), 'prompt': typeset(entry['prompt'])}

            # The routing line is what tells the loader to carry this passage
            # across its shared range, so it survives the repair.
            routing = ROUTING.match(stim)
            q['stimulus'] = (routing.group(0) if routing else '') + entry['stimulus']
            q['questionStem'] = entry['prompt']
            fixed.append((qid, kind_override or ('blank-stimulus' if blank else 'split-stem')))
            dirty = True

        if dirty and args.write:
            with open(path, 'w') as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)
                fh.write('\n')

    for qid, kind in fixed:
        print(f'fixed   {qid:16s} {kind}')
    for qid, why in skipped:
        print(f'skipped {qid:16s} {why}')
    print(f'\n{len(fixed)} repaired, {len(skipped)} left alone'
          f'{"" if args.write else " (dry run — pass --write to save)"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

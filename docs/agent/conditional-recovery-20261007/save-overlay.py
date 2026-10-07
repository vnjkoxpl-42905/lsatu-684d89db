"""Copy only authorized final changes, verify bytes, and reject concurrent edits."""
import hashlib
import json
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[3]
original = root / 'docs/agent/conditional-recovery-20261007/hash-verification.json'
output = root.parent.parent / 'ai-os/brainstorms/2026-09-30-conditional-curriculum/2026-10-07-opening-final-overlay'
prior = json.loads(original.read_text(encoding='utf-8-sig'))

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

changed = [item['path'] for item in prior['files'] if digest(root / item['path']) != item['expected']]
additional = [
    'package.json',
    'src/components/hub/BootcampGate.tsx',
    'src/features/conditional-refresher/ConditionalIndicatorsRefresher.tsx',
    'scripts/verification/start-conditional-preview.mjs',
    'src/bootcamps/conditionals/components/MixedFamilyPractice.test.tsx',
    'src/bootcamps/conditionals/components/OpeningActivityPractice.tsx',
    'src/bootcamps/conditionals/components/OpeningActivityPractice.test.tsx',
    'src/bootcamps/conditionals/components/opening-activity-practice.css',
    'src/bootcamps/conditionals/components/OpeningFoundations.test.tsx',
    'src/bootcamps/conditionals/components/OpeningMixedDrill.tsx',
    'src/bootcamps/conditionals/components/OpeningMixedDrill.test.tsx',
    'src/bootcamps/conditionals/components/opening-mixed-drill.css',
    'src/bootcamps/conditionals/components/PracticeTaskRunner.tsx',
    'src/bootcamps/conditionals/components/PracticeTaskRunner.test.tsx',
    'src/bootcamps/conditionals/content/mixedDrillItems.ts',
    'src/bootcamps/conditionals/content/mixedDrillItems.test.ts',
    'src/bootcamps/conditionals/content/openingActivityItems.ts',
    'src/components/hub/BootcampGate.test.tsx',
]
paths = sorted(set(changed + additional))
assert len(paths) == 31, f'Expected reviewed 31-file overlay, found {len(paths)}: {paths}'
assert all(not path.startswith(('public/', 'supabase/', '.')) for path in paths)
before = {path: digest(root / path) for path in paths}
entries = []
for path in paths:
    source = root / path
    destination = output / 'files' / path
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and digest(destination) != before[path]:
        raise RuntimeError(f'Existing overlay differs; preserve conflict: {path}')
    shutil.copy2(source, destination)
    assert digest(destination) == before[path], f'Copy mismatch: {path}'
    entries.append({'path': path, 'sha256': before[path], 'bytes': source.stat().st_size})
assert all(digest(root / path) == before[path] for path in paths), 'Source changed during copy; snapshot not valid'
inventory = {item['path']: item['expected'] for item in prior['files']}
inventory.update(before)
assert all(digest(root / path) == sha for path, sha in inventory.items()), 'Unchanged prerequisite differs from recovered source'
manifest = {
    'date': '2026-10-07', 'baseline': prior['baseline'],
    'prerequisite': '../claude-pacing-20261004/input + authored.diff',
    'recoveryCheckpoint': 'evidence/hash-verification.json',
    'count': len(entries), 'files': entries,
    'finalSourceInventory': [{'path': path, 'sha256': sha} for path, sha in sorted(inventory.items())],
    'exclusions': ['credentials', 'node_modules', 'generated bank copies', 'instruction file edits'],
    'verification': 'Source frozen before copy, destination SHA256 equals source, source rechecked after copy.',
}
output.mkdir(parents=True, exist_ok=True)
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
evidence = output / 'evidence'
evidence.mkdir(exist_ok=True)
for name in ['README.md', 'preview-launch.md', 'refinement-log.md', 'hash-verification.json', 'pacing-normalized.patch']:
    shutil.copy2(original.parent / name, evidence / name)
print(json.dumps({'output': str(output), 'overlayFiles': len(entries), 'sourceInventory': len(inventory), 'verified': True}))

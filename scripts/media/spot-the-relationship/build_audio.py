"""Local, offline Kokoro narration. No provider API or paid generation call.
Run with an interpreter that has kokoro_onnx, numpy and soundfile installed.
Models are selected by KOKORO_MODEL / KOKORO_VOICES or the existing user cache.
"""
import json, os
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent
OUT = ROOT / '.render'
OUT.mkdir(exist_ok=True)
config = json.loads((ROOT / 'script.json').read_text(encoding='utf-8'))
cache = Path.home() / '.cache/hyperframes/tts'
engine = Kokoro(os.environ.get('KOKORO_MODEL', str(cache / 'models/kokoro-v1.0.onnx')),
                os.environ.get('KOKORO_VOICES', str(cache / 'voices/voices-v1.0.bin')))
sr = 24000
parts = [np.zeros(int(.6 * sr), dtype=np.float32)]
t = .6
scenes = []
for item in config['scenes']:
    audio, rate = engine.create(item['text'], voice=config['voice'], speed=config['speed'], lang='en-us')
    assert rate == sr
    length = len(audio) / sr
    scenes.append(dict(item, start=round(t, 3), end=round(t + length, 3)))
    parts.extend([audio, np.zeros(int(.9 * sr), dtype=np.float32)])
    t += length + .9
parts.append(np.zeros(int(.6 * sr), dtype=np.float32))
t += .6
sf.write(OUT / 'narration.wav', np.concatenate(parts), sr)
(OUT / 'timeline.json').write_text(json.dumps({'duration':t,'scenes':scenes}, indent=2), encoding='utf-8')
print(json.dumps({'duration': round(t, 2), 'scenes': len(scenes), 'narration': str(OUT / 'narration.wav')}))

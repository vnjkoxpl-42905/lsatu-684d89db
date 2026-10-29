"""One-time mechanical migration of RC native-select test interactions."""
from pathlib import Path
import re

path = Path(__file__).resolve().parents[2] / 'src/features/rc/components/RcHubSurface.test.tsx'
text = path.read_text(encoding='utf-8')
text = "import { chooseRcValue, expectRcValue } from './rcSelectTestUtils';\n" + text
pattern = r"fireEvent\.change\(((?:screen|within\(drawer\))\.getByRole\('combobox', \{ name: (?:'[^']+'|control) \}\)), \{ target: \{ value: (.*?) \} \}\)"
def change(match):
    if 'Profile time accommodation' in match[1]:
        return match[0]
    return f'chooseRcValue({match[1]}, {match[2]})'
text = re.sub(pattern, change, text)
text = re.sub(r"expect\(((?:screen|within\(drawer\))\.getByRole\('combobox', \{ name: '[^']+' \}\))\)\.toHaveValue\('([^']+)'\)", r"expectRcValue(\1, '\2')", text)
path.write_text(text, encoding='utf-8')

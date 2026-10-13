import { readFileSync, writeFileSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const PDF =
  '/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/Notes/MCFIRST SENTENCE : REBUTTAL.pdf';

async function main() {
  const bytes = readFileSync(PDF);
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  let all = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const pg = await pdf.getPage(p);
    const c = await pg.getTextContent();
    let buf = '';
    let lastY: number | null = null;
    const lines: string[] = [];
    for (const it of c.items as any[]) {
      const y = it.transform?.[5] ?? null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        lines.push(buf.trim());
        buf = '';
      }
      buf += it.str;
      if (it.hasEOL) {
        lines.push(buf.trim());
        buf = '';
      }
      lastY = y;
    }
    if (buf.trim()) lines.push(buf.trim());
    all += `\n===== PAGE ${p} =====\n` + lines.filter(Boolean).join('\n');
  }
  writeFileSync('/tmp/mcfirst-raw.txt', all);
  console.log('wrote /tmp/mcfirst-raw.txt', all.length, 'chars');
}
main();

// A Node port of src/lib/guidedDrillLaunch.ts.
//
// The app module imports the template with Vite's `?raw` suffix, which no Node
// runtime can resolve, so the offline generator cannot reuse it directly. The
// duplication is guarded instead of avoided: src/lib/guidedDrillLaunch.parity.test.ts
// renders every seeded drill through both implementations and fails on any
// byte of difference. Change one, change the other.

import fs from 'node:fs';
import path from 'node:path';

const TEMPLATE = path.resolve('src/data/guidedDrillLaunchTemplate.html');

let cachedTemplate = null;
export function launchTemplate() {
  if (cachedTemplate === null) cachedTemplate = fs.readFileSync(TEMPLATE, 'utf8');
  return cachedTemplate;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inline markdown: escape first, then **bold** and _italic_. */
function inline(text) {
  let out = escapeHtml(text);
  out = out.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^_])_([^_]+?)_(?=[^_]|$)/g, '$1<em>$2</em>');
  return out;
}

const HEADING_LINE = /^#{1,6}\s+/;
const LIST_LINE = /^[-*]\s+/;

export function renderColumn(md) {
  const blocks = md
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split('\n').filter((l) => l.trim().length > 0);
      if (lines.every((l) => HEADING_LINE.test(l))) {
        const html = lines.map((l) => inline(l.replace(HEADING_LINE, '').trim())).join('<br>');
        return `<p class="lead-line reveal">${html}</p>`;
      }
      if (lines.every((l) => LIST_LINE.test(l))) {
        const items = lines
          .map((l) => `<li>${inline(l.replace(LIST_LINE, '').trim())}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${lines.map((l) => inline(l.trim())).join('<br>')}</p>`;
    })
    .join('\n');
}

function buildNotesBlock(sections) {
  if (sections.length === 0) return '';

  const noteSections = sections
    .map(
      (s) => `            <section class="note-section" id="${s.id}" data-toc-title="${escapeHtml(s.kicker)}">
              <div class="section-kicker">${escapeHtml(s.kicker)}</div>
              <div class="copy">
${s.bodyHtml}
              </div>
            </section>`,
    )
    .join('\n\n');

  return `<section class="notes-drawer" id="notesDrawer" aria-hidden="false">
        <div class="drawer-shell">
          <article class="note-card">
${noteSections}
          </article>
        </div>
      </section>
    </main>

    <div class="toc-backdrop" id="tocBackdrop" aria-hidden="true"></div>
    <div class="toc-island-wrap" id="tocIslandWrap">
      <div class="toc-island" id="tocIsland" aria-label="Notes contents">
        <button class="toc-closed" id="tocOpenBtn" type="button" aria-expanded="false" aria-controls="tocExpanded">
          <span class="toc-dot"></span>
          <span class="toc-active-title" id="tocActiveTitle">Contents</span>
          <svg class="toc-ring" viewBox="0 0 26 26" aria-hidden="true">
            <circle class="track" cx="13" cy="13" r="11"></circle>
            <circle class="progress" id="tocProgress" cx="13" cy="13" r="11"></circle>
          </svg>
        </button>

        <div class="toc-expanded" id="tocExpanded">
          <div class="toc-head">
            <div class="toc-label">Contents</div>
            <button class="toc-close" id="tocCloseBtn" type="button" aria-label="Close contents">×</button>
          </div>
          <div class="toc-list" id="tocList"></div>
        </div>
      </div>
    </div>`;
}

export function buildGuidedDrillLaunchHtml(input) {
  const left = input.leftMd?.trim() ?? '';
  const right = input.rightMd?.trim() ?? '';

  const sections = [];
  if (left) sections.push({ id: 'section-1', kicker: 'Briefing', bodyHtml: renderColumn(left) });
  if (right) {
    sections.push({
      id: `section-${sections.length + 1}`,
      kicker: 'How to Read This Set',
      bodyHtml: renderColumn(right),
    });
  }

  const hasNotes = sections.length > 0;

  const count = input.questionCount && input.questionCount > 0 ? input.questionCount : null;
  const timeLabel =
    input.estimatedMinutes && input.estimatedMinutes > 0
      ? `${input.estimatedMinutes} min`
      : count
        ? `~${Math.round(count * 1.5)} min`
        : '—';

  return launchTemplate()
    .split('{{TITLE}}')
    .join(escapeHtml(input.title))
    .split('{{TIME}}')
    .join(escapeHtml(timeLabel))
    .split('{{QUESTIONS}}')
    .join(count ? String(count) : '—')
    .split('{{SCROLL_HINT}}')
    .join(hasNotes ? '<div class="scroll-hint">Scroll down for notes ↓</div>' : '')
    .split('{{NOTES}}')
    .join(buildNotesBlock(sections))
    .split('{{QUESTIONS_SECTION}}')
    .join(input.questionsHtml ?? '')
    .split('{{ARTIFACT_MODE}}')
    .join(input.mode ?? 'platform');
}

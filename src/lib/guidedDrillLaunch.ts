/**
 * Builds the premium guided-drill launch page HTML for any drill, reusing the
 * exact template extracted from the curated `public/guided-drill-html` pages
 * (see `01_first_sentence_conclusions_drill.html`). This is how drills that have
 * no hand-authored HTML page still render in the identical premium format:
 * serif hero, black START card with per-drill metrics, animated notes drawer,
 * and the floating table-of-contents island.
 *
 * Content is data-driven from each drill's `instruction_card` columns:
 *   left_md  -> "Briefing" note-section
 *   right_md -> "How to Read This Set" note-section
 * Drills with no notes render the hero + START card only (no drawer, no TOC).
 */

import templateHtml from '@/data/guidedDrillLaunchTemplate.html?raw';

export interface GuidedDrillLaunchInput {
  title: string;
  /** Pre-formatted time label, e.g. "30 min". Falls back to a count-based estimate. */
  estimatedMinutes?: number | null;
  questionCount?: number | null;
  leftMd?: string | null;
  rightMd?: string | null;
  /**
   * Rendered question sections, appended after the notes drawer.
   *
   * Only the offline artifact generator supplies this. The platform page never
   * embeds questions: they are drawn when the student presses START, which is
   * what keeps a re-attempt fresh.
   */
  questionsHtml?: string | null;
  /**
   * `platform` (default) posts to the parent frame on START, which is the
   * contract GuidedDrillLaunchFrame listens for. `artifact` makes the same
   * button scroll to the first question instead, because a file opened from an
   * email has no parent frame to talk to — that is precisely where the 108
   * curated pages dead-end today.
   */
  mode?: 'platform' | 'artifact';
}

const COLUMN_HEADER = /^###\s+(left|right)\s+column\s*$/im;

/**
 * Splits a single `instructions_markdown` body on the canonical
 * `### Left Column` / `### Right Column` markers used by homework sets.
 * When no markers are present, the whole body is treated as the left column.
 */
export function splitInstructionColumns(
  md: string | null | undefined,
): { left: string; right: string | null } {
  if (!md) return { left: '', right: null };
  const lines = md.split('\n');
  const sections: { name: 'left' | 'right' | 'preamble'; lines: string[] }[] = [
    { name: 'preamble', lines: [] },
  ];
  for (const line of lines) {
    const m = line.match(COLUMN_HEADER);
    if (m) {
      sections.push({ name: m[1].toLowerCase() as 'left' | 'right', lines: [] });
      continue;
    }
    sections[sections.length - 1].lines.push(line);
  }
  const left = sections.find((s) => s.name === 'left')?.lines.join('\n').trim() ?? '';
  const right = sections.find((s) => s.name === 'right')?.lines.join('\n').trim() ?? null;
  if (!left && !right) return { left: md.trim(), right: null };
  return { left, right };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inline markdown: escape first, then apply **bold** and _italic_. */
function inline(text: string): string {
  let out = escapeHtml(text);
  // Bold before italic so **_x_** nests correctly.
  out = out.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^_])_([^_]+?)_(?=[^_]|$)/g, '$1<em>$2</em>');
  return out;
}

const HEADING_LINE = /^#{1,6}\s+/;
const LIST_LINE = /^[-*]\s+/;

/** Converts a column of markdown into the note-section body HTML. */
function renderColumn(md: string): string {
  const blocks = md
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split('\n').filter((l) => l.trim().length > 0);

      // Heading block -> serif lead-line callout (matches the template opener).
      if (lines.every((l) => HEADING_LINE.test(l))) {
        const html = lines.map((l) => inline(l.replace(HEADING_LINE, '').trim())).join('<br>');
        return `<p class="lead-line reveal">${html}</p>`;
      }

      // Bullet list.
      if (lines.every((l) => LIST_LINE.test(l))) {
        const items = lines
          .map((l) => `<li>${inline(l.replace(LIST_LINE, '').trim())}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }

      // Paragraph (single newlines become <br>).
      return `<p>${lines.map((l) => inline(l.trim())).join('<br>')}</p>`;
    })
    .join('\n');
}

interface NotesSection {
  id: string;
  kicker: string;
  bodyHtml: string;
}

function buildNotesBlock(sections: NotesSection[]): string {
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

export function buildGuidedDrillLaunchHtml(input: GuidedDrillLaunchInput): string {
  const left = input.leftMd?.trim() ?? '';
  const right = input.rightMd?.trim() ?? '';

  const sections: NotesSection[] = [];
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

  return templateHtml
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

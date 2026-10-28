import coverage from './timedSectionCoverage.generated.json';

export type AssignedWorkSection = 'lr' | 'rc' | 'mixed' | 'unknown';
const sectionKinds = new Map(coverage.map(row => [`${row.pt}:${row.section}`, row.kind as 'lr' | 'rc']));
// These two legacy captured sections are authored LR content, outside the
// modern numbered bank. See content/read-recall-colour-sections.test.ts.
sectionKinds.set('1:3', 'lr');
sectionKinds.set('21:3', 'lr');

/** Unknown evidence never becomes RC merely because its label mentions reading. */
export function mergeWorkSections(...evidence: Array<AssignedWorkSection | undefined>): AssignedWorkSection {
  const known = new Set(evidence.filter(value => value && value !== 'unknown'));
  if (known.has('mixed') || (known.has('lr') && known.has('rc'))) return 'mixed';
  return known.has('rc') ? 'rc' : known.has('lr') ? 'lr' : 'unknown';
}

export function sectionFromCitation(value: unknown): AssignedWorkSection {
  if (typeof value !== 'string') return 'unknown';
  const match = /^PT(\d+)[.-]S(\d+)$/i.exec(value);
  return match ? sectionKinds.get(`${Number(match[1])}:${Number(match[2])}`) ?? 'unknown' : 'unknown';
}

export function sectionFromQuestionIds(qids: readonly string[] | null | undefined): AssignedWorkSection {
  if (!qids?.length) return 'unknown';
  const kinds: AssignedWorkSection[] = [];
  for (const qid of qids) {
    const match = /^PT(\d+)-S(\d+)-Q\d+$/i.exec(qid);
    const kind = match ? sectionKinds.get(`${Number(match[1])}:${Number(match[2])}`) : undefined;
    if (!kind) return 'unknown'; // A partly understood set is not certified RC-only.
    kinds.push(kind);
  }
  return mergeWorkSections(...kinds);
}

export function sectionFromMetadata(value: unknown): AssignedWorkSection {
  if (!value || typeof value !== 'object') return 'unknown';
  const metadata = value as Record<string, unknown>;
  const explicit = metadata.section_kind === 'rc' || metadata.section_kind === 'lr' ? metadata.section_kind : 'unknown';
  // Exact catalog identities, not title or slug substring heuristics.
  const catalog = metadata.bootcamp_id === 'rc-engaging-with-the-passage' ? 'rc'
    : metadata.bootcamp_id === 'conditional-indicators-refresher' ? 'lr' : 'unknown';
  const qids = Array.isArray(metadata.question_qids) && metadata.question_qids.every(qid => typeof qid === 'string')
    ? sectionFromQuestionIds(metadata.question_qids as string[]) : 'unknown';
  return mergeWorkSections(explicit, catalog, qids);
}

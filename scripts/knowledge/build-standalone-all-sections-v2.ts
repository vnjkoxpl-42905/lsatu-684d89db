// Independent standalone catalog. Never regenerate the scored PrepTest catalog here.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildTimedManifest, canonicalJson } from './build-timed-manifest';
import { normalizeQType } from '../../src/lib/questionLoader';

const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const ensure = (value: unknown, message: string) => { if (!value) throw new Error(message); };
type Definition = { kind: 'lr' | 'rc'; section: number; questionCount: number; qids: string[]; questions: Record<string, unknown>[]; passageIds?: number[]; passages?: Record<string, unknown>[] };
export function buildStandaloneSectionManifest(root: string) {
  // Existing validation checks every raw LR/RC file and exact RC index membership,
  // including sources omitted from the scored three-leg selection.
  const validated = buildTimedManifest(root);
  const sections: { pt: number; definition: Definition }[] = [];
  for (const filename of readdirSync(resolve(root, 'public/data')).filter(name => /^PT\d+-S\d+-LR\.json$/.test(name))) {
    const [, ptText, sectionText] = /^PT(\d+)-S(\d+)-LR\.json$/.exec(filename)!;
    const pt = Number(ptText); const section = Number(sectionText);
    const rows = JSON.parse(readFileSync(resolve(root, `public/data/${filename}`), 'utf8'));
    const questions = rows.filter(row => row.status !== 'removed').sort((a,b) => a.questionNumber-b.questionNumber).map(row => ({
      qid: `PT${pt}-S${section}-Q${row.questionNumber}`, qnum: row.questionNumber,
      qtype: normalizeQType(row.questionType || '', row.questionStem), level: row.questionDifficulty || row.Question_Difficulty || 3,
      contentSha256: hash(canonicalJson({stimulus: row.stimulus ?? '', stem: row.questionStem, choices: row.answerChoices})),
    }));
    sections.push({pt, definition:{kind:'lr',section,questionCount:questions.length,qids:questions.map(q=>q.qid),questions}});
  }
  const index = JSON.parse(readFileSync(resolve(root, 'public/data/rc/rc-index.json'),'utf8'));
  for (const test of index.preptests) {
    const full = JSON.parse(readFileSync(resolve(root, `public/data/rc/RC-PT${test.preptest}.json`),'utf8'));
    const sectionNumbers = [...new Set<number>(test.passages.map(p=>p.section))].sort((a,b)=>a-b);
    for (const section of sectionNumbers) {
      const passages = full.passages.filter(p=>p.section===section).sort((a,b)=>a.setNumber-b.setNumber);
      ensure(passages.length===4 && new Set(passages.map(p=>p.setNumber)).size===4, `Incomplete RC section ${test.preptest}:${section}`);
      const questions = passages.flatMap(p=>[...p.questions].sort((a,b)=>a.position-b.position).map(q=>({
        qid:String(q.questionId),questionId:q.questionId,passageId:p.passageId,qnum:q.position,
        contentSha256:hash(canonicalJson({text:p.text,prompt:q.prompt,choices:q.choices.map(c=>({letter:c.letter,text:c.text})).sort((a,b)=>a.letter.localeCompare(b.letter))})),
      })));
      sections.push({pt:test.preptest,definition:{kind:'rc',section,questionCount:questions.length,qids:questions.map(q=>q.qid),questions,
        passageIds:passages.map(p=>p.passageId),passages:passages.map(p=>({passageId:p.passageId,section:p.section,setNumber:p.setNumber,contentSha256:hash(p.text)}))}});
    }
  }
  sections.sort((a,b)=>a.pt-b.pt||a.definition.section-b.definition.section);
  ensure(sections.length===236 && sections.filter(s=>s.definition.kind==='lr').length===156, 'Canonical inventory changed; review required');
  for(let pt=101;pt<=159;pt++) ensure(sections.filter(s=>s.pt===pt).length===4, `Expected four bank sections for PT${pt}`);
  const identities = new Set(sections.map(s=>`${s.pt}:${s.definition.section}`));
  ensure(identities.size===sections.length,'Duplicate section identity');
  const deployed = JSON.parse(readFileSync(resolve(root,'docs/implementation-plans/artifacts/timed-content-manifest-v1.generated.json'),'utf8'));
  for (const test of deployed.blueprints) for(const leg of test.legs) {
    const standalone = sections.find(s=>s.pt===test.pt && s.definition.section===leg.section && s.definition.kind===leg.kind);
    ensure(standalone && canonicalJson(standalone.definition)===canonicalJson(leg), `Deployed frozen definition mismatch PT${test.pt} ${leg.kind} S${leg.section}`);
  }
  const provenance = [...validated.provenance,{path:'scripts/knowledge/build-standalone-all-sections-v2.ts',sha256:hash(readFileSync(resolve(root,'scripts/knowledge/build-standalone-all-sections-v2.ts')))}].sort((a,b)=>a.path.localeCompare(b.path));
  for (const source of provenance) ensure(hash(readFileSync(resolve(root,source.path)))===source.sha256,`Source changed during generation: ${source.path}`);
  const body={schemaVersion:1,workKind:'standalone-section',provenance,sections};
  return {...body,manifestSha256:hash(canonicalJson(body))};
}
export function standaloneSeedSql(manifest: ReturnType<typeof buildStandaloneSectionManifest>) {
  return '-- Generated immutable standalone bank catalog. Does not activate configuration.\nbegin;\n'+manifest.sections.map(({pt,definition})=>{
    const json=canonicalJson(definition).replaceAll("'","''");
    return `do $catalog$ declare expected jsonb := '${json}'::jsonb; begin
insert into public.timed_section_content_manifests_v1(manifest_sha256,pt,kind,section,definition) values('${manifest.manifestSha256}',${pt},'${definition.kind}',${definition.section},expected) on conflict do nothing;
if not exists(select 1 from public.timed_section_content_manifests_v1 where manifest_sha256='${manifest.manifestSha256}' and pt=${pt} and kind='${definition.kind}' and section=${definition.section} and definition=expected) then raise exception 'Immutable standalone catalog conflict'; end if; end $catalog$;`;
  }).join('\n')+'\ncommit;\n';
}
if (process.argv.some(arg=>/(^|[\\/])build-standalone-all-sections-v2\.ts$/.test(arg))) {
  const root=process.cwd();const manifest=buildStandaloneSectionManifest(root);
  const outputs=[['timed-section-all-sections-v2.generated.json',canonicalJson(manifest)+'\n'],['timed-section-all-sections-v2.generated.sql',standaloneSeedSql(manifest)]];
  for(const [name,content] of outputs) {
    const path=resolve(root,'docs/implementation-plans/artifacts',name);
    if(process.argv.includes('--check')) ensure(existsSync(path)&&readFileSync(path,'utf8')===content,`Stale standalone artifact ${name}`);
    else writeFileSync(path,content);
  }
  console.log(JSON.stringify({manifestSha256:manifest.manifestSha256,sections:manifest.sections.length,lr:156,rc:80,check:process.argv.includes('--check')}));
}

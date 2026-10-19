// Project only reviewed catalog identities into the runtime launch roster.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const expectedHash='45ef6f554a1f1c402aa9f87d61326d17f16642a953757a8fb71d33b910e9aae1';
function canonical(value){if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;return JSON.stringify(value);}
export function coverageOutput(root=process.cwd()) {
 const manifest=JSON.parse(readFileSync(resolve(root,'docs/implementation-plans/artifacts/timed-section-all-sections-v2.generated.json'),'utf8'));
 const {manifestSha256,...body}=manifest;
 if(manifestSha256!==expectedHash||createHash('sha256').update(canonical(body)).digest('hex')!==manifestSha256)throw new Error('Unreviewed standalone catalog');
 const rows=manifest.sections.map(({pt,definition})=>({kind:definition.kind,pt,section:definition.section,passageIds:definition.passageIds??[null]}));
 if(rows.length!==236||rows.filter(row=>row.kind==='lr').length!==156||rows.filter(row=>row.kind==='rc').length!==80||new Set(rows.map(row=>`${row.pt}:${row.section}`)).size!==236)throw new Error('Unexpected standalone inventory');
 return JSON.stringify(rows)+'\n';
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const content=coverageOutput();const target=resolve('src/lib/timedSectionCoverage.generated.json');
 if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==content)throw new Error('Stale standalone launch coverage');}
 else writeFileSync(target,content);
 console.log(JSON.stringify({sections:236,manifestSha256:expectedHash,check:process.argv.includes('--check')}));
}

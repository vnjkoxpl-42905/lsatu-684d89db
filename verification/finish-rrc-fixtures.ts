import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve,relative } from 'node:path';
import { stripVerbatimReads } from '../supabase/functions/_shared/rrcReads';
const root=process.cwd();
const path=resolve(root,'scripts/rrc-eval/fixtures/golden-recalls.json');
const d=JSON.parse(readFileSync(path,'utf8'));
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const c of d.cases)c.provenance.sourceFileSha256=hash(resolve(root,c.provenance.sourceFile));
for(const c of d.referenceCandidates)c.app_source_file_sha256=hash(c.app_source_path);
const selected=['PT101_S2_Q2','PT102_S3_Q5','PT105_S2_Q1'];
const report=[];
for(const slug of selected){
 const r=d.referenceCandidates.find((x:any)=>x.item_slug===slug);
 const source=JSON.parse(readFileSync(r.app_source_path,'utf8'));
 const item=source.items.find((x:any)=>x.slug===slug);
 const transcript=readFileSync(r.transcript_path,'utf8');
 const stripped=stripVerbatimReads(transcript.trim().split(/\s+/),item.chunks.map((x:any)=>x.text));
 const spoken=stripped.kept.join(' ');
 const id='owner-audio-transcript-'+slug.toLowerCase();
 d.cases=d.cases.filter((c:any)=>c.id!==id);
 d.cases.push({id,sourceSection:source.source_section,itemSlug:slug,spoken,expected:{mustCarryDetails:[],mustMissDetails:[],minPercent:100},provenance:{origin:'actual saved instructor recording transcript with source reads removed',sourceFile:relative(root,r.app_source_path).replace(/\\/g,'/'),sourceFileSha256:hash(r.app_source_path),status:'owner-designated-10-of-10-ASR-unreviewed-awaiting-provider-validation',ownerDesignatedPerformanceScore:10,ownerDesignatedScoreScale:10,transcriptFile:r.transcript_path,transcriptSha256:hash(r.transcript_path),audioFile:r.audio_path,audioSha256:hash(r.audio_path),audioSha256FromPublicationManifest:r.audio_sha256_from_publication_manifest,directListeningVerified:false,transcriptAudioAlignmentVerified:false,preprocessing:{implementation:'supabase/functions/_shared/rrcReads.ts#stripVerbatimReads',implementationSha256:hash(resolve(root,'supabase/functions/_shared/rrcReads.ts')),input:'complete saved ASR text tokenized on whitespace as working speech',wordsCut:stripped.cut,chunksReadAloud:stripped.chunksReadAloud},note:'Owner designates her recordings as the 10/10 benchmark. This executes the actual saved ASR transcript, with verbatim source reads removed using the production stripper. ASR fidelity and audio alignment have not been independently reviewed. minPercent 100 is an expectation to test, not a previously observed result; any failure remains visible and requires analysis. Supplemental instructor explanation is not a required student fact. No separate final-recall window is asserted.'}});
 report.push({id,rawWords:transcript.trim().split(/\s+/).length,keptWords:stripped.kept.length,cut:stripped.cut,transcriptHashValid:hash(r.transcript_path)===r.transcript_sha256,audioHashMatchesManifest:hash(r.audio_path)===r.audio_sha256_from_publication_manifest});
}
d.generatedAt=new Date().toISOString();
d.notes=d.notes.filter((x:string)=>!x.startsWith('Six archive reference candidates'));
d.notes.unshift('Six archive references remain source/inspiration. Three actual saved transcripts are now owner-designated 10/10 benchmark cases, preprocessed with the production read stripper; ASR fidelity remains unreviewed. Expectations do not claim a measured pass.');
writeFileSync(path,JSON.stringify(d,null,2)+'\n');
console.log(JSON.stringify({cases:d.cases.length,allSourceHashesValid:d.cases.every((c:any)=>hash(resolve(root,c.provenance.sourceFile))===c.provenance.sourceFileSha256),referenceHashesValid:d.referenceCandidates.every((r:any)=>hash(r.app_source_path)===r.app_source_file_sha256),actualCases:report},null,2));

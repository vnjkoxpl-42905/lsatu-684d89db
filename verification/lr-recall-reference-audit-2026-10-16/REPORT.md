# LR Recall reference mapping audit

Local source audit only. No provider calls, source edits, uploads or copied media.

- sections: 12
- stimulus_items: 283
- question_citations: 303
- exact_question_matches: 303
- audio_linked_citations: 294
- items_with_audio: 274
- unique_source_audio_hashes: 275
- grouped_stimulus_items: 20
- clir_exact_text_mismatches: 7

All question citations match exactly. No alias fallback is required for these twelve sections. The missing audio is source unavailability, not an unmapped citation. The seven CLIR mismatches are authored spelling/wording errors (including `What is` versus `What if`); do not silently replace source content.

The transcripts are instructor walkthroughs containing reading, paraphrase, reactions and CLIR. They are not isolated final recalls and cannot serve as a gold full-recall transcript without segmentation and human review. Grade recall fidelity against the authored stimulus and details; keep reaction/CLIR assessment separate.

One grouped item, PT21_S3_Q14, has two distinct recordings (Q14/Q15); retain both. Nineteen other paired-question items share one identical recording. Split evaluation by audio hash/stimulus family to prevent duplicate leakage.

PT1.S3.Q11 and PT140.S1.Q15 have subtitle timing exceptions; use audio plus plain text, not aligned highlighting. The global silent source PT2.S4.Q19 is outside these twelve sections. All machine transcripts remain unreviewed. Hashes are taken from the existing publication manifest and were not independently rehashed in this audit.

Recommended integration manifest: source_section, item_slug, all question citations, canonical archive citation, audio hash and local path, transcript path and hash, alias provenance, speaker/source label, timing quality, human review status and review-only availability. Display reference audio after a submitted attempt, separate from the student's own recording. Do not expose it during the recall attempt.

Recommended evaluation cases: reviewed faithful paraphrase; omitted condition; reversed causal link; negation/quantifier mutation; summary without details; verbatim recitation; reaction-only response; ASR errors. Record expected per-detail labels and reason, grader version, transcript/source versions and disagreement adjudication. Provider evaluation requires separate budget/runtime execution; none was run here.

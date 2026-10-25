# RC official-source recovery evidence

Captured 2026-10-18 for local assessment-source verification. These captures are evidence, not new instructional media or content-coverage production.

- `lsac-january-2023-disclosure.pdf`: [LSAC January 2023 Disclosure Booklet](https://www.lsac.org/document-library/810), 440421 bytes. Publisher is LSAC, Form LTZC01. SHA-256: `95b5c8e8595148d045175935adb02264546a3e10145f5855ca39962bafccecdf`.
- `lsac-january-2023-page20.png`: local PyMuPDF render of zero-based page 19 (printed page 20), visually inspected. This is the first RC passage and question 2. The quoted target is present in the question. All five bank choice texts match the PDF after whitespace normalization.
- `lsac-january-2023-answer-key.png`: local render of zero-based page 28, visually inspected. The Reading Comprehension column lists question 2 as E, matching bank Q10655. Identity is established by matching passage topic, exact question wording apart from omitted quotation, all five choices, section position and key. Old-test numbering from third parties was not used as authority.
- `powerscore-scitech-passages.pdf`: [PowerScore-branded Science/Technology homework passages](https://s3.amazonaws.com/studentcenter/lsat/fl/explanations/Additional%20L10HW%20SciTech%20Passages.pdf), five pages. This is publisher reproduction evidence, not an LSAC-hosted original; no official correction is authorized from it.
- `powerscore-scitech-page3.png`: render of zero-based page 2, printed 10-4, visually inspected. Header says Passage #12: June 2006 Questions 21–27. Lines 59–61 reproduce rice among C-4 crops exactly as the bank does. This corroborates that the disputed word is not unique to this bank's extraction. It does not independently certify the LSAC original.

Downloaded directly with Python urllib; rendered locally using `uv run --with pymupdf python` (temporary tool dependency, no application dependency change). SHA256SUMS covers original PDF bytes and rendered PNG bytes. Captures contain assessment material; retain original publisher notices and use for this verification purpose.

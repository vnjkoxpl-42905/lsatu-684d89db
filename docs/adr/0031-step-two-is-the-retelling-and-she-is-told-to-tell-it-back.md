# 0031 — Step two is the Retelling, and she is told to tell it back

Date: 2026-09-04
Status: accepted

Step 2 of Read, Recall, Colour was called **Reading Recall** in the docs and
labelled **"Say it back"** in the product, which meant two names for one step and
the word "Recall" doing duty on two different steps — step 2 and **The Recall**,
which is step 4 and the whole point of the drill. ADR 0012 already had to rename
step 4 away from "The Read" for colliding with step 1; this is the same collision
one step over, and it survived because the docs and the authored copy were fixed
in different places at different times.

Step 2 is now **the Retelling** internally and in code, and **Tell it back**
everywhere a student reads it. "Recall" is left to mean step 4 and nothing else,
and the two names are now one word apart rather than unrelated. The verb was
already in use where it mattered most: the coach rubric in
`read-recall-colour.json` judged "the retelling" before this ADR existed.

## Consequences

The authored student copy changed, so a student mid-course sees "Tell it back"
where she saw "Say it back". This is the cheapest moment it will ever be: the
section runner is not in the seed library yet (ADR 0009).

ADRs 0009, 0012, 0013, 0018, 0022, 0024 and the two RRC specs still say "Reading
Recall" in their prose. They are records of what was decided when, and are left
alone. Read "Reading Recall" in anything dated before today as the Retelling.

-- Conditional Rephrase: one ladder, and a Question Type a student can read.
--
-- The bank held sixty-two good items in two sequences laid end to end. The
-- first thirty-six climbed a four-level ladder; the twenty-six after it started
-- again at "A kite cannot hold altitude in dead air" and climbed a second time.
-- A student working straight through hit the hardest compound in the bank at
-- question twenty-nine and something easy at question thirty-seven. This is the
-- same sixty-two items in one order that climbs once: the two sides plainly
-- marked, then requirement language with no "if" in sight, then the negative
-- family, then the look-alikes that sit one word apart, then the same rules
-- moved into new seats and loaded with compounds, contrasts and jargon.
-- Indicator words and their placement in the sentence are spread across the
-- climb rather than pooled, so no stretch drills one word or one seat.
--
-- Two things students could see are also repaired here.
--
-- `category` is drawn in the runner as the Question Type chip, above the
-- prompt, and it read "Level 3: \"The only\" vs \"only,\" and the verb
-- indicators": authoring scaffolding, shown to the student. Each item now names
-- its own form in the words the Activity's own rules use, "Trigger word: only
-- when", "Negative requirement: unless", "Same rule, new seat: only if".
--
-- `explanation` is revealed with the credited answer, and several carried notes
-- written for the author rather than the student ("his seed's indicator", "the
-- bank's hardest item", "Level 3's flip under load") plus cross-references by
-- item number that the reorder invalidates. Rewritten to the teaching point.
-- The leading quoted indicator is preserved in every one: the Switchyard reads
-- it to light the word on the departures board.
--
-- Assignments snapshot content at assign time and the attempt log resumes by
-- item_order, so a student mid-run would have their saved position pointed at
-- different sentences. Only assignments not yet started are re-snapshotted;
-- anything in progress or completed keeps exactly what it was issued.

update public.activities
set items = $json$[
  {
    "order": 1,
    "prompt": "Whenever the greenhouse fans run overnight, the orchids bloom by morning.",
    "credited_answers": [
      "If the fans run overnight, then the orchids bloom by morning.",
      "If the orchids did not bloom by morning, then the fans did not run overnight."
    ],
    "explanation": "\"Whenever\" (sufficient). \"Whenever,\" like \"every\" and \"all,\" marks the sufficient side.",
    "category": "Trigger word: whenever"
  },
  {
    "order": 2,
    "prompt": "The drawbridge is raised only if a tall ship signals the operator.",
    "credited_answers": [
      "If the drawbridge is raised, then a tall ship signaled the operator.",
      "If no tall ship signaled, then the drawbridge is not raised."
    ],
    "explanation": "\"Only if\" (necessary). The classic; signaling does not guarantee raising.",
    "category": "Requirement word: only if"
  },
  {
    "order": 3,
    "prompt": "When the kiln reaches firing temperature, the glaze sets within the hour.",
    "credited_answers": [
      "If the kiln reaches firing temperature, then the glaze sets within the hour.",
      "If the glaze did not set within the hour, the kiln did not reach temperature."
    ],
    "explanation": "\"When\" (sufficient). \"When\" reads like time but works like \"if.\"",
    "category": "Trigger word: when"
  },
  {
    "order": 4,
    "prompt": "The vault opens only when two floor managers are present.",
    "credited_answers": [
      "If the vault opens, then two floor managers are present.",
      "If two managers are not present, the vault does not open."
    ],
    "explanation": "\"Only when\" (necessary). Twin of \"only if.\"",
    "category": "Requirement word: only when"
  },
  {
    "order": 5,
    "prompt": "The choir performs outdoors if the evening stays dry.",
    "credited_answers": [
      "If the evening stays dry, then the choir performs outdoors.",
      "If the choir does not perform outdoors, the evening did not stay dry."
    ],
    "explanation": "Mid-sentence \"if\" (sufficient). Outcome stated first; the if-clause still marks the trigger.",
    "category": "Trigger word: if"
  },
  {
    "order": 6,
    "prompt": "Every manuscript accepted by the quarterly is read by two editors.",
    "credited_answers": [
      "If a manuscript is accepted by the quarterly, then it is read by two editors.",
      "If a manuscript was not read by two editors, then it was not accepted."
    ],
    "explanation": "\"Every\" (sufficient). The noun phrase \"every…accepted\" goes whole into the if-clause.",
    "category": "Trigger word: every"
  },
  {
    "order": 7,
    "prompt": "As long as the yeast stays refrigerated, the starter keeps its rise.",
    "credited_answers": [
      "If the yeast stays refrigerated, then the starter keeps its rise.",
      "Lost its rise, it was not kept cold."
    ],
    "explanation": "\"As long as\" (sufficient). Duration framing of \"if.\"",
    "category": "Trigger word: as long as"
  },
  {
    "order": 8,
    "prompt": "All entries that win the pastry competition use seasonal fruit.",
    "credited_answers": [
      "If an entry wins, then it uses seasonal fruit.",
      "If an entry does not use seasonal fruit, it does not win."
    ],
    "explanation": "\"All\" (sufficient). Reversal bait: using seasonal fruit guarantees nothing.",
    "category": "Trigger word: all"
  },
  {
    "order": 9,
    "prompt": "The loan converts to a grant provided that the clinic stays open five years.",
    "credited_answers": [
      "If the clinic stays open five years, then the loan converts.",
      "No conversion, it did not stay open."
    ],
    "explanation": "\"Provided that\" (sufficient).",
    "category": "Trigger word: provided that"
  },
  {
    "order": 10,
    "prompt": "Visiting scholars must clear the manuscript room's ultraviolet screening.",
    "credited_answers": [
      "If someone works in the manuscript room as a visiting scholar, then they cleared the screening.",
      "Not cleared, not admitted."
    ],
    "explanation": "\"Must\" (necessary). Requirement language: must marks what is required, never what suffices.",
    "category": "Requirement word: must"
  },
  {
    "order": 11,
    "prompt": "The relay team advances only with a clean baton exchange.",
    "credited_answers": [
      "If the team advances, then the exchange was clean.",
      "If the exchange was not clean, the team does not advance."
    ],
    "explanation": "\"Only with\" (necessary). \"Only\" attaching to a phrase, not a clause.",
    "category": "Requirement word: only with"
  },
  {
    "order": 12,
    "prompt": "Certification as a master falconer requires five seasons of supervised apprenticeship.",
    "credited_answers": [
      "If someone is certified, then they completed five seasons.",
      "No five seasons, no certification."
    ],
    "explanation": "\"Requires\" (necessary verb). First of the verb indicators: no \"if\" anywhere.",
    "category": "Requirement word: requires"
  },
  {
    "order": 13,
    "prompt": "The painting travels on the condition that the borrower installs seismic mounts.",
    "credited_answers": [
      "If the painting travels, then the mounts are installed.",
      "No mounts, no travel."
    ],
    "explanation": "\"On the condition that\" (NECESSARY). The trio's discrimination: provided-that and as-long-as mark the sufficient side; on-the-condition-that states a requirement.",
    "category": "Requirement word: on the condition that"
  },
  {
    "order": 14,
    "prompt": "Whether the observatory renews the comet survey depends on funding from the maritime trust.",
    "credited_answers": [
      "If the survey is renewed, then the trust funded it.",
      "No funding, no renewal."
    ],
    "explanation": "\"Depends on\" (necessary verb). Funding permits renewal; it does not guarantee it.",
    "category": "Requirement word: depends on"
  },
  {
    "order": 15,
    "prompt": "The only way to reach the fire lookout before noon is the switchback trail.",
    "credited_answers": [
      "If you reach the lookout before noon, then you took the switchback trail.",
      "Not the switchback, not before noon."
    ],
    "explanation": "\"The only way\" (necessary). Cousin of \"the only,\" pointing the other direction: here the described thing is the requirement.",
    "category": "Requirement word: the only way"
  },
  {
    "order": 16,
    "prompt": "A stable magnetic bearing is essential to calibrating the drone's compass.",
    "credited_answers": [
      "If the compass is calibrated, then the bearing was stable.",
      "Unstable bearing, no calibration."
    ],
    "explanation": "\"Essential to\" (necessary). Adjective form of the same move.",
    "category": "Requirement word: essential to"
  },
  {
    "order": 17,
    "prompt": "In order to bottle under the heritage label, a cidery has to press fruit from registered orchards.",
    "credited_answers": [
      "If a cidery bottles under the label, then it pressed registered fruit.",
      "No registered fruit, no label."
    ],
    "explanation": "\"In order to\" (the goal side is sufficient; the stated requirement is necessary). Purpose framing.",
    "category": "Requirement word: in order to"
  },
  {
    "order": 18,
    "prompt": "Unless the generator is refueled by dusk, the beacon goes dark.",
    "credited_answers": [
      "If the generator is not refueled by dusk, then the beacon goes dark.",
      "If the beacon did not go dark, the generator was refueled by dusk."
    ],
    "explanation": "\"Unless\" (= if not). The workhorse translation: unless = if not.",
    "category": "Negative requirement: unless"
  },
  {
    "order": 19,
    "prompt": "The orchestra tours in the spring unless the hall renovation runs late.",
    "credited_answers": [
      "If the renovation does not run late, then the orchestra tours in the spring.",
      "If the orchestra does not tour, the renovation ran late."
    ],
    "explanation": "\"Unless\" trailing. The same rule as the item before it, with the clauses swapped on the page.",
    "category": "Negative requirement: unless"
  },
  {
    "order": 20,
    "prompt": "Without a permit, no vendor may sell at the night market.",
    "credited_answers": [
      "If a vendor sells at the night market, then the vendor has a permit.",
      "If a vendor has no permit, the vendor may not sell."
    ],
    "explanation": "\"Without\" (necessary). Double negative resolves cleanly.",
    "category": "Negative requirement: without"
  },
  {
    "order": 21,
    "prompt": "Without the harbormaster's stamp, no manifest clears customs.",
    "credited_answers": [
      "If a manifest clears customs, then it carries the harbormaster's stamp.",
      "If a manifest does not carry the harbormaster's stamp, then it does not clear customs."
    ],
    "explanation": "\"Without\" (necessary). One rule, two seats; drilled as a single item pair, and the translation is identical from either seat. Seat: initial. Same rule in final position: \"No manifest clears customs without the harbormaster's stamp.\"",
    "category": "Negative requirement: without"
  },
  {
    "order": 22,
    "prompt": "File the appeal by Thursday, or else the ruling becomes final.",
    "credited_answers": [
      "If the appeal is not filed by Thursday, then the ruling becomes final.",
      "If the ruling did not become final, the appeal was filed in time."
    ],
    "explanation": "\"Or else\" (= if not). Commands hide conditionals.",
    "category": "Negative requirement: or else"
  },
  {
    "order": 23,
    "prompt": "The reef pumps must cycle nightly; otherwise the tank crashes.",
    "credited_answers": [
      "If the pumps do not cycle nightly, then the tank crashes.",
      "Tank fine, pumps cycled."
    ],
    "explanation": "\"Otherwise\" (= if not). Sibling of \"or else\" across a semicolon.",
    "category": "Negative requirement: otherwise"
  },
  {
    "order": 24,
    "prompt": "A climber cannot attempt the summit without registering at the base station.",
    "credited_answers": [
      "If a climber attempts the summit, then the climber registered at the base station.",
      "If a climber did not register, the climber cannot attempt the summit."
    ],
    "explanation": "\"Cannot…without\" (necessary). The reference-statement form.",
    "category": "Negative requirement: cannot … without"
  },
  {
    "order": 25,
    "prompt": "No thesis passes the review board without an outside reader's signature.",
    "credited_answers": [
      "If a thesis passes, then an outside reader signed.",
      "No signature, no pass."
    ],
    "explanation": "\"No…without\" (necessary). Signature is required, not sufficient; the board can still reject.",
    "category": "Negative requirement: no … without"
  },
  {
    "order": 26,
    "prompt": "The curing shed stays sealed until the humidity gauge reads forty percent.",
    "credited_answers": [
      "If the gauge has not read forty percent, then the shed stays sealed.",
      "If the shed is unsealed, the gauge read forty percent."
    ],
    "explanation": "\"Until\" (the unlock condition is necessary for the change). The state persists as long as the condition is unmet.",
    "category": "Negative requirement: until"
  },
  {
    "order": 27,
    "prompt": "The museum does not deaccession a painting unless the donor's estate consents.",
    "credited_answers": [
      "If the museum deaccessions a painting, then the estate consented.",
      "If the estate did not consent, the museum does not deaccession."
    ],
    "explanation": "\"Not…unless\" (necessary). Negative main clause + unless: the pair students scramble most.",
    "category": "Negative requirement: not … unless"
  },
  {
    "order": 28,
    "prompt": "Not until the auditor countersigns the ledger does the treasury release quarterly funds.",
    "credited_answers": [
      "If funds are released, then the auditor countersigned.",
      "No countersignature, no release."
    ],
    "explanation": "\"Not until,\" sentence-initial with inverted syntax. Twin of \"only when\" in disguise.",
    "category": "Negative requirement: not until"
  },
  {
    "order": 29,
    "prompt": "Absent a unanimous vote, the bylaws stay unchanged.",
    "credited_answers": [
      "If the vote is not unanimous, then the bylaws stay unchanged.",
      "If the bylaws changed, the vote was unanimous."
    ],
    "explanation": "\"Absent\" (= without). New synonym for the family; one word carrying the whole structure.",
    "category": "Negative requirement: absent"
  },
  {
    "order": 30,
    "prompt": "None of the trails above the ridge line are open in March.",
    "credited_answers": [
      "If a trail is above the ridge line, then it is not open in March.",
      "If a trail is open in March, it is not above the ridge line."
    ],
    "explanation": "\"None\" (sufficient subject, negated result). The subject is the trigger; what follows it is denied.",
    "category": "Negated result: none"
  },
  {
    "order": 31,
    "prompt": "Snow leopards never abandon a den before the cubs can climb.",
    "credited_answers": [
      "If the cubs cannot yet climb, then the den is not abandoned.",
      "If a den is abandoned, the cubs can climb."
    ],
    "explanation": "\"Never\" (universal negative). \"Never\" builds a conditional with a negated result.",
    "category": "Negated result: never"
  },
  {
    "order": 32,
    "prompt": "The registrar never certifies a transcript that lacks the dean's seal.",
    "credited_answers": [
      "If a transcript is certified, then it carries the dean's seal.",
      "No seal, no certification."
    ],
    "explanation": "\"Never,\" mid-sentence. The negative universal quietly marks the subject as sufficient.",
    "category": "Negated result: never"
  },
  {
    "order": 33,
    "prompt": "A kite cannot hold altitude in dead air.",
    "credited_answers": [
      "If the air is dead, then a kite does not hold altitude.",
      "If a kite holds altitude, the air is not dead."
    ],
    "explanation": "\"Cannot\" (impossibility). Impossibility statements are conditionals wearing a flat disguise.",
    "category": "Negated result: cannot"
  },
  {
    "order": 34,
    "prompt": "Sealed bids cannot be amended after the auction gavel falls.",
    "credited_answers": [
      "If the gavel has fallen, then bids cannot be amended.",
      "If a bid was amended, the gavel had not fallen."
    ],
    "explanation": "\"Cannot,\" sentence-final condition. The time clause is the sufficient side.",
    "category": "Negated result: cannot"
  },
  {
    "order": 35,
    "prompt": "Except during festival week, the archive reading room stays locked.",
    "credited_answers": [
      "If it is not festival week, then the reading room is locked.",
      "If the reading room is unlocked, it is festival week."
    ],
    "explanation": "\"Except\" (exception = the only escape). Exception-first order; the exception is not a guarantee of unlocking.",
    "category": "Negative requirement: except"
  },
  {
    "order": 36,
    "prompt": "Except where the levee has been reinforced, the river road closes during spring melt.",
    "credited_answers": [
      "If the levee has not been reinforced, then the road closes during spring melt.",
      "If the road stays open, the levee was reinforced."
    ],
    "explanation": "\"Except where\" (necessary). Exception-first; reinforcement permits an open road, it never guarantees one.",
    "category": "Negative requirement: except where"
  },
  {
    "order": 37,
    "prompt": "No one boards the research vessel unless the harbor physician signs their medical card.",
    "credited_answers": [
      "If someone boards, then the physician signed their card.",
      "No signature, no boarding."
    ],
    "explanation": "\"No one…unless.\" Two negatives and an unless resolving into one clean rule.",
    "category": "Negative requirement: no one … unless"
  },
  {
    "order": 38,
    "prompt": "The only candles sold at the apiary are poured from the hive's own wax.",
    "credited_answers": [
      "If a candle is sold at the apiary, then it is poured from the hive's wax.",
      "Not hive wax, not sold there."
    ],
    "explanation": "\"The only\" (SUFFICIENT: the described thing goes in the if-clause). The look-alike that flips sides; the next item is its opposite number.",
    "category": "Look-alike pair: the only"
  },
  {
    "order": 39,
    "prompt": "Only cellists who audition in person join the chamber ensemble.",
    "credited_answers": [
      "If a musician joins the ensemble, then that musician is a cellist who auditioned in person.",
      "No in-person audition, no seat."
    ],
    "explanation": "\"Only\" (necessary). The pair with the item before it: one word of difference, opposite structure.",
    "category": "Look-alike pair: only"
  },
  {
    "order": 40,
    "prompt": "The saplings recover if only the deer fencing goes up before bud break.",
    "credited_answers": [
      "If the fencing goes up before bud break, then the saplings recover.",
      "If the saplings did not recover, the fencing did not go up in time."
    ],
    "explanation": "\"If only\" (SUFFICIENT). The discrimination pair with \"only if\": in \"only if,\" the only governs the if (necessary); in \"if only,\" the if still marks the sufficient side and \"only\" just says the requirement is small. One word order, opposite structure.",
    "category": "Look-alike pair: if only"
  },
  {
    "order": 41,
    "prompt": "A perfect score on the final audition guarantees a seat in the touring company.",
    "credited_answers": [
      "If the audition score is perfect, then a seat is guaranteed.",
      "No seat, the score was not perfect."
    ],
    "explanation": "\"Guarantees\" (SUFFICIENT verb). The counterweight: some verbs mark the sufficient side. Requires and guarantees point opposite ways, and that is the whole discrimination.",
    "category": "Trigger word: guarantees"
  },
  {
    "order": 42,
    "prompt": "Restoring the fresco's cobalt border demands pigment ground from the original quarry.",
    "credited_answers": [
      "If the border is restored, then quarry-ground pigment was used.",
      "No quarry pigment, no restoration."
    ],
    "explanation": "\"Demands\" (necessary verb). Verb lexicon depth.",
    "category": "Requirement word: demands"
  },
  {
    "order": 43,
    "prompt": "Sealing the ferment under an airlock ensures the batch survives the summer heat.",
    "credited_answers": [
      "If the ferment is sealed under an airlock, then the batch survives.",
      "Batch spoiled, it was not sealed."
    ],
    "explanation": "\"Ensures\" (sufficient verb). Sibling of \"guarantees\".",
    "category": "Trigger word: ensures"
  },
  {
    "order": 44,
    "prompt": "Entering the archive's cold vault necessitates logging the visit with the conservator on duty.",
    "credited_answers": [
      "If someone enters the vault, then the visit was logged.",
      "Not logged, no entry."
    ],
    "explanation": "\"Necessitates\" (necessary verb). The indicator sits mid-sentence and there is no \"if\" anywhere.",
    "category": "Requirement word: necessitates"
  },
  {
    "order": 45,
    "prompt": "Dating the shipwreck to the spice trade presupposes that the hull timber was felled after the monsoon routes opened.",
    "credited_answers": [
      "If the wreck is dated to the spice trade, then the timber was felled after the routes opened.",
      "Felled earlier, not so dated."
    ],
    "explanation": "\"Presupposes\" (necessary verb). To make the claim at all, you are already committed to the timber.",
    "category": "Requirement word: presupposes"
  },
  {
    "order": 46,
    "prompt": "The festival committee will not book both the brass band and the string quartet.",
    "credited_answers": [
      "If the brass band is booked, then the string quartet is not.",
      "If the string quartet is booked, then the brass band is not."
    ],
    "explanation": "\"Not both\" (A → not B). Not-both allows neither; it only forbids the pair.",
    "category": "Not both"
  },
  {
    "order": 47,
    "prompt": "A juror may review the exhibit log or the testimony transcripts overnight, but not both.",
    "credited_answers": [
      "If a juror reviews the exhibit log overnight, then the juror does not review the testimony transcripts.",
      "If a juror reviews the testimony transcripts, then the juror does not review the exhibit log."
    ],
    "explanation": "\"But not both,\" sentence-final. The or-with-a-cap construction. Here the contrapositive and the converse coincide, which is what \"not both\" means: each one rules out the other. \"Or\" still permits either alone, and permits neither.",
    "category": "Not both"
  },
  {
    "order": 48,
    "prompt": "The observatory grants dark-sky certification if and only if every fixture in the district is fully shielded.",
    "credited_answers": [
      "If a district is granted dark-sky certification, then every fixture in it is fully shielded.",
      "If any fixture in the district is not fully shielded, then the district is not granted certification."
    ],
    "explanation": "\"If and only if\" (biconditional). The one construction where both sides are both sufficient and necessary, so the converse is credited too: if every fixture is fully shielded, then the district is granted certification.",
    "category": "Both ways: if and only if"
  },
  {
    "order": 49,
    "prompt": "The senate ratifies the water compact only if every border county holds a public hearing.",
    "credited_answers": [
      "If the senate ratifies the water compact, then every border county holds a public hearing.",
      "If some border county does not hold a public hearing, then the senate does not ratify the compact."
    ],
    "explanation": "\"Only if\" (necessary), final seat. The textbook seat. Seat: final.",
    "category": "Same rule, new seat: only if"
  },
  {
    "order": 50,
    "prompt": "Only if every border county holds a public hearing does the senate ratify the water compact.",
    "credited_answers": [
      "If the senate ratifies the water compact, then every border county holds a public hearing.",
      "If some border county does not hold a public hearing, then the senate does not ratify the compact."
    ],
    "explanation": "\"Only if\" (necessary), initial seat, inverted. Identical to the previous item. Fronting changes emphasis, never structure; the inversion (\"does the senate…\") is the disguise. Seat: initial, inverted.",
    "category": "Same rule, new seat: only if"
  },
  {
    "order": 51,
    "prompt": "Ratification of the compact, which the senate grants only if every border county has held a hearing, remains stalled this term.",
    "credited_answers": [
      "If the senate grants ratification of the compact, then every border county has held a hearing.",
      "If some border county has not held a hearing, then the senate does not grant ratification."
    ],
    "explanation": "\"Only if\" (necessary), mid-sentence, embedded. Same rule as the previous two, buried in a relative clause inside a sentence about something else. Extraction under load. Seat: mid, embedded.",
    "category": "Same rule, new seat: only if"
  },
  {
    "order": 52,
    "prompt": "Unless the dye bath holds at a simmer, the wool takes the color unevenly.",
    "credited_answers": [
      "If the dye bath does not hold at a simmer, then the wool takes the color unevenly.",
      "If the wool takes the color evenly, then the dye bath held at a simmer."
    ],
    "explanation": "\"Unless\" (= if not), initial seat. The base case for the three seats below it. Seat: initial.",
    "category": "Same rule, new seat: unless"
  },
  {
    "order": 53,
    "prompt": "The wool takes the color unevenly unless the dye bath holds at a simmer.",
    "credited_answers": [
      "If the dye bath does not hold at a simmer, then the wool takes the color unevenly.",
      "If the wool takes the color evenly, then the dye bath held at a simmer."
    ],
    "explanation": "\"Unless\" (= if not), final seat. Identical translation to the previous item; only the clause order on the page has flipped. Seat: final.",
    "category": "Same rule, new seat: unless"
  },
  {
    "order": 54,
    "prompt": "Every batch this season, unless the dye bath held at a simmer throughout, has come out mottled.",
    "credited_answers": [
      "If the dye bath did not hold at a simmer throughout, then the batch came out mottled.",
      "If a batch did not come out mottled, then the dye bath held at a simmer throughout."
    ],
    "explanation": "\"Unless\" (= if not), mid-sentence, embedded. Same rule inside an interrupting clause. The eye must reassemble the split main clause. Seat: mid, embedded.",
    "category": "Same rule, new seat: unless"
  },
  {
    "order": 55,
    "prompt": "Only when the reef survey records juvenile parrotfish at three consecutive stations does the marine reserve loosen its no-anchor rule.",
    "credited_answers": [
      "If the reserve loosens the rule, then the survey recorded juveniles at three consecutive stations.",
      "No three-station record, no loosening."
    ],
    "explanation": "\"Only when\" + inverted syntax. The inversion (\"does the reserve…\") hides which clause is the outcome.",
    "category": "Same rule, new seat: only when"
  },
  {
    "order": 56,
    "prompt": "Except where the surveyor has verified both the boundary markers and the floodplain easement, the records office will not transfer the deed.",
    "credited_answers": [
      "If the deed is transferred, then both the markers and the easement were verified.",
      "If either was unverified, no transfer."
    ],
    "explanation": "\"Except where\" + compound. Both conjuncts must survive; \"either unverified\" is the contrapositive's hinge.",
    "category": "Compound condition: except where"
  },
  {
    "order": 57,
    "prompt": "The only expeditions cleared for the ice shelf carry redundant beacons and a certified glacier medic.",
    "credited_answers": [
      "If an expedition is cleared, then it carries both.",
      "Missing either, not cleared."
    ],
    "explanation": "\"The only\" + compound. The side-flipping look-alike, now carrying two conditions at once.",
    "category": "Compound condition: the only"
  },
  {
    "order": 58,
    "prompt": "No restoration receives the guild's seal without both a reversible adhesive and a documented provenance chain.",
    "credited_answers": [
      "If a restoration receives the seal, then it used a reversible adhesive and has a provenance chain.",
      "Lacking either, no seal."
    ],
    "explanation": "\"No…without\" + compound. Both requirements have to survive into the if-then; dropping one is a partial.",
    "category": "Compound condition: no … without"
  },
  {
    "order": 59,
    "prompt": "Unless the tasting panel finds no trace of cork taint, the vintage is not released under the estate label.",
    "credited_answers": [
      "If the vintage is released under the estate label, then the panel found no trace of taint.",
      "If any taint was found, no estate release."
    ],
    "explanation": "\"Unless\" + embedded negative. Three negatives thread into one clean pair.",
    "category": "Stacked negatives: unless"
  },
  {
    "order": 60,
    "prompt": "Classifying the manuscript hand as professional necessitates matching its letterforms to guild exemplars rather than to household copybooks.",
    "credited_answers": [
      "If the hand is classified as professional, then its letterforms match guild exemplars rather than household copybooks.",
      "If they do not match guild exemplars rather than copybooks, not classified professional."
    ],
    "explanation": "\"Necessitates\" + internal contrast. The \"rather than\" clause is part of the condition; trimming it is a partial.",
    "category": "Contrast inside the condition"
  },
  {
    "order": 61,
    "prompt": "Attributing the seismic swarm to hydrothermal circulation presupposes that the tremor spectra lack the impulsive onsets characteristic of tectonic slip.",
    "credited_answers": [
      "If the swarm is attributed to hydrothermal circulation, then the spectra lack impulsive onsets.",
      "Impulsive onsets present, no such attribution."
    ],
    "explanation": "\"Presupposes\" under jargon. The structure is three words long; everything else is noise to see through.",
    "category": "Requirement word under jargon: presupposes"
  },
  {
    "order": 62,
    "prompt": "A confirmed match in the pollen record guarantees a spring dating for the flood layer, but only a sealed stratum makes the match itself trustworthy.",
    "credited_answers": [
      "If the pollen match is confirmed (and trustworthy), then the flood layer dates to spring; and if the match is trustworthy, then the stratum was sealed.",
      "Chained the other way: if the stratum was not sealed, the match is not trustworthy; and with no trustworthy match, no confirmed spring dating."
    ],
    "explanation": "\"Guarantees\" + \"only.\" Two conditionals in one sentence, and the hardest item here. Chain them rather than picking one.",
    "category": "Two conditionals in one sentence"
  }
]$json$::jsonb,
    updated_at = now()
where slug = 'conditional-rephrase';

-- The immutability guard exempts admins via has_role(auth.uid(), 'admin'), and
-- auth.uid() is NULL inside a migration, so the guard would raise and take the
-- whole migration down with it.
alter table public.activity_assignments disable trigger user;

update public.activity_assignments a
set items = src.items
from public.activities src
where a.activity_id = src.id
  and src.slug = 'conditional-rephrase'
  and a.status = 'assigned'
  and a.items is distinct from src.items;

alter table public.activity_assignments enable trigger user;

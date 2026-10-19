-- The briefing describes the drill the app actually runs.
--
-- What a student read before a 21-minute unrepeatable take, live in production
-- on every Read, Recall, Colour section row:
--
--   "Read one line silently, with full intonation. Then press space."
--   "Press space again to move to the next line, or just stop talking and it
--    moves on its own."
--
-- Three things wrong with four lines of rules. The app shows the WHOLE stimulus
-- and always has; space means "recall the full stimulus", not "next line"; and
-- advancing on detected silence was considered and rejected outright in ADR
-- 0013, because a timeout would cut her off mid-sentence if she paused to
-- think. A student who followed that last instruction and stopped talking waited
-- for ever. The same page also gave the goal as twenty minutes, against a clock
-- she is scored on at twenty-five.
--
-- The corrected copy has existed in the repo since 2026-09-02 at
-- `src/features/activity-centre/content/read-recall-colour-section.instructions.json`
-- and reached nothing: section rows inherit their instructions at seed time and
-- no seed has run since. This is that file, applied. It is generated from it
-- verbatim rather than retyped, so the two cannot drift.
--
-- It also carries two things the earlier copy could not have: the goal's real
-- condition, which the grader now enforces ("recalled, coloured, and given a
-- Read"), and the clock that is now on screen.

do $$
declare
  v_new jsonb := '{"tagline": "Read it, say it back, react to it. Then the stimulus disappears and you say the whole argument back from memory.", "task": "Work through the stimulus out loud, a piece at a time. When you have got all of it, press space. The text goes away, and you say the entire argument back from memory.", "rules": ["Everything here is out loud. The whole section records in one take, and it never pauses.", "Read silently, about a sentence at a time. When you are not sure how much to take on, take less.", "Look away and say it back in your own words. Then react to it. Both out loud.", "Keep going like that through the whole stimulus. You pick the pieces. Nothing on screen is counting them.", "Press space when you have got all of it. The stimulus vanishes and stays gone. Now say the whole argument back from memory, with every detail you can hold.", "Press space again and the next one loads. No breaks, no going back, all the way to the end."], "briefing": {"lede": "Worth reading properly once. After that, skim the rules above and go.", "sections": [{"heading": "You can understand every sentence and still arrive with nothing.", "body": ["You follow a stimulus, sentence by sentence, and it all makes sense as it goes. Then you get down to answer choice C and realise you are holding almost none of it. That is not a comprehension problem. It is a retention problem, and it is the one this drill was built for.", "Understanding is necessary for everything and sufficient for nothing. If the argument is not still with you while you work the answers, your understanding never got the chance to help.", "Most of what you call reading is built for getting to the end. Scanning names. Dropping the connecting words. Turning a list of three into one label. That is a fine way to read a phone bill. It is a bad way to read something that is about to ask you for every detail back."]}, {"heading": "What you actually do.", "body": ["Three beats through the stimulus, then a fourth once you have got all of it. You decide how much to take on at a time, and nothing on the screen is tracking where you are.", "Space is the only key, and you press it twice per stimulus. The first press takes the text away and asks you for the whole argument from memory. The second press moves you to the next stimulus. Nothing advances on its own, so a pause to think costs you nothing but the clock."], "steps": [{"label": "Read it.", "body": "Intake only. Nothing comes back out yet. Take on about a sentence, with full intonation so every word gets its weight. When you are unsure how much to take, take less. What gets lost when you grab too much is always the front of it."}, {"label": "Say it back.", "body": "Look away from the screen and say it back in your own words, out loud, like you are telling a friend what it said. Out of order is fine. Casual is fine. Laughing is fine."}, {"label": "Colour it.", "body": "React. A doubt, a question, an example, a joke, a feeling. One or two seconds is plenty. It does not have to be clever, it has to be yours."}, {"label": "The Recall.", "body": "Press space. The stimulus disappears and does not come back. Now say the entire argument back from memory, out loud, with every detail you can still hold. This is the part that gets scored."}]}, {"heading": "Simpler is not the same as shorter.", "body": ["Do not give back the gist, or the summary, or the important parts. You cannot know which parts were important until you have read the whole thing, so filtering on the way through mostly means quietly throwing out the piece you were going to need.", "Fewer words is fine when the words cover the same ideas. Fewer ideas is not. The names, the numbers, and the small words carrying the load, all, most, only, probably, they either come back or they do not.", "**Efficiency is never a licence to leave information out.**"]}, {"heading": "You will think you have nothing to say. Everybody does.", "body": ["You will open your mouth to colour something and find nothing there. That lasts about a week.", "It is not that you have no thoughts. It is that nobody has ever asked you for one in the middle of reading before, and the habit takes a few sessions to wake up. Say something obvious on purpose if you have to. \"Okay, sure.\" \"That seems like a stretch.\" \"Who measured that?\" All of those count.", "The reaction is what makes the sentence yours instead of the author''s. Skip it and you are back to repeating words you do not own."]}, {"heading": "Look away. That part is on you.", "body": ["While you are working the stimulus, nothing on the screen hides. The whole thing stays readable, which means the only thing stopping you rereading a line while you say it back is you, looking away from it.", "That is deliberate. Reading while you recall is a one way street with cars coming both ways. It jams. You stop using your memory at all and slide straight back into the author''s exact words instead of finding your own.", "It is also the version that still works on paper, and on test day. A screen that hides the text for you is a crutch that cannot come with you."]}, {"heading": "Twenty-five minutes, and what that number means.", "body": ["The goal is twenty-five minutes for a whole section, and it only counts if every stimulus got recalled, coloured, and given a Read. Finishing early with four of them skipped is not finishing early. If you have extra time on test day, your goal scales with it.", "The clock in the corner counts up, not down. It is there so you can pace a section, and it is deliberately not counting towards zero, because a number falling away in the corner of your eye produces exactly the skating read this drill exists to fix.", "It is not a race. It is the pace at which this stops being a study exercise and starts being how you read under a clock. Go slower while it is new. The speed shows up on its own once the method does."]}], "closer": "One a day holds you steady. The second one is where you improve."}, "coach": {"drill": "a whole Logical Reasoning section run out loud, where the student reads each line of a stimulus, looks away, says it back from memory in her own words, reacts to it, and gives a Read of the whole stimulus before moving to the next one", "rubric": ["Judge by meaning, never by wording. Her own words are required here, so a good recall will never match the line''s phrasing. High overlap with the original is the failure, not the standard.", "Order is free. She is encouraged to deliver the ideas out of the order she read them in, and reordering must never cost her anything.", "Casual, unpolished, laughing delivery is expected. Never mark down for style, length or fluency.", "A detail merely gestured at is not carried. Naming the topic is not the same as saying what was claimed about it.", "Numbers, names, dates, quantities and connecting words are each their own detail. Never treat one as carried because the sentence around it was.", "A reaction that could be pasted onto any other sentence does not count as a colour. Judge whether it engages this content, never whether it is correct or well put.", "Score The Read against the captured key for that stimulus, not against a retelling. A different name for the same move is fine; missing the move is not.", "Silence during a silent read is correct and expected. Only silence inside a recall or a colour counts against her."], "partial_rule": "Mark ''partial'' when the retelling is real but at least one detail went missing, which is the drill''s ordinary state. Mark ''incorrect'' only when the response is a gist or a topic label rather than a retelling."}}'::jsonb;
begin
  /*
   * Merged rather than assigned.
   *
   * `||` on jsonb replaces the top-level keys it carries and leaves the rest of
   * the object alone. Every key the briefing owns -- tagline, task, rules,
   * briefing, coach -- is replaced with the authored version; anything a row
   * has picked up that the file does not name survives. A straight assignment
   * would silently drop it, and `instructions` is the column an Activity keeps
   * its per-drill coach rubric in.
   */
  update public.activities
     set instructions = coalesce(instructions, '{}'::jsonb) || v_new
   where mode in ('section', 'section-library');

  /*
   * And the snapshots she has not run yet.
   *
   * An assignment copies the instructions at the moment it is created, which is
   * what stops a later edit changing a run underneath her. A completed run is
   * left exactly as it was, for that reason. One she has not finished is a rules
   * page she has not read yet, and leaving it describing a drill that does not
   * exist would mean every assignment already handed out keeps the fault for
   * the life of the assignment.
   *
   * The immutability trigger guards `instructions` against non-admin writes and
   * a migration presents no `auth.uid()`, so it would refuse this. Switched off
   * around the update and back on immediately, in the same transaction.
   */
  alter table public.activity_assignments disable trigger activity_assignments_guard_immutables;

  update public.activity_assignments
     set instructions = coalesce(instructions, '{}'::jsonb) || v_new
   where mode in ('section', 'section-library')
     and status is distinct from 'completed';

  alter table public.activity_assignments enable trigger activity_assignments_guard_immutables;
end $$;

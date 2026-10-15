-- The recording cap, measured rather than assumed.
--
-- The bucket was capped at 50 MB with the note that "twenty to thirty minutes
-- of Opus lands well under 50 MB. The cap is a backstop against a stuck
-- recorder, not a target." The first real run measured the rate: 15.3 MB across
-- 21 minutes 34 seconds, which is 0.71 MB per minute.
--
-- At that rate the cap is not a backstop, it is a ceiling inside the product's
-- own range. A student on the 70% accommodation works to a 50-minute goal and
-- lands near 35 MB doing it correctly. A slow, thorough run -- exactly the run
-- this drill is trying to produce, and exactly what a first attempt looks like,
-- where "somewhere near fifty minutes is normal" is what her own briefing tells
-- her to expect -- passes 50 MB somewhere past 70 minutes.
--
-- And the failure is silent in both directions. The upload is rejected, the
-- runner logs it, and the grader then refuses the run for having no recording:
-- twenty-five minutes to seventy of correct work, ending as "Not scored" with
-- nothing anywhere saying why. The client half of that is fixed separately --
-- a failed upload now retries, keeps the local copy and tells her -- but the
-- honest fix for the cap is that the cap should not be reachable by a student
-- doing the drill properly.
--
-- 200 MB is roughly four and a half hours at the measured rate. It remains what
-- it was meant to be, a backstop against a recorder that never stopped, and it
-- is now well outside anything a person can produce in one sitting.

update storage.buckets
   set file_size_limit = 209715200
 where id = 'drill-recordings';

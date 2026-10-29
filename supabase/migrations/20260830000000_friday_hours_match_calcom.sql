-- Friday runs to 7:30pm, not 6:30pm.
--
-- The weekly hours were seeded from a screenshot in July and Friday has been an
-- hour short ever since. Cal.com's own "Working Hours" schedule -- the one every
-- event type actually uses -- reads Fri 13:00-19:30, and its booking page offers
-- a 7:00pm Friday start that this platform does not. Read from the Cal.com API
-- on 2026-08-30; every other day already matched.
UPDATE public.booking_availability
SET end_time = TIME '19:30'
WHERE day_of_week = 5 AND end_time = TIME '18:30';

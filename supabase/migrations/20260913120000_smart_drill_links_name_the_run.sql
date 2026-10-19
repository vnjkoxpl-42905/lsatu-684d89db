-- A bare /drill URL names no run, so DrillLaunchGate correctly treats it as
-- empty. Resource search must point at the canonical Smart Drill launch.
UPDATE public.lsatu_content_index
SET url = '/drill?drill=smart-drill',
    updated_at = now()
WHERE kind = 'route'
  AND source_id = '/drill'
  AND chunk_index = 0;

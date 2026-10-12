import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* The Unless drill's two milestones live on the student's account, in the
   existing chapter_progress table (one row per milestone; RLS keeps each
   student to their own rows and lets admins read everyone's):
     cleared-10s  a full round of all four, 100% accurate, at 10 seconds.
                  Unlocks the 5-second pace.
     cleared-5s   the same at 5 seconds. The drill's goal.
   Signed out (or offline), the browser copy is used so the page still works. */

const TOPIC = "unless-drill";
export type UnlessMilestone = "cleared-10s" | "cleared-5s";
const LOCAL_KEY = "lsatu.unless-drill.milestones.v1";

function readLocal(): UnlessMilestone[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") as UnlessMilestone[]; } catch { return []; }
}
function writeLocal(list: UnlessMilestone[]) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}

export function useUnlessMilestones() {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<Set<UnlessMilestone>>(() => new Set(readLocal()));
  const [loading, setLoading] = useState(!!user);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("chapter_progress")
      .select("section_id")
      .eq("user_id", user.id)
      .eq("topic_tag", TOPIC)
      .then(({ data, error }) => {
        if (cancelled) return;
        // The account is the authority; only fall back to the browser copy on error.
        if (!error) setMilestones(new Set((data ?? []).map(r => r.section_id as UnlessMilestone)));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  const record = useCallback(async (m: UnlessMilestone) => {
    setMilestones(prev => new Set(prev).add(m));
    writeLocal([...new Set([...readLocal(), m])]);
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("chapter_progress").insert({
      user_id: user.id, topic_tag: TOPIC, section_id: m,
      first_viewed_at: now, last_viewed_at: now, view_count: 1,
    });
    // 23505: already recorded, which is fine.
    if (error && error.code !== "23505") console.warn("Unless drill: could not save milestone", error.message);
  }, [user]);

  return { milestones, loading, record };
}

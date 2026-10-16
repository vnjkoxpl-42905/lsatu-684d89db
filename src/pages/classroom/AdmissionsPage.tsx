import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { OnboardingAnswers } from "@/lib/onboarding";
import { AdmissionsView, scoreFromAnswers } from "./Admissions";

/** Live half: reads the student's own answers so the page can measure against
 *  their number and lead with the schools they named. A profile that fails to
 *  read still gets the table, just without the personal column. */
export default function AdmissionsPage() {
  const { user } = useAuth();
  const [answers, setAnswers] = React.useState<OnboardingAnswers>({});

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding")
        .eq("class_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setAnswers((data?.onboarding as OnboardingAnswers) ?? {});
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <AdmissionsView
      score={scoreFromAnswers(answers)}
      targetSchools={answers.schools ?? []}
    />
  );
}

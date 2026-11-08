import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadRcQuestionIndex } from "@/features/rc/lib/rcBank";
import { useFirstAnswerProgress } from "@/hooks/useFirstAnswerProgress";
import { replayPracticeRating } from "@/lib/practiceRating";
import { lrRatingQuestion } from "@/lib/practiceRatingSources";

export function usePracticeRating(studentId?: string) {
  const { ledger, loading, error, refresh } = useFirstAnswerProgress("all", studentId, { revalidateOnMount: true });
  const hasRc = ledger?.answers.some((answer) => answer.area === "RC") ?? false;
  const rc = useQuery({
    queryKey: ["practice-rating-rc-index"],
    queryFn: async () => new Map((await loadRcQuestionIndex()).questions.map((question) => [question.questionId, question])),
    enabled: hasRc,
    staleTime: Infinity,
  });
  const profile = useMemo(() => ledger ? replayPracticeRating(ledger.answers, (answer) => {
    if (answer.area === "LR") return lrRatingQuestion(answer);
    const source = answer.provenance;
    if (source?.kind !== "rc-session") return undefined;
    const question = rc.data?.get(source.questionId);
    if (question?.passageId !== source.passageId) return undefined;
    return { difficulty: question.difficulty, skill: question.questionType };
  }) : null, [ledger, rc.data]);
  return {
    profile, loading: loading || (hasRc && rc.isPending), error, refresh,
    partial: !!ledger?.coverage.missingSources.length || (hasRc && rc.isError),
  };
}

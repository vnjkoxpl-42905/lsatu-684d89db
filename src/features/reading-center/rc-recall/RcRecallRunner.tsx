import { useReadingExerciseLayout } from "../components/ReadingExerciseLayout";
import LegacyRcRecallRunner from "./LegacyRcRecallRunner";
import ContinuousRcRecallRunner from "./ContinuousRcRecallRunner";
export { formatClock } from "./LegacyRcRecallRunner";
export default function RcRecallRunner(props: Parameters<typeof LegacyRcRecallRunner>[0]) {
  useReadingExerciseLayout();
  return (props.mode === "cumulative_recall" || (props.resume && !props.resume.captureWorkflow)) ? <LegacyRcRecallRunner {...props} /> : <ContinuousRcRecallRunner {...props} />;
}

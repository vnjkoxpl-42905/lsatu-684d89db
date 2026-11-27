import { BOOTCAMPS } from "./bootcamps";
import { resolveConditionalAssignment, type ConditionalAssignmentTarget } from "./conditionalBootcampAssignment";
import { snapshotConditionalRequirements } from "../bootcamps/conditionals/courseRequirements";
/** Also consumed by Teacher Workspace so bootcamp titles, routes and grant metadata share a producer. */
export async function planBootcampAssignment(topicId: string, target: ConditionalAssignmentTarget | undefined, fullCourseReleased: boolean) {
  const bootcamp = BOOTCAMPS.find((entry) => entry.id === topicId);
  if (!bootcamp) throw new Error("Unknown bootcamp: " + topicId);
  if (target && topicId !== "conditionals") throw new Error("Conditional targets apply only to Conditional Logic Bootcamp.");
  const conditional = topicId === "conditionals" ? await resolveConditionalAssignment(target) : null;
  if (conditional?.target.courseEdition && !fullCourseReleased) throw new Error("Full conditional course assignments are not released yet.");
  return {
    title: conditional?.title ?? bootcamp.title,
    description: conditional?.description ?? bootcamp.description,
    route: conditional?.route ?? bootcamp.route,
    metadata: {
      bootcamp_id: bootcamp.id,
      ...(conditional ? {
        conditional_target: conditional.target,
        conditional_target_key: conditional.key,
        ...(conditional.target.courseEdition && conditional.target.scope !== "activity"
          ? { conditional_requirements: snapshotConditionalRequirements(conditional.target) } : {}),
      } : {}),
    },
  };
}

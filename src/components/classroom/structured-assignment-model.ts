import type { StudentTAAssignment } from "@/hooks/useStudentAssignments";

export function hasStructuredWorkspace(assignment: StudentTAAssignment) {
  return assignment.response_schema?.version === 1
    && Array.isArray(assignment.response_schema.sections)
    && assignment.response_schema.sections.length > 0;
}

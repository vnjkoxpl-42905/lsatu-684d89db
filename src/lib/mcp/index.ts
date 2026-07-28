import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import getMyProfileTool from "./tools/get-my-profile";
import listMyHomeworkTool from "./tools/list-my-homework";
import listMyClassroomItemsTool from "./tools/list-my-classroom-items";
import findStudentsTool from "./tools/find-students";
import postClassroomNoteTool from "./tools/post-classroom-note";
import assignPassageMapHomeworkTool from "./tools/assign-passage-map-homework";
import getAssignmentStatusTool from "./tools/get-assignment-status";

// Issuer must be the direct supabase.co host, built from the project ref at
// build time (never SUPABASE_URL, which is proxied on Lovable Cloud). See
// app-mcp-server-authoring for the discovery-document rationale.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lsat-u-mcp",
  title: "LSAT U",
  version: "0.2.0",
  instructions:
    "Tools for LSAT U (Aspiring Attorneys). Students can read their own profile, homework, and classroom items. Admins can resolve students, post Classroom notes, assign structured passage-map homework with a post-submit answer key, and verify assignment status. Always resolve the student first and use stable idempotency keys for writes.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    echoTool,
    getMyProfileTool,
    listMyHomeworkTool,
    listMyClassroomItemsTool,
    findStudentsTool,
    postClassroomNoteTool,
    assignPassageMapHomeworkTool,
    getAssignmentStatusTool,
  ],
});

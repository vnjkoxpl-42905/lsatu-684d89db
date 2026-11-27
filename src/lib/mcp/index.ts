import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import getMyProfileTool from "./tools/get-my-profile";
import listMyHomeworkTool from "./tools/list-my-homework";
import listMyClassroomItemsTool from "./tools/list-my-classroom-items";
import findStudentsTool from "./tools/find-students";
import postClassroomNoteTool from "./tools/post-classroom-note";
import assignPassageMapHomeworkTool from "./tools/assign-passage-map-homework";
import getAssignmentStatusTool from "./tools/get-assignment-status";
import listStudentsTool from "./tools/list-students";
import listHomeworkSetsTool from "./tools/list-homework-sets";
import assignHomeworkTool from "./tools/assign-homework";
import sendNoteTool from "./tools/send-note";
import searchTeachingCatalogTool from "./tools/search-teaching-catalog";
import previewTeachingAssignmentTool from "./tools/preview-teaching-assignment";
import assignTeachingWorkTool from "./tools/assign-teaching-work";
import listInboxConversationsTool from "./tools/list-inbox-conversations";
import readInboxThreadTool from "./tools/read-inbox-thread";
import replyInboxThreadTool from "./tools/reply-inbox-thread";

// Issuer must be the direct supabase.co host, built from the project ref at
// build time (never SUPABASE_URL, which is proxied on Lovable Cloud). See
// app-mcp-server-authoring for the discovery-document rationale.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lsat-u-mcp",
  title: "LSAT U",
  version: "0.4.0",
  instructions:
    "Tools for LSAT U (Aspiring Attorneys). Students can read their own profile and Classroom work. Teachers must resolve the student and preview catalog assignments before explicit execution. Ask the teacher to choose when student or item matches are ambiguous. Use the approved preview and the same idempotency key when retrying a write. Classroom notes and direct Inbox replies are separate actions. Read Inbox threads without marking them read by default. Send a reply only when the teacher explicitly asks to send it.",
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
    listStudentsTool,
    listHomeworkSetsTool,
    assignHomeworkTool,
    sendNoteTool,
    searchTeachingCatalogTool,
    previewTeachingAssignmentTool,
    assignTeachingWorkTool,
    listInboxConversationsTool,
    readInboxThreadTool,
    replyInboxThreadTool,
  ],
});

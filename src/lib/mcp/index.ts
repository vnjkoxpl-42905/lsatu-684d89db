import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import getMyProfileTool from "./tools/get-my-profile";
import listMyHomeworkTool from "./tools/list-my-homework";
import listMyClassroomItemsTool from "./tools/list-my-classroom-items";

// Issuer must be the direct supabase.co host, built from the project ref at
// build time (never SUPABASE_URL, which is proxied on Lovable Cloud). See
// app-mcp-server-authoring for the discovery-document rationale.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lsat-u-mcp",
  title: "LSAT U",
  version: "0.1.0",
  instructions:
    "Tools for LSAT U (Aspiring Attorneys). Read the signed-in student's profile, homework assignments, and classroom items assigned by their instructor. Use `echo` to verify connectivity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, getMyProfileTool, listMyHomeworkTool, listMyClassroomItemsTool],
});

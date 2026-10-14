import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DESTINATIONS,
  EXAM_TABS,
  destinationLandingPath,
  destinationLock,
  isTabActive,
  railItemLocked,
  tabAccess,
  type Destination,
} from "./destinationAccess";
import { preserveRedirectLocation, redirectLegacyHistoryLocation } from "./preserveRedirectLocation";

const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

const NONE = {
  loading: false, is_admin: false, has_bootcamp_access: false, has_classroom_access: false,
  has_analytics_access: false, has_schedule_access: false, has_practice_access: false,
  has_drill_access: false, has_waj_access: false, has_journal_access: false,
  has_flagged_access: false, has_chat_access: false, has_export_access: false,
  has_ta_access: false, has_activity_access: false,
};
// Tier presets from docs/verification/student-tier-defaults.md. Wrong answers,
// Flagged and Progress are derived from Drill or Practice tests.
const TIER_1 = { ...NONE, has_drill_access: true, has_practice_access: true, has_classroom_access: true, has_journal_access: true, has_flagged_access: true, has_analytics_access: true, has_chat_access: true, has_schedule_access: true };
const TIER_2 = { ...NONE, has_classroom_access: true, has_chat_access: true, has_schedule_access: true };
const TIER_3 = { ...NONE, has_chat_access: true, has_schedule_access: true };
const ADMIN = { ...NONE, is_admin: true };
const LOADING = { ...NONE, loading: true };

/** The ProtectedRoute shape App.tsx registers for a destination child path. */
function routeGate(destination: Destination, child: string): string {
  const parent = app.indexOf(`<Route path="/${destination}" element=`);
  const close = app.indexOf("</Route>", parent);
  const block = app.slice(parent, close);
  const match = block.match(new RegExp(`<Route path="${child.replace(/[/*]/g, "\\$&")}" element=\\{<(\\w+)([^>]*)>`));
  if (!match) throw new Error(`No route for /${destination}/${child}`);
  return `${match[1]}${match[2]}`.trim();
}

describe("destination route matrix", () => {
  it.each(Object.entries(DESTINATIONS))("registers %s and every tab with the gate its padlock describes", (destination, config) => {
    expect(app).toContain(`<Route path="${config.path}" element={<ProtectedRoute allowSignedIn><StudentDestination destination="${destination}" />`);
    expect(app).toContain(`<DestinationIndex destination="${destination}" />`);
    for (const tab of config.tabs) {
      const gate = routeGate(destination as Destination, tab.path.slice(config.path.length + 1));
      if (tab.admin) expect(gate).toBe("ProtectedRoute requireAdmin");
      else if (tab.readingCenterEligible) expect(gate).toBe('MyWorkGate');
      else if (tab.path === "/practice/exams") expect(gate).toBe("TestingCentreGate");
      else if (tab.allowSignedIn) expect(gate).toBe("ProtectedRoute allowSignedIn");
      else if (tab.flags!.length === 1) expect(gate).toBe(`ProtectedRoute flag="${tab.flags![0]}"`);
      else expect(gate).toBe(`ProtectedRoute flag={${JSON.stringify(tab.flags)}}`.replace(/,/g, ", "));
    }
  });

  it("registers the Practice Exams sub-row", () => {
    expect(routeGate("practice", "exams/all")).toBe("TestingCentreGate");
    expect(routeGate("practice", "exams/attempts")).toBe("ProtectedRoute allowSignedIn");
    expect(EXAM_TABS.map((tab) => tab.path)).toEqual(["/practice/exams", "/practice/exams/all", "/practice/exams/attempts"]);
  });
});

describe("tab access", () => {
  it('opens only the two filtered work tabs for a verified Reading Center assignment', () => {
    const assigned = { ...NONE, readingCenterAssigned: true };
    expect(tabAccess(DESTINATIONS['my-work'].tabs[0], assigned)).toBe('open');
    expect(tabAccess(DESTINATIONS['my-work'].tabs[1], assigned)).toBe('open');
    expect(tabAccess(DESTINATIONS['my-work'].tabs[2], assigned)).toBe('locked');
    expect(destinationLock('my-work', assigned)).toBe('partial');
    expect(railItemLocked('my-work', assigned)).toBe(false);
    expect(destinationLock('library', assigned)).toBe('locked');
  });
  it('does not draw a My Work lock before the assignment check resolves', () => {
    expect(destinationLock('my-work', { ...NONE, readingCenterChecking: true })).toBe('checking');
    expect(railItemLocked('my-work', { ...NONE, readingCenterChecking: true })).toBe(false);
    expect(tabAccess(DESTINATIONS['my-work'].tabs[2], { ...NONE, readingCenterChecking: true })).toBe('locked');
  });
  it("never reports a lock while permissions are unresolved", () => {
    for (const config of Object.values(DESTINATIONS)) {
      for (const tab of config.tabs) expect(tabAccess(tab, LOADING)).toBe("checking");
    }
    expect(railItemLocked("progress", LOADING)).toBe(false);
  });

  it("keeps Admissions to Joshua and admins only", () => {
    const admissions = DESTINATIONS.library.tabs.find((tab) => tab.admin)!;
    expect(tabAccess(admissions, TIER_1)).toBe("locked");
    expect(tabAccess(admissions, ADMIN)).toBe("open");
  });

  it("keeps exam assignment doors reachable only for assignment-eligible accounts", () => {
    for (const tab of EXAM_TABS.slice(0, 2)) {
      expect(tabAccess(tab, TIER_3)).toBe("locked");
      expect(tabAccess(tab, TIER_2)).toBe("open");
      expect(tabAccess(tab, { ...TIER_3, has_practice_access: true })).toBe("open");
      expect(tabAccess(tab, ADMIN)).toBe("open");
    }
  });

  it("opens everything for an admin", () => {
    for (const destination of Object.keys(DESTINATIONS) as Destination[]) {
      expect(destinationLock(destination, ADMIN)).toBe("open");
    }
  });

  it.each([
    ["Tier 1", TIER_1, { "my-work": "open", practice: "open", review: "open", progress: "open", library: "open" }],
    ["Tier 2", TIER_2, { "my-work": "open", practice: "partial", review: "partial", progress: "locked", library: "partial" }],
    ["Tier 3", TIER_3, { "my-work": "locked", practice: "partial", review: "partial", progress: "locked", library: "locked" }],
  ] as const)("%s sees the expected lock per destination", (_tier, permissions, expected) => {
    for (const [destination, lock] of Object.entries(expected)) {
      expect(destinationLock(destination as Destination, permissions)).toBe(lock);
    }
  });

  it("does not let a staff-only Admissions tab mark Library as partly locked", () => {
    expect(destinationLock("library", { ...TIER_1, has_bootcamp_access: true })).toBe("open");
  });

  it("marks only fully locked rail destinations; Home and Schedule are never padlocked", () => {
    expect(railItemLocked("progress", TIER_3)).toBe(true);
    expect(railItemLocked("my-work", TIER_3)).toBe(true);
    expect(railItemLocked("review", TIER_3)).toBe(false);
    expect(railItemLocked("home", TIER_3)).toBe(false);
    expect(railItemLocked("schedule", NONE)).toBe(false);
  });
});

describe("destination landing", () => {
  it.each([
    ["practice", TIER_1, "/practice/drills"],
    ["practice", { ...NONE, has_practice_access: true }, "/practice/exams"],
    ["practice", TIER_2, "/practice/exams"],
    ["practice", TIER_3, "/practice/exams/attempts"],
    ["library", TIER_2, "/library/activities"],
    ["library", TIER_1, "/library/lessons"],
    ["review", TIER_3, "/review/to-review"],
    ["my-work", TIER_3, "/my-work/to-do"],
    ["progress", TIER_3, "/progress/overview"],
    ["library", ADMIN, "/library/lessons"],
  ] as const)("%s lands a matching account on its first open tab", (destination, permissions, path) => {
    expect(destinationLandingPath(destination, permissions)).toBe(path);
  });
});

describe("active tab", () => {
  it("marks the owning tab on nested pages", () => {
    const [drills, exams] = DESTINATIONS.practice.tabs;
    expect(isTabActive(drills, "/practice/drills/runs/abc")).toBe(true);
    expect(isTabActive(exams, "/practice/exams/attempts")).toBe(true);
    expect(isTabActive(drills, "/practice/exams")).toBe(false);
  });

  it("keeps Overview exact and gives exam detail pages to All Exams", () => {
    const [overview, all, attempts] = EXAM_TABS;
    expect(isTabActive(overview, "/practice/exams/all", "exams")).toBe(false);
    expect(isTabActive(all, "/practice/exams/pt101", "exams")).toBe(true);
    expect(isTabActive(all, "/practice/exams/attempts", "exams")).toBe(false);
    expect(isTabActive(attempts, "/practice/exams/attempts", "exams")).toBe(true);
  });
});

describe("legacy links", () => {
  /** Every `path="X" element={<RedirectWithSearch to="Y" />}` in App.tsx. */
  const redirects = new Map(
    [...app.matchAll(/<Route path="([^"]+)" element=\{<RedirectWithSearch to="([^"]+)" \/>\}/g)].map((m) => [m[1], m[2]]),
  );

  it.each([
    ["/waj", "/review/wrong"],
    ["/journal", "/review/wrong"],
    ["/flagged", "/review/flagged"],
    ["/analytics", "/progress/overview"],
    ["/testing", "/practice/exams"],
    ["/testing/exams", "/practice/exams/all"],
    ["/testing/attempts", "/practice/exams/attempts"],
    ["/sets", "/practice/drills/saved"],
    ["/practice/sets", "/practice/drills/saved"],
    ["/activities", "/library/activities"],
    ["/bootcamps", "/library/bootcamps"],
    ["/bootcamp/structure", "/library/bootcamps"],
    ["/foyer", "/classroom"],
    ["/mainhub", "/classroom"],
    ["/profile", "/classroom/account"],
    ["/settings/layout", "/classroom/account?section=layout"],
  ])("%s forwards to %s keeping its query and hash", (from, to) => {
    expect(redirects.get(from)).toBe(to);
  });

  it("forwards old History links through the filter-aware redirect", () => {
    expect(app).toContain('<Route path="/history" element={<RedirectLegacyHistory />} />');
    expect(redirectLegacyHistoryLocation("?area=rc", "#row"))
      .toBe("/progress/history?historyArea=RC#row");
  });

  it("reaches every legacy target in one hop, so no redirect can loop", () => {
    for (const [from, to] of redirects) {
      const target = to.split(/[?#]/)[0];
      expect(redirects.has(target), `${from} -> ${to} is itself a redirect`).toBe(false);
    }
  });

  it("keeps question, run and filter identity across the hop", () => {
    expect(preserveRedirectLocation("/review/wrong", "?qid=pt101-s1-q3&type=flaw", "#notes")).toBe("/review/wrong?qid=pt101-s1-q3&type=flaw#notes");
    expect(preserveRedirectLocation("/practice/drills", "?section=rc&stage=type-drill&run=r1", "")).toBe("/practice/drills?section=rc&stage=type-drill&run=r1");
    expect(preserveRedirectLocation("/classroom/account?section=layout", "?section=profile&from=email", "")).toBe("/classroom/account?section=layout&from=email");
  });

  it("does not leave a query-dropping Navigate on any student legacy path", () => {
    for (const path of ["/waj", "/foyer", "/mainhub", "/profile", "/settings/layout", "/bootcamp/structure", "/bootcamp/structure-v2"]) {
      expect(app).not.toContain(`<Route path="${path}" element={<Navigate`);
    }
  });
});

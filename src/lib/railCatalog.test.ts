import { REVIEW_HUB_ROUTES, REVIEW_HUB_ALIASES } from './reviewHubRoutes';
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RAIL_CATALOG,
  migrateLegacyRailPrefs,
  normalizeRailPrefs,
  resolveRailGroups,
} from "./railCatalog";

const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

describe("seven destination rail", () => {
  it("has exactly six top-level destinations with canonical routes", () => {
    expect(RAIL_CATALOG.map((item) => item.id)).toEqual([
      "home", "my-work", "practice", "review", "library", "schedule",
    ]);
    for (const path of ["/classroom", "/my-work", "/practice", "/library", "/schedule"]) {
      expect(app).toContain(`path="${path}"`);
    }
  });

  it("registers every URL-backed tab", () => {
    const tabs = readFileSync(resolve(process.cwd(), "src/lib/destinationAccess.ts"), "utf8");
    for (const path of [
      "/my-work/to-do", "/my-work/completed", "/my-work/notes",
      "/practice/drills", "/practice/exams", "/practice/exams/all", "/practice/exams/attempts",
      "/review/to-review", "/review/progress", "/review/history",
      "/library/lessons", "/library/activities", "/library/bootcamps", "/library/admissions",
    ]) expect(tabs).toContain(path);
    expect(app).toContain('path="drills/saved" element={<RedirectWithSearch to="/practice/drills?view=saved" />}');
  });

  it("keeps each parent available while locking individual tabs and Admissions", () => {
    expect(app).toContain('path="admissions" element={<ProtectedRoute requireAdmin><AdmissionsPage />');
    expect(REVIEW_HUB_ROUTES.flagged.flag).toBe('has_flagged_access');
    expect(app).toContain('flag={REVIEW_HUB_ROUTES.flagged.flag}');
    expect(REVIEW_HUB_ROUTES.journal.flag).toBe('has_journal_access');
    expect(app).toContain('flag={REVIEW_HUB_ROUTES.journal.flag}');
    // Activities and Bootcamps are assignment-only under Classroom access
    // (student tier defaults, 5b5d5b0); the retired category flag no longer gates them.
    expect(app).toContain('path="activities" element={<ProtectedRoute flag="has_classroom_access">');
  });
});

describe("versioned rail preference migration", () => {
  it("orders each new parent by the first visible old member", () => {
    const migrated = migrateLegacyRailPrefs({
      order: { classroom: ["work", "drill", "home"], study: ["activities", "notes"], review: ["history", "review"] },
      hidden: [],
    });
    expect(migrated.order.classroom?.slice(0, 5)).toEqual(["my-work", "practice", "home", "library", "progress"]);
  });

  it("hides a merged destination only when all former members were hidden", () => {
    expect(migrateLegacyRailPrefs({ hidden: ["drill"] }).hidden).not.toContain("practice");
    expect(migrateLegacyRailPrefs({ hidden: ["drill", "testing"] }).hidden).toContain("practice");
    expect(migrateLegacyRailPrefs({ hidden: ["home"] }).hidden).not.toContain("home");
  });

  it("normalizes v2 once and always keeps Home visible", () => {
    const prefs = normalizeRailPrefs({ order: { classroom: ["progress", "home", "progress", "unknown"] }, hidden: ["home", "library"] });
    expect(prefs.order.classroom).toEqual(["progress", "home"]);
    expect(prefs.hidden).toEqual(["library"]);
    expect(resolveRailGroups(prefs)[0].items.map((item) => item.id)).not.toContain("library");
    expect(resolveRailGroups(prefs)[0].items.map((item) => item.id)).toContain("home");
  });
});

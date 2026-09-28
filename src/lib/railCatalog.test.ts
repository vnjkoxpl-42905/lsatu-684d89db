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
  it("has exactly seven top-level destinations with canonical routes", () => {
    expect(RAIL_CATALOG.map((item) => item.id)).toEqual([
      "home", "my-work", "practice", "review", "progress", "library", "schedule",
    ]);
    for (const path of ["/classroom", "/my-work", "/practice", "/review", "/progress", "/library", "/schedule"]) {
      expect(app).toContain(`path="${path}"`);
    }
  });

  it("registers every URL-backed tab", () => {
    const tabs = readFileSync(resolve(process.cwd(), "src/pages/StudentDestination.tsx"), "utf8");
    for (const path of [
      "/my-work/to-do", "/my-work/completed", "/my-work/notes",
      "/practice/drills", "/practice/drills/saved", "/practice/exams", "/practice/exams/all", "/practice/exams/attempts",
      "/review/to-review", "/review/wrong", "/review/flagged",
      "/progress/overview", "/progress/history", "/progress/topics",
      "/library/lessons", "/library/activities", "/library/bootcamps", "/library/admissions",
    ]) expect(tabs).toContain(path);
  });

  it("keeps each parent available while locking individual tabs and Admissions", () => {
    expect(app).toContain('path="admissions" element={<ProtectedRoute requireAdmin><AdmissionsPage />');
    expect(app).toContain('path="flagged" element={<ProtectedRoute flag="has_flagged_access">');
    expect(app).toContain('path="wrong" element={<ProtectedRoute flag="has_journal_access">');
    expect(app).toContain('path="activities" element={<ProtectedRoute flag="has_activity_access">');
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

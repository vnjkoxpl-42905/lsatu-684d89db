import { afterEach, describe, expect, it } from "vitest";
import {
  DRILL_SECTION_STORAGE_KEY,
  parseDrillSection,
  readRememberedSection,
  rememberSection,
  resolveDrillSection,
} from "./drillSection";

afterEach(() => {
  window.localStorage.clear();
});

describe("parseDrillSection", () => {
  it("reads both sections, case and whitespace insensitively", () => {
    expect(parseDrillSection("rc")).toBe("rc");
    expect(parseDrillSection(" RC ")).toBe("rc");
    expect(parseDrillSection("lr")).toBe("lr");
  });

  it("returns null for anything it does not know, rather than throwing", () => {
    expect(parseDrillSection(null)).toBeNull();
    expect(parseDrillSection(undefined)).toBeNull();
    expect(parseDrillSection("")).toBeNull();
    expect(parseDrillSection("reading")).toBeNull();
    expect(parseDrillSection("../rc")).toBeNull();
  });
});

describe("resolveDrillSection", () => {
  it("defaults to LR for a student who has never chosen", () => {
    expect(resolveDrillSection(null)).toBe("lr");
  });

  it("uses the remembered section when the URL is silent", () => {
    rememberSection("rc");
    expect(resolveDrillSection(null)).toBe("rc");
  });

  it("lets an explicit link outrank what the browser remembers", () => {
    rememberSection("rc");
    expect(resolveDrillSection("lr")).toBe("lr");
    rememberSection("lr");
    expect(resolveDrillSection("rc")).toBe("rc");
  });

  it("resolves a stated-but-unrecognised section to LR, not to the remembered one", () => {
    rememberSection("rc");
    expect(resolveDrillSection("sideways")).toBe("lr");
  });

  it("treats an empty param as absent, so the remembered value still applies", () => {
    rememberSection("rc");
    expect(resolveDrillSection("")).toBe("rc");
    expect(resolveDrillSection("   ")).toBe("rc");
  });
});

describe("remembering", () => {
  it("round-trips through storage", () => {
    rememberSection("rc");
    expect(window.localStorage.getItem(DRILL_SECTION_STORAGE_KEY)).toBe("rc");
    expect(readRememberedSection()).toBe("rc");
  });

  it("ignores a value some other writer left in the key", () => {
    window.localStorage.setItem(DRILL_SECTION_STORAGE_KEY, "{}");
    expect(readRememberedSection()).toBeNull();
    expect(resolveDrillSection(null)).toBe("lr");
  });
});

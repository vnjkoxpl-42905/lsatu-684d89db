import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260720120000_booking_phase1_link_invariants.sql"),
  "utf8",
);

describe("booking Phase 1 migration contract", () => {
  it("enforces unique slugs and one active-or-paused pass per student", () => {
    expect(migration).toContain("CREATE UNIQUE INDEX booking_passes_slug_unique");
    expect(migration).toContain("CREATE UNIQUE INDEX one_resumable_pass_per_student");
    expect(migration).toContain("status IN ('active', 'paused')");
  });

  it("revokes active and paused passes during an account grant", () => {
    expect(migration).toMatch(/UPDATE public\.booking_passes SET status = 'revoked'[\s\S]*status IN \('active', 'paused'\)/);
  });

  it("removes the obsolete grant overload and schema-qualifies secure randomness", () => {
    expect(migration).toContain("DROP FUNCTION IF EXISTS public.grant_booking_access(uuid, text, text, int, int, timestamptz, uuid, text)");
    expect(migration).toContain("extensions.gen_random_bytes(26)");
  });

  it("uses a volatile resolver for lazy expiry", () => {
    const resolver = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.resolve_booking_link_full"));
    expect(resolver).toMatch(/RETURNS public\.booking_passes\s+LANGUAGE plpgsql\s+VOLATILE/);
  });

  it("keeps weak-link rotation dry-run by default", () => {
    expect(migration).toContain("rotate_weak_booking_slugs(_apply boolean DEFAULT false)");
    expect(migration).toContain("IF _apply THEN");
  });

  it("provides a strong-link RPC for manual passes", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.create_manual_booking_pass");
    expect(migration).toContain("public.is_strong_booking_slug(_booking_slug)");
  });
});

import { describe, expect, it } from 'vitest';
import { LAW_SCHOOLS, searchLawSchools } from './lawSchools';

describe('lawSchools', () => {
  it('carries the accredited US schools and the Canadian faculties', () => {
    expect(LAW_SCHOOLS.length).toBeGreaterThan(200);
    expect(LAW_SCHOOLS.some((s) => s.name === 'Harvard Law School')).toBe(true);
    expect(LAW_SCHOOLS.some((s) => s.name === 'Osgoode Hall Law School')).toBe(true);
  });

  it('has no duplicate names', () => {
    const names = LAW_SCHOOLS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('finds a school from a partial name', () => {
    expect(searchLawSchools('fordh')[0].name).toBe('Fordham University School of Law');
    expect(searchLawSchools('osgoo')[0].name).toBe('Osgoode Hall Law School');
  });

  it('finds a school by the name students actually use', () => {
    // The official name says "Gould"; nobody types that.
    expect(searchLawSchools('USC').map((s) => s.name)).toContain('Gould School of Law');
    expect(searchLawSchools('BYU').map((s) => s.name)).toContain('J. Reuben Clark Law School');
    expect(searchLawSchools('U of T').map((s) => s.name)).toContain(
      'University of Toronto Faculty of Law',
    );
  });

  it('ranks a name that starts with the query above one that merely contains it', () => {
    const results = searchLawSchools('columbia');
    expect(results[0].name).toBe('Columbia Law School');
  });

  it('returns nothing for an empty query, and caps what it returns', () => {
    expect(searchLawSchools('   ')).toEqual([]);
    expect(searchLawSchools('law').length).toBeLessThanOrEqual(8);
  });
});

describe('who leads the results', () => {
  it('puts American schools ahead of Canadian ones at equal relevance', () => {
    const results = searchLawSchools('university of');
    expect(results[0].country).toBeUndefined();
  });

  it('carries the ABA schools the source list missed', () => {
    const names = LAW_SCHOOLS.map((s) => s.name);
    expect(names).toContain("Atlanta's John Marshall Law School");
    expect(names).toContain('University of La Verne College of Law');
    // Not a JD an applicant applies to.
    expect(names.some((n) => n.includes('Judge Advocate'))).toBe(false);
  });
});

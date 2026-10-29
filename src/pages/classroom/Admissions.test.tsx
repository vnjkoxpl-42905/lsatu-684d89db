import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AdmissionsView, scoreFromAnswers } from "./Admissions";
import {
  SCHOOL_ADMISSIONS,
  findAdmissionsFor,
  standingFor,
} from "@/data/schoolAdmissions";

describe("the admissions data", () => {
  it("covers every accredited school with a real median", () => {
    expect(SCHOOL_ADMISSIONS.length).toBeGreaterThan(190);
    expect(SCHOOL_ADMISSIONS.every((s) => s.lsat50 >= 130 && s.lsat50 <= 180)).toBe(true);
  });

  it("is ordered by LSAT median, highest first", () => {
    const medians = SCHOOL_ADMISSIONS.map((s) => s.lsat50);
    expect(medians).toEqual([...medians].sort((a, b) => b - a));
  });

  it("keeps each school's percentiles in order", () => {
    for (const s of SCHOOL_ADMISSIONS) {
      if (s.lsat25 !== null) expect(s.lsat25).toBeLessThanOrEqual(s.lsat50);
      if (s.lsat75 !== null) expect(s.lsat75).toBeGreaterThanOrEqual(s.lsat50);
    }
  });
});

describe("findAdmissionsFor", () => {
  it("matches the intake's law-school name to the 509 row's university name", () => {
    expect(findAdmissionsFor("Harvard Law School")?.name).toBe("Harvard University");
    expect(findAdmissionsFor("Georgetown University Law Center")?.name).toBe(
      "Georgetown University",
    );
    expect(findAdmissionsFor("Yale Law School")?.name).toBe("Yale University");
  });

  it("does not let a shared word claim the wrong school", () => {
    const chicago = findAdmissionsFor("University of Chicago Law School");
    expect(chicago?.name).toBe("University of Chicago");
  });

  it("returns nothing for a school it has never heard of", () => {
    expect(findAdmissionsFor("Hogwarts School of Law")).toBeUndefined();
    expect(findAdmissionsFor("   ")).toBeUndefined();
  });
});

describe("standingFor", () => {
  const school = { ...SCHOOL_ADMISSIONS[0], lsat25: 170, lsat50: 173, lsat75: 175 };

  it("reads a score against one school's class", () => {
    expect(standingFor(177, school)).toBe("above75");
    expect(standingFor(175, school)).toBe("at75");
    expect(standingFor(172, school)).toBe("between");
    expect(standingFor(165, school)).toBe("below25");
  });
});

describe("scoreFromAnswers", () => {
  it("aims at the target when there is one, and the top of the band", () => {
    expect(scoreFromAnswers({ target_score_band: "166_170" })).toBe(170);
    expect(scoreFromAnswers({ last_score_band: "156_160" })).toBe(160);
    expect(scoreFromAnswers({ target_score_band: "lte_150" })).toBe(150);
  });

  it("invents no number when they have not said", () => {
    expect(scoreFromAnswers({})).toBeNull();
    expect(scoreFromAnswers({ target_score_band: "not_sure" })).toBeNull();
  });
});

describe("AdmissionsView", () => {
  it("says what the numbers are, and what they are not", () => {
    render(<AdmissionsView score={null} targetSchools={[]} />);
    expect(screen.getByText(/These are the classes that got in, not cutoffs/)).toBeTruthy();
    expect(screen.getByText(/ABA Standard 509 disclosures/)).toBeTruthy();
  });

  it("leads with the schools the student named", () => {
    render(<AdmissionsView score={null} targetSchools={["Harvard Law School"]} />);
    const heading = screen.getByRole("heading", { name: /Your schools/ });
    const table = heading.nextElementSibling as HTMLElement;
    expect(within(table).getByText("Harvard University")).toBeTruthy();
  });

  it("shows no personal column until it knows a score", () => {
    render(<AdmissionsView score={null} targetSchools={[]} />);
    expect(screen.queryByRole("columnheader", { name: "You" })).toBeNull();
  });

  it("places the student against each school once it does", () => {
    render(<AdmissionsView score={180} targetSchools={[]} />);
    expect(screen.getAllByRole("columnheader", { name: "You" }).length).toBe(1);
    // Nobody's 75th is above 180, so a perfect score clears every school.
    expect(screen.getAllByText("Above their 75th").length).toBeGreaterThan(100);
  });

  it("searches by school and by state", () => {
    render(<AdmissionsView score={null} targetSchools={[]} />);
    fireEvent.change(screen.getByLabelText("Search schools"), {
      target: { value: "Wyoming" },
    });
    expect(screen.getByText("University of Wyoming")).toBeTruthy();
    expect(screen.queryByText("Yale University")).toBeNull();
  });

  it("says so plainly when nothing matches", () => {
    render(<AdmissionsView score={null} targetSchools={[]} />);
    fireEvent.change(screen.getByLabelText("Search schools"), {
      target: { value: "Hogwarts" },
    });
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });
});

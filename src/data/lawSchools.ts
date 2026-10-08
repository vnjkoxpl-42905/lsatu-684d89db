/**
 * Law schools a student can pick from in the intake.
 *
 * The ABA-accredited US schools plus the Canadian common-law faculties, since
 * a good share of Joshua's students apply north of the border. `aliases` carry
 * the parent institution for schools whose official name omits it, because a
 * student types "USC" or "BYU", not "Gould" or "J. Reuben Clark".
 *
 * The list is a convenience, never a gate: the intake lets a student add a
 * school that is not here, so an omission costs them nothing.
 *
 * Sources: ABA-accredited list (read 2026-08-29) and the Canadian common-law
 * faculties. Verify before adding: a school nobody can apply to is worse than
 * one missing from the suggestions.
 */
export interface LawSchool {
  name: string;
  /** US state or Canadian province, two letters. */
  region: string;
  /** Other names a student might type. */
  aliases?: string[];
  /** Set on the Canadian faculties. US schools carry nothing and lead. */
  country?: 'CA';
}

export const LAW_SCHOOLS: LawSchool[] = [
  { name: "Cumberland School of Law", region: "AL", aliases: ["Samford University"] },
  { name: "Thomas Goode Jones School of Law", region: "AL", aliases: ["Faulkner University"] },
  { name: "University of Alabama School of Law", region: "AL" },
  { name: "Sandra Day O'Connor College of Law", region: "AZ", aliases: ["Arizona State University", "ASU"] },
  { name: "James E. Rogers College of Law", region: "AZ", aliases: ["University of Arizona"] },
  { name: "University of Arkansas School of Law", region: "AR" },
  { name: "William H. Bowen School of Law", region: "AR", aliases: ["University of Arkansas at Little Rock"] },
  { name: "California Western School of Law", region: "CA" },
  { name: "Chapman University School of Law", region: "CA" },
  { name: "Loyola Law School", region: "CA", aliases: ["Loyola Marymount University", "Los Angeles"] },
  { name: "McGeorge School of Law", region: "CA", aliases: ["University of the Pacific"] },
  { name: "Pepperdine University School of Law", region: "CA" },
  { name: "Santa Clara University School of Law", region: "CA" },
  { name: "Southwestern Law School", region: "CA" },
  { name: "Stanford Law School", region: "CA" },
  { name: "University of California, Berkeley School of Law", region: "CA", aliases: ["Boalt Hall", "UC Berkeley"] },
  { name: "University of California, Davis School of Law", region: "CA" },
  { name: "University of California College of the Law, San Francisco", region: "CA", aliases: ["UC Hastings"] },
  { name: "Golden Gate University School of Law", region: "CA" },
  { name: "University of California, Irvine School of Law", region: "CA" },
  { name: "University of California, Los Angeles School of Law", region: "CA", aliases: ["UCLA"] },
  { name: "University of San Diego School of Law", region: "CA" },
  { name: "University of San Francisco School of Law", region: "CA" },
  { name: "Gould School of Law", region: "CA", aliases: ["University of Southern California", "USC"] },
  { name: "University of La Verne College of Law", region: "CA" },
  { name: "University of Colorado Law School", region: "CO" },
  { name: "Sturm College of Law", region: "CO", aliases: ["University of Denver"] },
  { name: "Quinnipiac University School of Law", region: "CT" },
  { name: "University of Connecticut School of Law", region: "CT" },
  { name: "Yale Law School", region: "CT" },
  { name: "Widener University Delaware Law School", region: "DE" },
  { name: "Columbus School of Law", region: "DC", aliases: ["Catholic University of America"] },
  { name: "David A. Clarke School of Law", region: "DC", aliases: ["University of the District of Columbia", "UDC"] },
  { name: "George Washington University Law School", region: "DC" },
  { name: "Georgetown University Law Center", region: "DC" },
  { name: "Howard University School of Law", region: "DC" },
  { name: "American University Washington College of Law", region: "DC" },
  { name: "Barry University, Dwayne O. Andreas School of Law", region: "FL" },
  { name: "Florida A&M University College of Law", region: "FL" },
  { name: "Florida International University College of Law", region: "FL" },
  { name: "Florida State University College of Law", region: "FL" },
  { name: "University of Florida Levin College of Law", region: "FL" },
  { name: "Shepard Broad College of Law", region: "FL", aliases: ["Nova Southeastern University"] },
  { name: "Benjamin L. Crump College of Law", region: "FL", aliases: ["St. Thomas University"] },
  { name: "Stetson University College of Law", region: "FL" },
  { name: "University of Miami School of Law", region: "FL" },
  { name: "Ave Maria School of Law", region: "FL" },
  { name: "Emory University School of Law", region: "GA" },
  { name: "Georgia State University College of Law", region: "GA" },
  { name: "University of Georgia School of Law", region: "GA" },
  { name: "Mercer University School of Law", region: "GA" },
  { name: "Atlanta's John Marshall Law School", region: "GA" },
  { name: "William S. Richardson School of Law", region: "HI", aliases: ["University of Hawaii"] },
  { name: "University of Idaho College of Law", region: "ID" },
  { name: "Chicago-Kent College of Law", region: "IL", aliases: ["Illinois Institute of Technology"] },
  { name: "DePaul University College of Law", region: "IL" },
  { name: "University of Illinois College of Law", region: "IL" },
  { name: "University of Illinois Chicago School of Law", region: "IL" },
  { name: "Loyola University Chicago School of Law", region: "IL" },
  { name: "Northern Illinois University College of Law", region: "IL" },
  { name: "Northwestern University School of Law", region: "IL" },
  { name: "Southern Illinois University School of Law", region: "IL" },
  { name: "University of Chicago Law School", region: "IL" },
  { name: "Maurer School of Law", region: "IN", aliases: ["Indiana University Bloomington"] },
  { name: "Indiana University Robert H. McKinney School of Law", region: "IN" },
  { name: "Notre Dame Law School", region: "IN" },
  { name: "Drake University Law School", region: "IA" },
  { name: "University of Iowa College of Law", region: "IA" },
  { name: "University of Kansas School of Law", region: "KS" },
  { name: "Washburn University School of Law", region: "KS" },
  { name: "Salmon P. Chase College of Law", region: "KY", aliases: ["Northern Kentucky University"] },
  { name: "Louis D. Brandeis School of Law", region: "KY", aliases: ["University of Louisville"] },
  { name: "University of Kentucky J. David Rosenberg College of Law", region: "KY" },
  { name: "Paul M. Hebert Law Center", region: "LA", aliases: ["Louisiana State University", "LSU"] },
  { name: "Loyola University New Orleans College of Law", region: "LA" },
  { name: "Southern University Law Center", region: "LA" },
  { name: "Tulane University Law School", region: "LA" },
  { name: "University of Maine School of Law", region: "ME" },
  { name: "University of Baltimore School of Law", region: "MD" },
  { name: "University of Maryland Francis King Carey School of Law", region: "MD" },
  { name: "Boston College Law School", region: "MA" },
  { name: "Boston University School of Law", region: "MA" },
  { name: "Harvard Law School", region: "MA" },
  { name: "New England Law Boston", region: "MA" },
  { name: "Northeastern University School of Law", region: "MA" },
  { name: "Suffolk University Law School", region: "MA" },
  { name: "University of Massachusetts School of Law", region: "MA" },
  { name: "Western New England University School of Law", region: "MA" },
  { name: "Michigan State University College of Law", region: "MI" },
  { name: "Cooley Law School", region: "FL", aliases: ["Thomas M. Cooley", "Western Michigan"] },
  { name: "University of Detroit Mercy School of Law", region: "MI" },
  { name: "University of Michigan Law School", region: "MI" },
  { name: "Wayne State University Law School", region: "MI" },
  { name: "University of Minnesota Law School", region: "MN" },
  { name: "University of St. Thomas School of Law", region: "MN" },
  { name: "Mitchell Hamline School of Law", region: "MN" },
  { name: "Mississippi College School of Law", region: "MS" },
  { name: "University of Mississippi School of Law", region: "MS" },
  { name: "Saint Louis University School of Law", region: "MO" },
  { name: "University of Missouri School of Law", region: "MO" },
  { name: "University of Missouri-Kansas City School of Law", region: "MO" },
  { name: "Washington University School of Law", region: "MO" },
  { name: "Alexander Blewett III School of Law", region: "MT", aliases: ["University of Montana"] },
  { name: "Creighton University School of Law", region: "NE" },
  { name: "University of Nebraska College of Law", region: "NE" },
  { name: "William S. Boyd School of Law", region: "NV", aliases: ["University of Nevada, Las Vegas", "UNLV"] },
  { name: "University of New Hampshire School of Law", region: "NH" },
  { name: "Rutgers Law School", region: "NJ" },
  { name: "Seton Hall University School of Law", region: "NJ" },
  { name: "University of New Mexico School of Law", region: "NM" },
  { name: "Albany Law School", region: "NY" },
  { name: "Benjamin N. Cardozo School of Law", region: "NY", aliases: ["Yeshiva University"] },
  { name: "Brooklyn Law School", region: "NY" },
  { name: "University at Buffalo Law School", region: "NY" },
  { name: "Columbia Law School", region: "NY" },
  { name: "Cornell Law School", region: "NY" },
  { name: "City University of New York School of Law", region: "NY" },
  { name: "Fordham University School of Law", region: "NY" },
  { name: "Maurice A. Deane School of Law at Hofstra University", region: "NY", aliases: ["Hofstra University"] },
  { name: "Touro College Jacob D. Fuchsberg Law Center", region: "NY" },
  { name: "New York Law School", region: "NY" },
  { name: "New York University School of Law", region: "NY" },
  { name: "Elisabeth Haub School of Law", region: "NY", aliases: ["Pace University"] },
  { name: "St. John's University School of Law", region: "NY" },
  { name: "Syracuse University College of Law", region: "NY" },
  { name: "Duke University School of Law", region: "NC" },
  { name: "Elon University School of Law", region: "NC" },
  { name: "North Carolina Central University School of Law", region: "NC" },
  { name: "Norman Adrian Wiggins School of Law", region: "NC", aliases: ["Campbell University"] },
  { name: "University of North Carolina School of Law", region: "NC" },
  { name: "Wake Forest University School of Law", region: "NC" },
  { name: "University of North Dakota School of Law", region: "ND" },
  { name: "Cleveland State University College of Law", region: "OH" },
  { name: "Ohio State University Moritz College of Law", region: "OH" },
  { name: "University of Cincinnati College of Law", region: "OH" },
  { name: "Case Western Reserve University School of Law", region: "OH" },
  { name: "Capital University Law School", region: "OH" },
  { name: "University of Dayton School of Law", region: "OH" },
  { name: "University of Toledo College of Law", region: "OH" },
  { name: "Claude W. Pettit College of Law", region: "OH", aliases: ["Ohio Northern University"] },
  { name: "University of Akron School of Law", region: "OH" },
  { name: "Oklahoma City University School of Law", region: "OK" },
  { name: "University of Oklahoma College of Law", region: "OK" },
  { name: "University of Tulsa College of Law", region: "OK" },
  { name: "University of Oregon School of Law", region: "OR" },
  { name: "Willamette University College of Law", region: "OR" },
  { name: "Lewis & Clark Law School", region: "OR" },
  { name: "Drexel University School of Law", region: "PA" },
  { name: "Duquesne University School of Law", region: "PA" },
  { name: "Beasley School of Law, Temple University", region: "PA", aliases: ["Temple University"] },
  { name: "Dickinson School of Law, Penn State University", region: "PA" },
  { name: "Penn State Law, Penn State University", region: "PA" },
  { name: "University of Pennsylvania Law School", region: "PA" },
  { name: "University of Pittsburgh School of Law", region: "PA" },
  { name: "Villanova University School of Law", region: "PA" },
  { name: "Widener University Commonwealth Law School", region: "PA" },
  { name: "Interamerican University of Puerto Rico School of Law", region: "PR" },
  { name: "Pontifical Catholic University of Puerto Rico School of Law", region: "PR" },
  { name: "University of Puerto Rico School of Law", region: "PR" },
  { name: "Roger Williams University School of Law", region: "RI" },
  { name: "Charleston School of Law", region: "SC" },
  { name: "Joseph F. Rice School of Law", region: "SC", aliases: ["University of South Carolina"] },
  { name: "University of South Dakota School of Law", region: "SD" },
  { name: "Belmont University College of Law", region: "TN" },
  { name: "Cecil C. Humphreys School of Law", region: "TN", aliases: ["University of Memphis"] },
  { name: "Duncan School of Law", region: "TN", aliases: ["Lincoln Memorial University"] },
  { name: "University of Tennessee College of Law", region: "TN" },
  { name: "Vanderbilt University Law School", region: "TN" },
  { name: "Baylor Law School", region: "TX" },
  { name: "Dedman School of Law", region: "TX", aliases: ["Southern Methodist University", "SMU"] },
  { name: "University of North Texas at Dallas College of Law", region: "TX" },
  { name: "Thurgood Marshall School of Law", region: "TX", aliases: ["Texas Southern University"] },
  { name: "University of Houston Law Center", region: "TX" },
  { name: "South Texas College of Law Houston", region: "TX" },
  { name: "Texas Tech University School of Law", region: "TX" },
  { name: "University of Texas School of Law", region: "TX" },
  { name: "Texas A&M University School of Law", region: "TX" },
  { name: "St. Mary's University School of Law", region: "TX" },
  { name: "J. Reuben Clark Law School", region: "UT", aliases: ["Brigham Young University", "BYU"] },
  { name: "S.J. Quinney College of Law", region: "UT", aliases: ["University of Utah"] },
  { name: "Vermont Law and Graduate School", region: "VT" },
  { name: "Appalachian School of Law", region: "VA" },
  { name: "Antonin Scalia Law School", region: "VA", aliases: ["George Mason University"] },
  { name: "Liberty University School of Law", region: "VA" },
  { name: "Regent University School of Law", region: "VA" },
  { name: "Washington and Lee University School of Law", region: "VA" },
  { name: "William & Mary Law School", region: "VA" },
  { name: "University of Richmond School of Law", region: "VA" },
  { name: "University of Virginia School of Law", region: "VA" },
  { name: "Gonzaga University School of Law", region: "WA" },
  { name: "Seattle University School of Law", region: "WA" },
  { name: "University of Washington School of Law", region: "WA" },
  { name: "West Virginia University College of Law", region: "WV" },
  { name: "Marquette University Law School", region: "WI" },
  { name: "University of Wisconsin Law School", region: "WI" },
  { name: "University of Wyoming College of Law", region: "WY" },
  { name: "Osgoode Hall Law School", region: "ON", aliases: ["York University"], country: 'CA' },
  { name: "University of Toronto Faculty of Law", region: "ON", aliases: ["U of T"], country: 'CA' },
  { name: "Queen's University Faculty of Law", region: "ON", country: 'CA' },
  { name: "Western University Faculty of Law", region: "ON", aliases: ["Western Law"], country: 'CA' },
  { name: "University of Ottawa Faculty of Law", region: "ON", aliases: ["uOttawa"], country: 'CA' },
  { name: "University of Windsor Faculty of Law", region: "ON", country: 'CA' },
  { name: "Toronto Metropolitan University Lincoln Alexander School of Law", region: "ON", aliases: ["TMU", "Ryerson"], country: 'CA' },
  { name: "Lakehead University Bora Laskin Faculty of Law", region: "ON", country: 'CA' },
  { name: "McGill University Faculty of Law", region: "QC", country: 'CA' },
  { name: "Dalhousie University Schulich School of Law", region: "NS", country: 'CA' },
  { name: "University of New Brunswick Faculty of Law", region: "NB", aliases: ["UNB"], country: 'CA' },
  { name: "University of Manitoba Robson Hall Faculty of Law", region: "MB", country: 'CA' },
  { name: "University of Saskatchewan College of Law", region: "SK", country: 'CA' },
  { name: "University of Alberta Faculty of Law", region: "AB", country: 'CA' },
  { name: "University of Calgary Faculty of Law", region: "AB", country: 'CA' },
  { name: "University of British Columbia Peter A. Allard School of Law", region: "BC", aliases: ["UBC"], country: 'CA' },
  { name: "University of Victoria Faculty of Law", region: "BC", aliases: ["UVic"], country: 'CA' },
  { name: "Thompson Rivers University Faculty of Law", region: "BC", aliases: ["TRU"], country: 'CA' },
];

/**
 * Schools matching what the student has typed, best first.
 *
 * Matches on any word of the name, the region, or an alias, so "berkeley",
 * "UCLA" and "CA" all land somewhere useful. A name that starts with the query
 * outranks one that merely contains it.
 */
export function searchLawSchools(query: string, limit = 8): LawSchool[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const scored: { school: LawSchool; score: number }[] = [];
  for (const school of LAW_SCHOOLS) {
    const name = school.name.toLowerCase();
    const haystacks = [name, school.region.toLowerCase(), ...(school.aliases ?? []).map((a) => a.toLowerCase())];
    if (!haystacks.some((hay) => hay.includes(needle))) continue;
    const score = name.startsWith(needle)
      ? 0
      : name.split(/[^a-z0-9&]+/).some((word) => word.startsWith(needle))
        ? 1
        : 2;
    scored.push({ school, score });
  }

  return scored
    .sort(
      (a, b) =>
        a.score - b.score ||
        // American schools first at equal relevance: that is where almost
        // every one of these students is applying.
        Number(!!a.school.country) - Number(!!b.school.country) ||
        a.school.name.localeCompare(b.school.name),
    )
    .slice(0, limit)
    .map((entry) => entry.school);
}

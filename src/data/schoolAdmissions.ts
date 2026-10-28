/**
 * What each law school's admitted class actually looked like.
 *
 * Source: the ABA Standard 509 disclosures every accredited school is required
 * to publish, for the class that entered in fall 2025 - the most recent cycle
 * on the record. Read 2026-08-29 from the compiled 509 table at lsd.law, which
 * restates the ABA's own numbers.
 *
 * These are facts about a class that has already enrolled, not predictions and
 * not cutoffs. A student below a median still gets in; a student above one
 * still gets rejected. The page that renders this has to say so.
 *
 * Regenerate when the next cycle's 509s land, usually each December. Never
 * hand-edit a number: a school whose median is wrong here is worse than a
 * school missing entirely.
 */

export const ADMISSIONS_CYCLE = 'Fall 2025 entering class';
export const ADMISSIONS_SOURCE = 'ABA Standard 509 disclosures';

export interface SchoolAdmissions {
  name: string;
  state: string;
  /** LSAT of the matriculating class. Half of them land between 25th and 75th. */
  lsat25: number | null;
  lsat50: number;
  lsat75: number | null;
  gpa25: number | null;
  gpa50: number | null;
  gpa75: number | null;
  /** Percent of applicants offered a place. */
  acceptanceRate: number | null;
  classSize: number | null;
  /** The US News position lsd.law lists, where it has one. Ordering here is by
   *  LSAT median instead: it is the number the student is working on. */
  usNewsRank: number | null;
}

export const SCHOOL_ADMISSIONS: SchoolAdmissions[] = [
  { name: "Washington University in St. Louis", state: "Missouri", lsat25: 165, lsat50: 175, lsat75: 176, gpa25: 3.58, gpa50: 3.96, gpa75: 4, acceptanceRate: 19, classSize: 261, usNewsRank: 19 },
  { name: "Harvard University", state: "Massachusetts", lsat25: 171, lsat50: 174, lsat75: 176, gpa25: 3.89, gpa50: 3.96, gpa75: 4, acceptanceRate: 9.2, classSize: 579, usNewsRank: 3 },
  { name: "University of Chicago", state: "Illinois", lsat25: 171, lsat50: 174, lsat75: 176, gpa25: 3.87, gpa50: 3.97, gpa75: 4, acceptanceRate: 9.7, classSize: 203, usNewsRank: 4 },
  { name: "Yale University", state: "Connecticut", lsat25: 171, lsat50: 174, lsat75: 177, gpa25: 3.9, gpa50: 3.96, gpa75: 4, acceptanceRate: 4.1, classSize: 204, usNewsRank: 1 },
  { name: "Columbia University", state: "New York", lsat25: 169, lsat50: 173, lsat75: 175, gpa25: 3.85, gpa50: 3.92, gpa75: 3.98, acceptanceRate: 11.8, classSize: 444, usNewsRank: 5 },
  { name: "Cornell University", state: "New York", lsat25: 168, lsat50: 173, lsat75: 175, gpa25: 3.75, gpa50: 3.92, gpa75: 3.97, acceptanceRate: 18.2, classSize: 217, usNewsRank: 14 },
  { name: "Northwestern University", state: "Illinois", lsat25: 167, lsat50: 173, lsat75: 175, gpa25: 3.76, gpa50: 3.96, gpa75: 4, acceptanceRate: 12.3, classSize: 250, usNewsRank: 12 },
  { name: "Stanford University", state: "California", lsat25: 171, lsat50: 173, lsat75: 176, gpa25: 3.87, gpa50: 3.96, gpa75: 4, acceptanceRate: 6.1, classSize: 193, usNewsRank: 2 },
  { name: "University of Pennsylvania", state: "Pennsylvania", lsat25: 167, lsat50: 173, lsat75: 174, gpa25: 3.77, gpa50: 3.95, gpa75: 4, acceptanceRate: 8.1, classSize: 265, usNewsRank: 5 },
  { name: "University of Virginia", state: "Virginia", lsat25: 168, lsat50: 173, lsat75: 175, gpa25: 3.83, gpa50: 3.99, gpa75: 4.04, acceptanceRate: 10.2, classSize: 309, usNewsRank: 7 },
  { name: "New York University", state: "New York", lsat25: 169, lsat50: 172, lsat75: 174, gpa25: 3.81, gpa50: 3.92, gpa75: 3.97, acceptanceRate: 13.4, classSize: 452, usNewsRank: 8 },
  { name: "University of Texas at Austin", state: "Texas", lsat25: 166, lsat50: 172, lsat75: 173, gpa25: 3.75, gpa50: 3.89, gpa75: 3.96, acceptanceRate: 14, classSize: 373, usNewsRank: 15 },
  { name: "Duke University", state: "North Carolina", lsat25: 169, lsat50: 171, lsat75: 172, gpa25: 3.83, gpa50: 3.91, gpa75: 3.96, acceptanceRate: 12.9, classSize: 227, usNewsRank: 11 },
  { name: "Georgetown University", state: "Washington, D.C.", lsat25: 166, lsat50: 171, lsat75: 173, gpa25: 3.75, gpa50: 3.93, gpa75: 3.98, acceptanceRate: 15.8, classSize: 672, usNewsRank: 15 },
  { name: "University of California—Los Angeles", state: "California", lsat25: 166, lsat50: 171, lsat75: 172, gpa25: 3.73, gpa50: 3.95, gpa75: 4, acceptanceRate: 12.1, classSize: 328, usNewsRank: 13 },
  { name: "University of Michigan", state: "Michigan", lsat25: 168, lsat50: 171, lsat75: 173, gpa25: 3.74, gpa50: 3.88, gpa75: 3.95, acceptanceRate: 8.6, classSize: 343, usNewsRank: 9 },
  { name: "University of Minnesota", state: "Minnesota", lsat25: 166, lsat50: 171, lsat75: 173, gpa25: 3.62, gpa50: 3.88, gpa75: 3.95, acceptanceRate: 26.7, classSize: 228, usNewsRank: 24 },
  { name: "Boston University", state: "Massachusetts", lsat25: 164, lsat50: 170, lsat75: 171, gpa25: 3.71, gpa50: 3.88, gpa75: 3.93, acceptanceRate: 12.1, classSize: 238, usNewsRank: 23 },
  { name: "Brigham Young University", state: "Utah", lsat25: 168, lsat50: 170, lsat75: 172, gpa25: 3.82, gpa50: 3.95, gpa75: 3.98, acceptanceRate: 22.8, classSize: 122, usNewsRank: 17 },
  { name: "University of California—Berkeley", state: "California", lsat25: 167, lsat50: 170, lsat75: 172, gpa25: 3.84, gpa50: 3.92, gpa75: 3.99, acceptanceRate: 14.8, classSize: 374, usNewsRank: 10 },
  { name: "University of Notre Dame", state: "Indiana", lsat25: 166, lsat50: 170, lsat75: 171, gpa25: 3.78, gpa50: 3.89, gpa75: 3.95, acceptanceRate: 16.1, classSize: 185, usNewsRank: 17 },
  { name: "Vanderbilt University", state: "Tennessee", lsat25: 167, lsat50: 170, lsat75: 171, gpa25: 3.77, gpa50: 3.91, gpa75: 3.97, acceptanceRate: 13.3, classSize: 172, usNewsRank: 19 },
  { name: "George Mason University", state: "Virginia", lsat25: 162, lsat50: 169, lsat75: 171, gpa25: 3.55, gpa50: 3.93, gpa75: 3.98, acceptanceRate: 15.9, classSize: 159, usNewsRank: 46 },
  { name: "Texas A&M University", state: "Texas", lsat25: 161, lsat50: 169, lsat75: 170, gpa25: 3.67, gpa50: 4, gpa75: 4, acceptanceRate: 12.1, classSize: 128, usNewsRank: 38 },
  { name: "University of California—Irvine", state: "California", lsat25: 166, lsat50: 169, lsat75: 170, gpa25: 3.59, gpa50: 3.8, gpa75: 3.9, acceptanceRate: 14.9, classSize: 189, usNewsRank: 28 },
  { name: "University of Florida (Levin)", state: "Florida", lsat25: 165, lsat50: 169, lsat75: 170, gpa25: 3.7, gpa50: 3.91, gpa75: 3.97, acceptanceRate: 16.5, classSize: 229, usNewsRank: 24 },
  { name: "University of Georgia", state: "Georgia", lsat25: 159, lsat50: 169, lsat75: 171, gpa25: 3.7, gpa50: 3.92, gpa75: 3.97, acceptanceRate: 12.7, classSize: 186, usNewsRank: 24 },
  { name: "University of Southern California", state: "California", lsat25: 165, lsat50: 169, lsat75: 170, gpa25: 3.73, gpa50: 3.91, gpa75: 3.97, acceptanceRate: 11.2, classSize: 228, usNewsRank: 19 },
  { name: "Boston College", state: "Massachusetts", lsat25: 162, lsat50: 168, lsat75: 169, gpa25: 3.67, gpa50: 3.83, gpa75: 3.9, acceptanceRate: 8.5, classSize: 219, usNewsRank: 28 },
  { name: "Fordham University", state: "New York", lsat25: 165, lsat50: 168, lsat75: 170, gpa25: 3.6, gpa50: 3.79, gpa75: 3.88, acceptanceRate: 16.2, classSize: 444, usNewsRank: 24 },
  { name: "George Washington University", state: "Washington, D.C.", lsat25: 162, lsat50: 168, lsat75: 170, gpa25: 3.55, gpa50: 3.86, gpa75: 3.93, acceptanceRate: 27.2, classSize: 612, usNewsRank: 32 },
  { name: "Ohio State University", state: "Ohio", lsat25: 163, lsat50: 168, lsat75: 169, gpa25: 3.64, gpa50: 3.91, gpa75: 3.97, acceptanceRate: 24.6, classSize: 159, usNewsRank: 32 },
  { name: "University of North Carolina", state: "North Carolina", lsat25: 165, lsat50: 168, lsat75: 169, gpa25: 3.78, gpa50: 3.89, gpa75: 3.97, acceptanceRate: 11.2, classSize: 181, usNewsRank: 19 },
  { name: "Southern Methodist University", state: "Texas", lsat25: 163, lsat50: 167, lsat75: 168, gpa25: 3.52, gpa50: 3.81, gpa75: 3.92, acceptanceRate: 24.6, classSize: 254, usNewsRank: 38 },
  { name: "University of Alabama", state: "Alabama", lsat25: 161, lsat50: 167, lsat75: 168, gpa25: 3.76, gpa50: 3.97, gpa75: 4.05, acceptanceRate: 25.6, classSize: 140, usNewsRank: 32 },
  { name: "University of Wisconsin", state: "Wisconsin", lsat25: 161, lsat50: 167, lsat75: 169, gpa25: 3.61, gpa50: 3.81, gpa75: 3.93, acceptanceRate: 19.1, classSize: 224, usNewsRank: 28 },
  { name: "Washington and Lee University", state: "Virginia", lsat25: 161, lsat50: 167, lsat75: 168, gpa25: 3.51, gpa50: 3.75, gpa75: 3.85, acceptanceRate: 22.7, classSize: 131, usNewsRank: 46 },
  { name: "Emory University", state: "Georgia", lsat25: 162, lsat50: 166, lsat75: 168, gpa25: 3.68, gpa50: 3.82, gpa75: 3.87, acceptanceRate: 30.1, classSize: 391, usNewsRank: 32 },
  { name: "Florida State University", state: "Florida", lsat25: 158, lsat50: 166, lsat75: 167, gpa25: 3.6, gpa50: 3.93, gpa75: 3.99, acceptanceRate: 16, classSize: 153, usNewsRank: 38 },
  { name: "University of Illinois—Urbana Champaign", state: "Illinois", lsat25: 160, lsat50: 166, lsat75: 168, gpa25: 3.55, gpa50: 3.81, gpa75: 3.92, acceptanceRate: 32.9, classSize: 188, usNewsRank: 32 },
  { name: "University of Utah", state: "Utah", lsat25: 162, lsat50: 166, lsat75: 168, gpa25: 3.62, gpa50: 3.87, gpa75: 3.94, acceptanceRate: 25.3, classSize: 107, usNewsRank: 38 },
  { name: "Wake Forest University", state: "North Carolina", lsat25: 163, lsat50: 166, lsat75: 168, gpa25: 3.6, gpa50: 3.79, gpa75: 3.9, acceptanceRate: 24.6, classSize: 204, usNewsRank: 31 },
  { name: "William & Mary Law School", state: "Virginia", lsat25: 161, lsat50: 166, lsat75: 167, gpa25: 3.53, gpa50: 3.82, gpa75: 3.94, acceptanceRate: 22, classSize: 184, usNewsRank: 32 },
  { name: "Arizona State University", state: "Arizona", lsat25: 158, lsat50: 165, lsat75: 167, gpa25: 3.58, gpa50: 3.91, gpa75: 3.98, acceptanceRate: 19.8, classSize: 266, usNewsRank: 53 },
  { name: "Temple University", state: "Pennsylvania", lsat25: 162, lsat50: 165, lsat75: 168, gpa25: 3.59, gpa50: 3.76, gpa75: 3.9, acceptanceRate: 24.4, classSize: 237, usNewsRank: 46 },
  { name: "University of California—Davis", state: "California", lsat25: 160, lsat50: 165, lsat75: 167, gpa25: 3.49, gpa50: 3.7, gpa75: 3.87, acceptanceRate: 16, classSize: 209, usNewsRank: 46 },
  { name: "University of Washington", state: "Washington", lsat25: 162, lsat50: 165, lsat75: 167, gpa25: 3.6, gpa50: 3.76, gpa75: 3.86, acceptanceRate: 19.6, classSize: 207, usNewsRank: 52 },
  { name: "Yeshiva University (Cardozo)", state: "New York", lsat25: 162, lsat50: 165, lsat75: 167, gpa25: 3.56, gpa50: 3.78, gpa75: 3.87, acceptanceRate: 29.6, classSize: 326, usNewsRank: 53 },
  { name: "Baylor University", state: "Texas", lsat25: 159, lsat50: 164, lsat75: 165, gpa25: 3.49, gpa50: 3.77, gpa75: 3.89, acceptanceRate: 20.6, classSize: 165, usNewsRank: 89 },
  { name: "Indiana University - Bloomington", state: "Indiana", lsat25: 158, lsat50: 164, lsat75: 166, gpa25: 3.63, gpa50: 3.91, gpa75: 3.98, acceptanceRate: 35.8, classSize: 186, usNewsRank: 38 },
  { name: "Northeastern University", state: "Massachusetts", lsat25: 161, lsat50: 164, lsat75: 166, gpa25: 3.61, gpa50: 3.77, gpa75: 3.86, acceptanceRate: 24.2, classSize: 283, usNewsRank: 63 },
  { name: "Pepperdine University", state: "California", lsat25: 161, lsat50: 164, lsat75: 167, gpa25: 3.61, gpa50: 3.85, gpa75: 3.94, acceptanceRate: 23.4, classSize: 227, usNewsRank: 100 },
  { name: "St. John's University", state: "New York", lsat25: 156, lsat50: 164, lsat75: 166, gpa25: 3.44, gpa50: 3.81, gpa75: 3.91, acceptanceRate: 23.1, classSize: 241, usNewsRank: 89 },
  { name: "University of Colorado—Boulder", state: "Colorado", lsat25: 161, lsat50: 164, lsat75: 167, gpa25: 3.62, gpa50: 3.81, gpa75: 3.91, acceptanceRate: 27.6, classSize: 199, usNewsRank: 53 },
  { name: "University of Iowa", state: "Iowa", lsat25: 161, lsat50: 164, lsat75: 165, gpa25: 3.62, gpa50: 3.78, gpa75: 3.92, acceptanceRate: 44.3, classSize: 159, usNewsRank: 38 },
  { name: "University of Maryland", state: "Maryland", lsat25: 156, lsat50: 164, lsat75: 166, gpa25: 3.37, gpa50: 3.72, gpa75: 3.88, acceptanceRate: 26.1, classSize: 229, usNewsRank: 63 },
  { name: "University of Miami", state: "Florida", lsat25: 160, lsat50: 164, lsat75: 165, gpa25: 3.58, gpa50: 3.79, gpa75: 3.88, acceptanceRate: 24.6, classSize: 313, usNewsRank: 70 },
  { name: "University of Richmond", state: "Virginia", lsat25: 159, lsat50: 164, lsat75: 167, gpa25: 3.66, gpa50: 3.81, gpa75: 3.92, acceptanceRate: 39.6, classSize: 146, usNewsRank: 53 },
  { name: "University of Tennessee", state: "Tennessee", lsat25: 160, lsat50: 164, lsat75: 166, gpa25: 3.67, gpa50: 3.89, gpa75: 3.95, acceptanceRate: 24.8, classSize: 140, usNewsRank: 53 },
  { name: "Villanova University", state: "Pennsylvania", lsat25: 159, lsat50: 164, lsat75: 166, gpa25: 3.64, gpa50: 3.8, gpa75: 3.9, acceptanceRate: 25.9, classSize: 232, usNewsRank: 38 },
  { name: "Wayne State University", state: "Michigan", lsat25: 157, lsat50: 164, lsat75: 166, gpa25: 3.56, gpa50: 3.89, gpa75: 3.95, acceptanceRate: 24.8, classSize: 129, usNewsRank: 38 },
  { name: "Chapman University", state: "California", lsat25: 156, lsat50: 163, lsat75: 164, gpa25: 3.32, gpa50: 3.7, gpa75: 3.82, acceptanceRate: 20.5, classSize: 153, usNewsRank: 100 },
  { name: "Loyola Marymount University—Los Angeles", state: "California", lsat25: 160, lsat50: 163, lsat75: 165, gpa25: 3.52, gpa50: 3.74, gpa75: 3.89, acceptanceRate: 26.1, classSize: 338, usNewsRank: 63 },
  { name: "University of Arizona", state: "Arizona", lsat25: 162, lsat50: 163, lsat75: 165, gpa25: 3.54, gpa50: 3.78, gpa75: 3.9, acceptanceRate: 27.9, classSize: 110, usNewsRank: 70 },
  { name: "University of Houston", state: "Texas", lsat25: 160, lsat50: 163, lsat75: 165, gpa25: 3.56, gpa50: 3.79, gpa75: 3.9, acceptanceRate: 23, classSize: 249, usNewsRank: 89 },
  { name: "University of San Diego", state: "California", lsat25: 160, lsat50: 163, lsat75: 165, gpa25: 3.59, gpa50: 3.84, gpa75: 3.92, acceptanceRate: 23.5, classSize: 240, usNewsRank: 70 },
  { name: "American University", state: "Washington, D.C.", lsat25: 157, lsat50: 162, lsat75: 163, gpa25: 3.32, gpa50: 3.63, gpa75: 3.75, acceptanceRate: 33.3, classSize: 405, usNewsRank: 119 },
  { name: "Case Western Reserve University", state: "Ohio", lsat25: 156, lsat50: 162, lsat75: 164, gpa25: 3.51, gpa50: 3.76, gpa75: 3.89, acceptanceRate: 34.8, classSize: 180, usNewsRank: 53 },
  { name: "Michigan State University", state: "Michigan", lsat25: 158, lsat50: 162, lsat75: 164, gpa25: 3.47, gpa50: 3.73, gpa75: 3.87, acceptanceRate: 26, classSize: 150, usNewsRank: 53 },
  { name: "University of Connecticut", state: "Connecticut", lsat25: 160, lsat50: 162, lsat75: 164, gpa25: 3.55, gpa50: 3.78, gpa75: 3.9, acceptanceRate: 20.1, classSize: 151, usNewsRank: 53 },
  { name: "University of Kansas", state: "Kansas", lsat25: 158, lsat50: 162, lsat75: 164, gpa25: 3.58, gpa50: 3.85, gpa75: 3.95, acceptanceRate: 39.1, classSize: 122, usNewsRank: 63 },
  { name: "University of Oklahoma", state: "Oklahoma", lsat25: 159, lsat50: 162, lsat75: 164, gpa25: 3.42, gpa50: 3.73, gpa75: 3.88, acceptanceRate: 33.4, classSize: 200, usNewsRank: 70 },
  { name: "University of South Carolina", state: "South Carolina", lsat25: 160, lsat50: 162, lsat75: 164, gpa25: 3.43, gpa50: 3.67, gpa75: 3.86, acceptanceRate: 29.9, classSize: 221, usNewsRank: 70 },
  { name: "Belmont University", state: "Tennessee", lsat25: 158, lsat50: 161, lsat75: 163, gpa25: 3.66, gpa50: 3.84, gpa75: 3.94, acceptanceRate: 37.6, classSize: 136, usNewsRank: 100 },
  { name: "Brooklyn Law School", state: "New York", lsat25: 158, lsat50: 161, lsat75: 163, gpa25: 3.37, gpa50: 3.59, gpa75: 3.75, acceptanceRate: 44, classSize: 414, usNewsRank: 110 },
  { name: "Catholic University Of America", state: "Washington, D.C.", lsat25: 158, lsat50: 161, lsat75: 163, gpa25: 3.46, gpa50: 3.68, gpa75: 3.85, acceptanceRate: 32.4, classSize: 182, usNewsRank: 119 },
  { name: "Florida International University", state: "Florida", lsat25: 159, lsat50: 161, lsat75: 162, gpa25: 3.66, gpa50: 3.8, gpa75: 3.89, acceptanceRate: 18.8, classSize: 175, usNewsRank: 110 },
  { name: "Illinois Institute of Technology (Kent)", state: "Illinois", lsat25: 156, lsat50: 161, lsat75: 164, gpa25: 3.45, gpa50: 3.72, gpa75: 3.89, acceptanceRate: 38.6, classSize: 245, usNewsRank: 70 },
  { name: "Lewis And Clark College", state: "Oregon", lsat25: 158, lsat50: 161, lsat75: 166, gpa25: 3.24, gpa50: 3.59, gpa75: 3.79, acceptanceRate: 54.7, classSize: 176, usNewsRank: 78 },
  { name: "Loyola University—Chicago", state: "Illinois", lsat25: 159, lsat50: 161, lsat75: 163, gpa25: 3.55, gpa50: 3.7, gpa75: 3.83, acceptanceRate: 28.2, classSize: 296, usNewsRank: 78 },
  { name: "Seton Hall University", state: "New Jersey", lsat25: 158, lsat50: 161, lsat75: 164, gpa25: 3.51, gpa50: 3.71, gpa75: 3.86, acceptanceRate: 34.3, classSize: 302, usNewsRank: 78 },
  { name: "Tulane University", state: "Louisiana", lsat25: 159, lsat50: 161, lsat75: 164, gpa25: 3.47, gpa50: 3.67, gpa75: 3.81, acceptanceRate: 40, classSize: 241, usNewsRank: 53 },
  { name: "University of California (Hastings)", state: "California", lsat25: 158, lsat50: 161, lsat75: 163, gpa25: 3.55, gpa50: 3.71, gpa75: 3.83, acceptanceRate: 27.5, classSize: 380, usNewsRank: 53 },
  { name: "University of Missouri", state: "Missouri", lsat25: 156, lsat50: 161, lsat75: 162, gpa25: 3.47, gpa50: 3.72, gpa75: 3.91, acceptanceRate: 42, classSize: 129, usNewsRank: 46 },
  { name: "Drexel University", state: "Pennsylvania", lsat25: 154, lsat50: 160, lsat75: 162, gpa25: 3.35, gpa50: 3.76, gpa75: 3.87, acceptanceRate: 29.6, classSize: 181, usNewsRank: 89 },
  { name: "Georgia State University", state: "Georgia", lsat25: 158, lsat50: 160, lsat75: 163, gpa25: 3.45, gpa50: 3.64, gpa75: 3.82, acceptanceRate: 30.6, classSize: 237, usNewsRank: 89 },
  { name: "University of Denver", state: "Colorado", lsat25: 156, lsat50: 160, lsat75: 162, gpa25: 3.36, gpa50: 3.66, gpa75: 3.8, acceptanceRate: 41.3, classSize: 285, usNewsRank: 110 },
  { name: "University of Nebraska", state: "Nebraska", lsat25: 156, lsat50: 160, lsat75: 162, gpa25: 3.6, gpa50: 3.81, gpa75: 3.98, acceptanceRate: 40.1, classSize: 154, usNewsRank: 78 },
  { name: "University of Nevada—Las Vegas", state: "Nevada", lsat25: 156, lsat50: 160, lsat75: 162, gpa25: 3.39, gpa50: 3.76, gpa75: 3.88, acceptanceRate: 30.8, classSize: 156, usNewsRank: 63 },
  { name: "University of Oregon", state: "Oregon", lsat25: 157, lsat50: 160, lsat75: 162, gpa25: 3.32, gpa50: 3.62, gpa75: 3.79, acceptanceRate: 55, classSize: 186, usNewsRank: 110 },
  { name: "University of Pittsburgh", state: "Pennsylvania", lsat25: 158, lsat50: 160, lsat75: 163, gpa25: 3.26, gpa50: 3.54, gpa75: 3.74, acceptanceRate: 34.9, classSize: 155, usNewsRank: 78 },
  { name: "Pennsylvania State - Dickinson Law", state: "Pennsylvania", lsat25: 157, lsat50: 159, lsat75: 161, gpa25: 3.5, gpa50: 3.71, gpa75: 3.86, acceptanceRate: 43, classSize: 215, usNewsRank: 70 },
  { name: "Santa Clara University", state: "California", lsat25: 157, lsat50: 159, lsat75: 162, gpa25: 3.21, gpa50: 3.5, gpa75: 3.74, acceptanceRate: 52.6, classSize: 256, usNewsRank: 123 },
  { name: "Seattle University", state: "Washington", lsat25: 155, lsat50: 159, lsat75: 162, gpa25: 3.22, gpa50: 3.6, gpa75: 3.8, acceptanceRate: 38.9, classSize: 209, usNewsRank: 123 },
  { name: "Stetson University", state: "Florida", lsat25: 157, lsat50: 159, lsat75: 162, gpa25: 3.42, gpa50: 3.63, gpa75: 3.81, acceptanceRate: 36.4, classSize: 336, usNewsRank: 89 },
  { name: "Texas Tech University", state: "Texas", lsat25: 157, lsat50: 159, lsat75: 160, gpa25: 3.41, gpa50: 3.69, gpa75: 3.85, acceptanceRate: 25.6, classSize: 168, usNewsRank: 100 },
  { name: "University of Cincinnati", state: "Ohio", lsat25: 156, lsat50: 159, lsat75: 161, gpa25: 3.64, gpa50: 3.8, gpa75: 3.91, acceptanceRate: 32.7, classSize: 139, usNewsRank: 63 },
  { name: "University of Kentucky", state: "Kentucky", lsat25: 156, lsat50: 159, lsat75: 162, gpa25: 3.52, gpa50: 3.72, gpa75: 3.9, acceptanceRate: 40.8, classSize: 147, usNewsRank: 89 },
  { name: "University of St. Thomas (Minnesota)", state: "Minnesota", lsat25: 155, lsat50: 159, lsat75: 162, gpa25: 3.46, gpa50: 3.72, gpa75: 3.88, acceptanceRate: 57.6, classSize: 168, usNewsRank: 78 },
  { name: "Albany Law School Of Union University", state: "New York", lsat25: 154, lsat50: 158, lsat75: 161, gpa25: 3.16, gpa50: 3.54, gpa75: 3.75, acceptanceRate: 37.5, classSize: 237, usNewsRank: 100 },
  { name: "DePaul University", state: "Illinois", lsat25: 154, lsat50: 158, lsat75: 160, gpa25: 3.17, gpa50: 3.61, gpa75: 3.8, acceptanceRate: 34.8, classSize: 186, usNewsRank: 123 },
  { name: "Marquette University", state: "Wisconsin", lsat25: 156, lsat50: 158, lsat75: 160, gpa25: 3.5, gpa50: 3.7, gpa75: 3.83, acceptanceRate: 22.1, classSize: 218, usNewsRank: 63 },
  { name: "Regent University", state: "Virginia", lsat25: 153, lsat50: 158, lsat75: 161, gpa25: 3.37, gpa50: 3.68, gpa75: 3.89, acceptanceRate: 44.3, classSize: 127, usNewsRank: null },
  { name: "Rutgers University", state: "New Jersey", lsat25: 155, lsat50: 158, lsat75: 161, gpa25: 3.35, gpa50: 3.66, gpa75: 3.82, acceptanceRate: 33.5, classSize: 489, usNewsRank: 89 },
  { name: "Syracuse University", state: "New York", lsat25: 154, lsat50: 158, lsat75: 160, gpa25: 3.18, gpa50: 3.6, gpa75: 3.77, acceptanceRate: 34.6, classSize: 271, usNewsRank: 110 },
  { name: "University of Arkansas, Fayetteville", state: "Arkansas", lsat25: 155, lsat50: 158, lsat75: 161, gpa25: 3.54, gpa50: 3.71, gpa75: 3.87, acceptanceRate: 26.6, classSize: 135, usNewsRank: 78 },
  { name: "University of Hawaii", state: "Hawaii", lsat25: 155, lsat50: 158, lsat75: 162, gpa25: 3.4, gpa50: 3.62, gpa75: 3.8, acceptanceRate: 26.2, classSize: 140, usNewsRank: null },
  { name: "University of Maine", state: "Maine", lsat25: 154, lsat50: 158, lsat75: 162, gpa25: 3.41, gpa50: 3.7, gpa75: 3.8, acceptanceRate: 37.3, classSize: 104, usNewsRank: 100 },
  { name: "Duquesne University", state: "Pennsylvania", lsat25: 155, lsat50: 157, lsat75: 160, gpa25: 3.35, gpa50: 3.62, gpa75: 3.85, acceptanceRate: 43.2, classSize: 186, usNewsRank: 100 },
  { name: "Hofstra University", state: "New York", lsat25: 154, lsat50: 157, lsat75: 160, gpa25: 3.35, gpa50: 3.65, gpa75: 3.83, acceptanceRate: 40.6, classSize: 263, usNewsRank: 123 },
  { name: "Louisiana State University", state: "Louisiana", lsat25: 155, lsat50: 157, lsat75: 160, gpa25: 3.48, gpa50: 3.74, gpa75: 3.93, acceptanceRate: 38.5, classSize: 230, usNewsRank: 78 },
  { name: "Mercer University", state: "Georgia", lsat25: 155, lsat50: 157, lsat75: 160, gpa25: 3.3, gpa50: 3.62, gpa75: 3.8, acceptanceRate: 37.8, classSize: 152, usNewsRank: 89 },
  { name: "New York Law School", state: "New York", lsat25: 154, lsat50: 157, lsat75: 160, gpa25: 3.41, gpa50: 3.63, gpa75: 3.78, acceptanceRate: 39.7, classSize: 409, usNewsRank: 119 },
  { name: "Saint Louis University", state: "Missouri", lsat25: 154, lsat50: 157, lsat75: 161, gpa25: 3.37, gpa50: 3.61, gpa75: 3.83, acceptanceRate: 56.4, classSize: 222, usNewsRank: 78 },
  { name: "Southwestern Law School", state: "California", lsat25: 154, lsat50: 157, lsat75: 160, gpa25: 3.23, gpa50: 3.51, gpa75: 3.72, acceptanceRate: 36.5, classSize: 459, usNewsRank: 123 },
  { name: "University of Buffalo—SUNY", state: "New York", lsat25: 155, lsat50: 157, lsat75: 161, gpa25: 3.51, gpa50: 3.71, gpa75: 3.88, acceptanceRate: 42.4, classSize: 167, usNewsRank: null },
  { name: "University of Dayton", state: "Ohio", lsat25: 154, lsat50: 157, lsat75: 160, gpa25: 3.31, gpa50: 3.6, gpa75: 3.87, acceptanceRate: 30.7, classSize: 168, usNewsRank: null },
  { name: "University of Louisville", state: "Kentucky", lsat25: 154, lsat50: 157, lsat75: 161, gpa25: 3.32, gpa50: 3.67, gpa75: 3.9, acceptanceRate: 63.4, classSize: 145, usNewsRank: 110 },
  { name: "University of Mississippi", state: "Mississippi", lsat25: 155, lsat50: 157, lsat75: 160, gpa25: 3.44, gpa50: 3.68, gpa75: 3.87, acceptanceRate: 42, classSize: 160, usNewsRank: 70 },
  { name: "University of New Mexico", state: "New Mexico", lsat25: 154, lsat50: 157, lsat75: 161, gpa25: 3.12, gpa50: 3.56, gpa75: 3.82, acceptanceRate: 41.4, classSize: 108, usNewsRank: null },
  { name: "University of Tulsa", state: "Oklahoma", lsat25: 155, lsat50: 157, lsat75: 160, gpa25: 3.27, gpa50: 3.45, gpa75: 3.72, acceptanceRate: 56.6, classSize: 118, usNewsRank: 100 },
  { name: "Campbell University", state: "North Carolina", lsat25: 152, lsat50: 156, lsat75: 159, gpa25: 3.21, gpa50: 3.51, gpa75: 3.77, acceptanceRate: 50.7, classSize: 202, usNewsRank: 110 },
  { name: "Drake University", state: "Iowa", lsat25: 153, lsat50: 156, lsat75: 159, gpa25: 3.38, gpa50: 3.67, gpa75: 3.89, acceptanceRate: 54.8, classSize: 141, usNewsRank: 78 },
  { name: "Howard University", state: "Washington, D.C.", lsat25: 153, lsat50: 156, lsat75: 160, gpa25: 3.4, gpa50: 3.63, gpa75: 3.8, acceptanceRate: 24.1, classSize: 176, usNewsRank: 46 },
  { name: "Jacksonville University College of Law", state: "Florida", lsat25: 154, lsat50: 156, lsat75: 159, gpa25: 3.28, gpa50: 3.48, gpa75: 3.68, acceptanceRate: 35.1, classSize: 70, usNewsRank: null },
  { name: "Samford University", state: "Alabama", lsat25: 154, lsat50: 156, lsat75: 160, gpa25: 3.42, gpa50: 3.63, gpa75: 3.84, acceptanceRate: 49, classSize: 170, usNewsRank: null },
  { name: "University of Detroit Mercy", state: "Michigan", lsat25: 154, lsat50: 156, lsat75: 159, gpa25: 3.16, gpa50: 3.52, gpa75: 3.73, acceptanceRate: 41.4, classSize: 247, usNewsRank: 78 },
  { name: "University of Missouri—Kansas City", state: "Missouri", lsat25: 154, lsat50: 156, lsat75: 159, gpa25: 3.33, gpa50: 3.65, gpa75: 3.8, acceptanceRate: 45.9, classSize: 143, usNewsRank: null },
  { name: "University of Montana", state: "Montana", lsat25: 153, lsat50: 156, lsat75: 159, gpa25: 3.33, gpa50: 3.64, gpa75: 3.8, acceptanceRate: 51.4, classSize: 95, usNewsRank: null },
  { name: "University of Wyoming", state: "Wyoming", lsat25: 153, lsat50: 156, lsat75: 160, gpa25: 3.32, gpa50: 3.55, gpa75: 3.8, acceptanceRate: 35.8, classSize: 74, usNewsRank: null },
  { name: "University of the Pacific (Mcgeorge)", state: "California", lsat25: 153, lsat50: 156, lsat75: 160, gpa25: 3.17, gpa50: 3.52, gpa75: 3.73, acceptanceRate: 54.4, classSize: 213, usNewsRank: 123 },
  { name: "Ave Maria School Of Law", state: "Florida", lsat25: 152, lsat50: 155, lsat75: 158, gpa25: 3.07, gpa50: 3.36, gpa75: 3.66, acceptanceRate: 47, classSize: 165, usNewsRank: null },
  { name: "CUNY", state: "New York", lsat25: 152, lsat50: 155, lsat75: 161, gpa25: 3.26, gpa50: 3.54, gpa75: 3.77, acceptanceRate: 28.6, classSize: 219, usNewsRank: 100 },
  { name: "California Western School Of Law", state: "California", lsat25: 152, lsat50: 155, lsat75: 158, gpa25: 3.16, gpa50: 3.5, gpa75: 3.66, acceptanceRate: 46.9, classSize: 242, usNewsRank: 123 },
  { name: "Cleveland State University", state: "Ohio", lsat25: 152, lsat50: 155, lsat75: 158, gpa25: 3.11, gpa50: 3.5, gpa75: 3.76, acceptanceRate: 34.5, classSize: 195, usNewsRank: 100 },
  { name: "Gonzaga University", state: "Washington", lsat25: 153, lsat50: 155, lsat75: 158, gpa25: 3.24, gpa50: 3.55, gpa75: 3.76, acceptanceRate: 51.1, classSize: 203, usNewsRank: 110 },
  { name: "Indiana University - Indianapolis", state: "Indiana", lsat25: 152, lsat50: 155, lsat75: 159, gpa25: 3.33, gpa50: 3.58, gpa75: 3.82, acceptanceRate: 55.9, classSize: 280, usNewsRank: null },
  { name: "Nova Southeastern University", state: "Florida", lsat25: 152, lsat50: 155, lsat75: 158, gpa25: 3.34, gpa50: 3.52, gpa75: 3.71, acceptanceRate: 47.3, classSize: 225, usNewsRank: null },
  { name: "Quinnipiac University", state: "Connecticut", lsat25: 153, lsat50: 155, lsat75: 158, gpa25: 3.41, gpa50: 3.65, gpa75: 3.84, acceptanceRate: 43.1, classSize: 135, usNewsRank: 123 },
  { name: "South Texas College Of Law—Houston", state: "Texas", lsat25: 153, lsat50: 155, lsat75: 158, gpa25: 3.08, gpa50: 3.41, gpa75: 3.65, acceptanceRate: 33.6, classSize: 437, usNewsRank: null },
  { name: "Suffolk University", state: "Massachusetts", lsat25: 152, lsat50: 155, lsat75: 159, gpa25: 3.37, gpa50: 3.58, gpa75: 3.79, acceptanceRate: 61.9, classSize: 544, usNewsRank: 123 },
  { name: "University of Baltimore", state: "Maryland", lsat25: 152, lsat50: 155, lsat75: 158, gpa25: 3.12, gpa50: 3.45, gpa75: 3.7, acceptanceRate: 49.5, classSize: 248, usNewsRank: 119 },
  { name: "University of Memphis", state: "Tennessee", lsat25: 152, lsat50: 155, lsat75: 159, gpa25: 3.22, gpa50: 3.53, gpa75: 3.77, acceptanceRate: 41.1, classSize: 96, usNewsRank: null },
  { name: "University of New Hampshire", state: "New Hampshire", lsat25: 151, lsat50: 155, lsat75: 159, gpa25: 3.1, gpa50: 3.5, gpa75: 3.72, acceptanceRate: 52, classSize: 248, usNewsRank: 89 },
  { name: "University of San Francisco", state: "California", lsat25: 152, lsat50: 155, lsat75: 157, gpa25: 3.16, gpa50: 3.47, gpa75: 3.68, acceptanceRate: 42.4, classSize: 201, usNewsRank: 123 },
  { name: "Washburn University", state: "Kansas", lsat25: 151, lsat50: 155, lsat75: 159, gpa25: 3.37, gpa50: 3.68, gpa75: 3.88, acceptanceRate: 46.5, classSize: 137, usNewsRank: null },
  { name: "West Virginia University", state: "West Virginia", lsat25: 151, lsat50: 155, lsat75: 159, gpa25: 3.34, gpa50: 3.65, gpa75: 3.89, acceptanceRate: 40.3, classSize: 114, usNewsRank: null },
  { name: "Charleston School Of Law", state: "South Carolina", lsat25: 152, lsat50: 154, lsat75: 157, gpa25: 3.26, gpa50: 3.51, gpa75: 3.75, acceptanceRate: 50.2, classSize: 241, usNewsRank: null },
  { name: "Elon University", state: "North Carolina", lsat25: 151, lsat50: 154, lsat75: 158, gpa25: 3.11, gpa50: 3.4, gpa75: 3.7, acceptanceRate: 53.2, classSize: 228, usNewsRank: null },
  { name: "Liberty University", state: "Virginia", lsat25: 151, lsat50: 154, lsat75: 158, gpa25: 3.36, gpa50: 3.54, gpa75: 3.81, acceptanceRate: 58.8, classSize: 141, usNewsRank: null },
  { name: "Loyola University—New Orleans", state: "Louisiana", lsat25: 151, lsat50: 154, lsat75: 157, gpa25: 3.21, gpa50: 3.47, gpa75: 3.71, acceptanceRate: 50.9, classSize: 223, usNewsRank: null },
  { name: "Mitchell Hamline", state: "Minnesota", lsat25: 151, lsat50: 154, lsat75: 158, gpa25: 2.96, gpa50: 3.29, gpa75: 3.6, acceptanceRate: 51.4, classSize: 364, usNewsRank: null },
  { name: "Northern Kentucky University", state: "Kentucky", lsat25: 152, lsat50: 154, lsat75: 157, gpa25: 3.15, gpa50: 3.41, gpa75: 3.68, acceptanceRate: 58.7, classSize: 155, usNewsRank: null },
  { name: "Pace University", state: "New York", lsat25: 151, lsat50: 154, lsat75: 157, gpa25: 3.31, gpa50: 3.54, gpa75: 3.74, acceptanceRate: 44.1, classSize: 324, usNewsRank: 118 },
  { name: "University of Akron", state: "Ohio", lsat25: 151, lsat50: 154, lsat75: 157, gpa25: 3.22, gpa50: 3.51, gpa75: 3.76, acceptanceRate: 58.5, classSize: 203, usNewsRank: null },
  { name: "Willamette University", state: "Oregon", lsat25: 151, lsat50: 154, lsat75: 157, gpa25: 3.22, gpa50: 3.48, gpa75: 3.7, acceptanceRate: 61.4, classSize: 139, usNewsRank: null },
  { name: "Creighton University", state: "Nebraska", lsat25: 150, lsat50: 153, lsat75: 156, gpa25: 3.14, gpa50: 3.51, gpa75: 3.74, acceptanceRate: 64.5, classSize: 162, usNewsRank: null },
  { name: "Lincoln Memorial", state: "Tennessee", lsat25: 150, lsat50: 153, lsat75: 156, gpa25: 3.08, gpa50: 3.44, gpa75: 3.68, acceptanceRate: 52.2, classSize: 163, usNewsRank: null },
  { name: "New England Law | Boston", state: "Massachusetts", lsat25: 149, lsat50: 153, lsat75: 157, gpa25: 3.06, gpa50: 3.37, gpa75: 3.68, acceptanceRate: 61.3, classSize: 451, usNewsRank: 123 },
  { name: "St. Mary's University", state: "Texas", lsat25: 151, lsat50: 153, lsat75: 156, gpa25: 3.14, gpa50: 3.49, gpa75: 3.69, acceptanceRate: 26, classSize: 282, usNewsRank: null },
  { name: "Touro College", state: "New York", lsat25: 151, lsat50: 153, lsat75: 156, gpa25: 3.05, gpa50: 3.35, gpa75: 3.66, acceptanceRate: 45.6, classSize: 223, usNewsRank: null },
  { name: "University of Arkansas, Little Rock", state: "Arkansas", lsat25: 150, lsat50: 153, lsat75: 158, gpa25: 2.98, gpa50: 3.41, gpa75: 3.72, acceptanceRate: 54.9, classSize: 154, usNewsRank: null },
  { name: "University of Idaho", state: "Idaho", lsat25: 149, lsat50: 153, lsat75: 157, gpa25: 3.07, gpa50: 3.54, gpa75: 3.81, acceptanceRate: 66.8, classSize: 197, usNewsRank: null },
  { name: "University of Illinois—Chicago", state: "Illinois", lsat25: 150, lsat50: 153, lsat75: 156, gpa25: 3.13, gpa50: 3.4, gpa75: 3.64, acceptanceRate: 52.6, classSize: 379, usNewsRank: 123 },
  { name: "University of North Texas at Dallas", state: "Texas", lsat25: 151, lsat50: 153, lsat75: 156, gpa25: 3.18, gpa50: 3.41, gpa75: 3.66, acceptanceRate: 24.2, classSize: 130, usNewsRank: null },
  { name: "University of Toledo", state: "Ohio", lsat25: 150, lsat50: 153, lsat75: 156, gpa25: 3.37, gpa50: 3.53, gpa75: 3.79, acceptanceRate: 52.5, classSize: 126, usNewsRank: null },
  { name: "Western New England University", state: "Massachusetts", lsat25: 149, lsat50: 153, lsat75: 156, gpa25: 2.84, gpa50: 3.27, gpa75: 3.57, acceptanceRate: 51.9, classSize: 115, usNewsRank: 123 },
  { name: "Atlanta's John Marshall Law School", state: "Georgia", lsat25: 150, lsat50: 152, lsat75: 155, gpa25: 2.78, gpa50: 3.13, gpa75: 3.49, acceptanceRate: 32.6, classSize: 138, usNewsRank: null },
  { name: "Florida A&M University", state: "Florida", lsat25: 149, lsat50: 152, lsat75: 155, gpa25: 3.18, gpa50: 3.48, gpa75: 3.74, acceptanceRate: 34.7, classSize: 177, usNewsRank: null },
  { name: "Mississippi College", state: "Mississippi", lsat25: 148, lsat50: 152, lsat75: 155, gpa25: 3.03, gpa50: 3.37, gpa75: 3.73, acceptanceRate: 59.8, classSize: 179, usNewsRank: null },
  { name: "St. Thomas University (Florida)", state: "Florida", lsat25: 150, lsat50: 152, lsat75: 156, gpa25: 3.12, gpa50: 3.42, gpa75: 3.65, acceptanceRate: 60.3, classSize: 431, usNewsRank: null },
  { name: "University of Massachusetts Dartmouth", state: "Massachusetts", lsat25: 149, lsat50: 152, lsat75: 155, gpa25: 3.1, gpa50: 3.36, gpa75: 3.69, acceptanceRate: 52.2, classSize: 141, usNewsRank: null },
  { name: "University of Puerto Rico", state: "Puerto Rico", lsat25: 146, lsat50: 152, lsat75: 156, gpa25: 3.57, gpa50: 3.77, gpa75: 3.9, acceptanceRate: 39.7, classSize: 122, usNewsRank: null },
  { name: "University of South Dakota", state: "South Dakota", lsat25: 149, lsat50: 152, lsat75: 156, gpa25: 3.16, gpa50: 3.47, gpa75: 3.81, acceptanceRate: 62.6, classSize: 88, usNewsRank: null },
  { name: "Vermont Law School", state: "Vermont", lsat25: 148, lsat50: 152, lsat75: 157, gpa25: 2.81, gpa50: 3.25, gpa75: 3.61, acceptanceRate: 58.5, classSize: 290, usNewsRank: null },
  { name: "Western State College Of Law", state: "California", lsat25: 150, lsat50: 152, lsat75: 156, gpa25: 3.03, gpa50: 3.36, gpa75: 3.62, acceptanceRate: 43.7, classSize: 117, usNewsRank: null },
  { name: "Widener University—Delaware", state: "Delaware", lsat25: 149, lsat50: 152, lsat75: 154, gpa25: 2.95, gpa50: 3.33, gpa75: 3.6, acceptanceRate: 59.7, classSize: 277, usNewsRank: null },
  { name: "Capital University", state: "Ohio", lsat25: 148, lsat50: 151, lsat75: 157, gpa25: 3.07, gpa50: 3.44, gpa75: 3.66, acceptanceRate: 65.9, classSize: 180, usNewsRank: null },
  { name: "North Carolina Central University", state: "North Carolina", lsat25: 149, lsat50: 151, lsat75: 154, gpa25: 3.05, gpa50: 3.31, gpa75: 3.56, acceptanceRate: 39.1, classSize: 133, usNewsRank: null },
  { name: "Oklahoma City University", state: "Oklahoma", lsat25: 149, lsat50: 151, lsat75: 155, gpa25: 3.21, gpa50: 3.56, gpa75: 3.78, acceptanceRate: 51.6, classSize: 160, usNewsRank: null },
  { name: "University of North Dakota", state: "North Dakota", lsat25: 148, lsat50: 151, lsat75: 155, gpa25: 3.24, gpa50: 3.48, gpa75: 3.75, acceptanceRate: 63.1, classSize: 97, usNewsRank: null },
  { name: "University of the District of Columbia", state: "Washington, D.C.", lsat25: 148, lsat50: 151, lsat75: 153, gpa25: 3.05, gpa50: 3.28, gpa75: 3.55, acceptanceRate: 37, classSize: 83, usNewsRank: null },
  { name: "Barry University", state: "Florida", lsat25: 148, lsat50: 150, lsat75: 152, gpa25: 2.93, gpa50: 3.23, gpa75: 3.48, acceptanceRate: 55.9, classSize: 258, usNewsRank: null },
  { name: "Jones School of Law", state: "Alabama", lsat25: 148, lsat50: 150, lsat75: 154, gpa25: 2.99, gpa50: 3.33, gpa75: 3.66, acceptanceRate: 53.9, classSize: 167, usNewsRank: null },
  { name: "Northern Illinois University", state: "Illinois", lsat25: 148, lsat50: 150, lsat75: 154, gpa25: 3.17, gpa50: 3.41, gpa75: 3.64, acceptanceRate: 44.3, classSize: 134, usNewsRank: null },
  { name: "Roger Williams University", state: "Rhode Island", lsat25: 147, lsat50: 150, lsat75: 154, gpa25: 3.02, gpa50: 3.43, gpa75: 3.73, acceptanceRate: 61.3, classSize: 189, usNewsRank: null },
  { name: "Texas Southern University", state: "Texas", lsat25: 148, lsat50: 150, lsat75: 152, gpa25: 2.99, gpa50: 3.33, gpa75: 3.62, acceptanceRate: 33.1, classSize: 221, usNewsRank: null },
  { name: "Widener University—Pennsylvania (Commonwealth)", state: "Pennsylvania", lsat25: 147, lsat50: 150, lsat75: 153, gpa25: 2.98, gpa50: 3.33, gpa75: 3.64, acceptanceRate: 60.4, classSize: 159, usNewsRank: null },
  { name: "Ohio Northern University", state: "Ohio", lsat25: 146, lsat50: 149, lsat75: 151, gpa25: 3.06, gpa50: 3.34, gpa75: 3.67, acceptanceRate: 0, classSize: 129, usNewsRank: null },
  { name: "Southern Illinois University—Carbondale", state: "Illinois", lsat25: 146, lsat50: 149, lsat75: 155, gpa25: 2.93, gpa50: 3.38, gpa75: 3.78, acceptanceRate: 56.2, classSize: 133, usNewsRank: null },
  { name: "Wilmington University School of Law", state: "Delaware", lsat25: 146, lsat50: 149, lsat75: 152, gpa25: 2.67, gpa50: 3.13, gpa75: 3.49, acceptanceRate: 52, classSize: 75, usNewsRank: null },
  { name: "Cooley Law School", state: "Michigan", lsat25: 145, lsat50: 147, lsat75: 151, gpa25: 2.67, gpa50: 3.09, gpa75: 3.45, acceptanceRate: 52.9, classSize: 237, usNewsRank: null },
  { name: "Southern University", state: "Louisiana", lsat25: 145, lsat50: 147, lsat75: 150, gpa25: 2.86, gpa50: 3.15, gpa75: 3.48, acceptanceRate: 56.5, classSize: 300, usNewsRank: null },
  { name: "Appalachian School of Law", state: "Virginia", lsat25: 145, lsat50: 146, lsat75: 151, gpa25: 2.72, gpa50: 3.2, gpa75: 3.53, acceptanceRate: 60.9, classSize: 92, usNewsRank: null },
  { name: "Inter American University School of Law", state: "Puerto Rico", lsat25: 140, lsat50: 144, lsat75: 148, gpa25: 3.18, gpa50: 3.39, gpa75: 3.65, acceptanceRate: 50.9, classSize: 205, usNewsRank: null },
  { name: "Pontifical Catholic University", state: "Puerto Rico", lsat25: 136, lsat50: 139, lsat75: 143, gpa25: 2.97, gpa50: 3.33, gpa75: 3.61, acceptanceRate: 61.5, classSize: 161, usNewsRank: null },
];

export type StandingBand = 'below25' | 'between' | 'at75' | 'above75';

/**
 * Where a score sits against one school's class. Deliberately coarse: the
 * honest read is "under their range" or "in it", never a probability we cannot
 * compute from three numbers.
 */
export function standingFor(score: number, school: SchoolAdmissions): StandingBand {
  if (school.lsat75 !== null && score > school.lsat75) return 'above75';
  if (school.lsat75 !== null && score === school.lsat75) return 'at75';
  if (school.lsat25 !== null && score < school.lsat25) return 'below25';
  return 'between';
}

/** Schools whose median sits within `spread` points of a score, closest first. */
export function schoolsNearScore(score: number, spread = 3): SchoolAdmissions[] {
  return SCHOOL_ADMISSIONS.filter((s) => Math.abs(s.lsat50 - score) <= spread).sort(
    (a, b) => Math.abs(a.lsat50 - score) - Math.abs(b.lsat50 - score) || a.name.localeCompare(b.name),
  );
}

/** Free-text search over school name and state. */
export function searchAdmissions(query: string): SchoolAdmissions[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return SCHOOL_ADMISSIONS;
  return SCHOOL_ADMISSIONS.filter(
    (s) => s.name.toLowerCase().includes(needle) || s.state.toLowerCase().includes(needle),
  );
}

/**
 * Match a school the student named against a row here.
 *
 * The two lists name schools differently: the intake carries the law school's
 * own name ("Harvard Law School"), the 509 data carries the university
 * ("Harvard University"). Comparing them literally matched almost nothing, so
 * both sides are reduced to the words that actually identify the place.
 */
const NOISE = new Set([
  'law', 'school', 'schools', 'college', 'center', 'centre', 'university',
  'universities', 'of', 'the', 'at', 'faculty', 'institute', 'legal', 'and',
]);

function identity(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !NOISE.has(word));
}

export function findAdmissionsFor(name: string): SchoolAdmissions | undefined {
  const wanted = identity(name);
  if (wanted.length === 0) return undefined;
  return SCHOOL_ADMISSIONS.find((school) => {
    const have = identity(school.name);
    if (have.length === 0) return false;
    // Whichever name is more specific has to be fully contained in the other,
    // so "Chicago" does not claim "University of Chicago Illinois Institute".
    const [short, long] = wanted.length <= have.length ? [wanted, have] : [have, wanted];
    return short.every((word) => long.includes(word));
  });
}

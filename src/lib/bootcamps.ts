/**
 * Single source of truth for bootcamp metadata used by the Teacher
 * Workspace. Both TeacherBootcamps (toggle list) and AssignmentBuilder
 * (assignment dropdown) import from here so a new bootcamp only needs to
 * be registered in one place.
 *
 * `route` must match a real `<Route path="/bootcamp/...">` registered in
 * src/App.tsx. Retired routes (e.g. /bootcamp/structure) intentionally
 * redirect back to /bootcamps and are NOT listed here — assigning a
 * retired slug would land the student on the index, which would be a lie.
 */
export interface BootcampDef {
  id: string;
  title: string;
  description: string;
  route: string;
}

export const BOOTCAMPS: BootcampDef[] = [
  {
    id: 'principle-flaw',
    title: 'Principle & Flaw',
    description: 'Two-week LR bootcamp',
    route: '/bootcamp/principle-flaw',
  },
  {
    id: 'intro-to-lr',
    title: 'Intro to LR',
    description: 'Foundational LR skills',
    route: '/bootcamp/intro-to-lr',
  },
  {
    id: 'causation-station',
    title: 'Causation Station',
    description: 'Causal reasoning patterns',
    route: '/bootcamp/causation-station',
  },
  {
    id: 'abstraction',
    title: 'Abstraction',
    description: 'Abstract relationships',
    route: '/bootcamp/abstraction',
  },
];

import type { TimerMode } from '@/types/drill';

/**
 * The page a student sees between "Open the set" and the first question of an
 * assigned PrepTest section: section number, the clock, the question count,
 * and the official directions. Modelled on LawHub's directions screen, because
 * the point of assigning a real section is that it feels like the real thing.
 */

export type SectionKind = 'lr' | 'rc';

export function sectionDirectionsRoute(assignmentId: string): string {
  return `/section/${encodeURIComponent(assignmentId)}`;
}

/** LSAC's own wording, verbatim. Not to be edited for voice. */
export const SECTION_DIRECTIONS: Record<SectionKind, string> = {
  lr:
    'Each question in this section is based on the reasoning presented in a brief passage. ' +
    'In answering the questions, you should not make assumptions that are by commonsense ' +
    'standards implausible, superfluous, or incompatible with the passage. For some questions, ' +
    'more than one of the choices could conceivably answer the question. However, you are to ' +
    'choose the best answer; that is, choose the response that most accurately and completely ' +
    'answers the question.',
  rc:
    'Each set of questions in this section is based on a single passage. The questions are to ' +
    'be answered on the basis of what is stated or implied in the passage. For some questions, ' +
    'more than one of the choices could conceivably answer the question. However, you are to ' +
    'choose the best answer; that is, choose the response that most accurately and completely ' +
    'answers the question.',
};

/**
 * Minutes on the clock for a timing mode, or null when there is no clock.
 * Standard is 35; 52.5 and 70 are the 1.5x and 2x accommodations.
 */
export function sectionMinutes(mode: TimerMode | undefined): number | null {
  switch (mode) {
    case '52.5':
      return 52.5;
    case '70':
      return 70;
    case 'unlimited':
      return null;
    default:
      return 35;
  }
}

/** "35 minutes", "52 minutes 30 seconds", "70 minutes". */
export function formatSectionMinutes(minutes: number): string {
  const whole = Math.floor(minutes);
  const seconds = Math.round((minutes - whole) * 60);
  if (seconds === 0) return `${whole} minutes`;
  return `${whole} minutes ${seconds} seconds`;
}

/**
 * Single source of truth for bootcamp metadata used by the Teacher
 * Workspace. Both TeacherBootcamps (toggle list) and AssignmentBuilder
 * (assignment dropdown) import from here so a new bootcamp only needs to
 * be registered in one place.
 *
 * `route` must match a real `<Route path="...">` registered in src/App.tsx.
 * Retired routes (e.g. /bootcamp/structure) intentionally redirect back to
 * /bootcamps and are NOT listed here. Assigning a retired slug would land
 * the student on the index, which would be a lie.
 */
/**
 * Each bootcamp owns a distinct visual language inside its own app. The
 * library cover mirrors that identity so the catalog reads as five different
 * products, not one template recolored five times. `style` picks the cover
 * layout; the hex tokens are pulled from each sub-app's real palette.
 */
export type BootcampCoverStyle = 'dark' | 'editorial' | 'brutalist';

export interface BootcampTheme {
  style: BootcampCoverStyle;
  /** Cover background. */
  bg: string;
  /** Primary text on the cover. */
  ink: string;
  /** Secondary / supporting text. */
  inkSoft: string;
  /** Accent block + highlight color. */
  accent: string;
  /** Optional second accent for bootcamps whose real app uses a two-color identity. */
  accentAlt?: string;
  /** Text that sits on top of the accent block. */
  accentInk: string;
}

export interface BootcampDef {
  id: string;
  title: string;
  description: string;
  route: string;
  stats: string[];
  legacyRoutes?: string[];
  theme: BootcampTheme;
}

export const BOOTCAMPS: BootcampDef[] = [
  {
    id: 'conditional-indicators-refresher',
    title: 'Conditional Indicators Refresher',
    description:
      'Four-group conditional indicator review with sorting, flashcards, diagram drills, and a timed Unless drill.',
    route: '/conditional-indicators-refresher',
    stats: ['Cheat sheet', 'Sort + flashcards', 'Diagram + Unless drills'],
    theme: {
      style: 'editorial',
      bg: '#F5F2ED',
      ink: '#143937',
      inkSoft: '#65706A',
      accent: '#244E49',
      accentInk: '#FBF8F1',
    },
  },
  {
    id: 'principle-flaw',
    title: 'Principle & Flaw',
    description: 'Principle questions, flaw patterns, and parallel-flaw transfer.',
    route: '/bootcamp/principle-flaw',
    stats: ['14-day plan', 'Question-bank practice', 'Flashcards + review log'],
    // Dark zinc + emerald (src/bootcamps/principle-flaw).
    theme: {
      style: 'dark',
      bg: '#09090b',
      ink: '#fafafa',
      inkSoft: '#a1a1aa',
      accent: '#34d399',
      accentInk: '#052e16',
    },
  },
  {
    id: 'intro-to-lr',
    title: 'Intro to LR',
    description: 'Argument anatomy, premises, conclusions, and main-conclusion reps.',
    route: '/bootcamp/intro-to-lr',
    stats: ['Integrated path', 'Notes + labs', 'Diagnostics + review'],
    // Cream editorial + emerald/amber serif (src/bootcamps/main-conclusion).
    theme: {
      style: 'editorial',
      bg: '#F5F2ED',
      ink: '#1a1a1a',
      inkSoft: '#74541B',
      accent: '#2F5B35',
      accentInk: '#FBF8F1',
    },
  },
  {
    id: 'causation-station',
    title: 'Causation Station',
    description: 'Association vs causation, alternate causes, reverse causality, and causal strengthen/weaken.',
    route: '/bootcamp/causation-station',
    stats: ['4 modules', 'Causal drills', 'Flashcards + journal'],
    // Neon punk magenta/cyan (src/references/bootcamps/causation-station).
    theme: {
      style: 'dark',
      bg: '#050816',
      ink: '#EAF2FF',
      inkSoft: '#9BB0C8',
      accent: '#FF1AFF',
      accentAlt: '#00FFF0',
      accentInk: '#050816',
    },
  },
  {
    id: 'fallacy-flaw',
    title: 'Flaw & Famous Flaws',
    description: 'Canonical flaw families, answer-choice traps, and diagnosis drills.',
    route: '/bootcamp/fallacy-flaw',
    stats: ['4 modules', 'Flaw catalog', 'Drills + flashcards'],
    // Cream editorial + crimson accent (src/bootcamps/fallacy-flaw-v2).
    theme: {
      style: 'editorial',
      bg: '#f5f2ed',
      ink: '#1a1a1a',
      inkSoft: '#6f6a63',
      accent: '#B73D5A',
      accentInk: '#F9E1E6',
    },
  },
  {
    id: 'rc-engaging-with-the-passage',
    title: 'Engaging With The Passage',
    description:
      'Reading for the author’s purpose: timed reads, writing from memory, and a line-by-line walkthrough.',
    route: '/bootcamp/rc-engaging-with-the-passage',
    stats: ['17 chapters', '7 passages', 'Timed reads + writing'],
    // Warm workbook paper + editorial indigo (src/bootcamps/rc-bootcamp).
    theme: {
      style: 'editorial',
      bg: '#F0E9DC',
      ink: '#1A1512',
      inkSoft: '#6B645C',
      accent: '#39457F',
      accentInk: '#FAF6EE',
    },
  },
  {
    id: 'abstraction',
    title: 'Abstract',
    description:
      'Strip-down, decode, match-to-stimulus, method patterns, and trap catching.',
    route: '/topics/abstract',
    stats: ['Chapter + 7 drills', 'Flashcards + decoder', 'Methods library'],
    legacyRoutes: ['/bootcamp/abstraction'],
    // Neo-brutalist: electric yellow, paper bg, hard black borders (src/topics/abstract).
    theme: {
      style: 'brutalist',
      bg: '#FBFAF3',
      ink: '#14110C',
      inkSoft: '#44403c',
      accent: '#E9E70C',
      accentInk: '#14110C',
    },
  },
];

export function bootcampIdFromRoute(route: string): string {
  const routeWithoutQuery = route.split('?')[0]?.split('#')[0] ?? route;
  if (routeWithoutQuery.startsWith('/bootcamp/')) {
    return routeWithoutQuery.replace(/^\/bootcamp\//, '').replace(/\/.*$/, '');
  }
  const topicMatch = BOOTCAMPS.find((b) => {
    const routes = [b.route, ...(b.legacyRoutes ?? [])];
    return routes.some((r) => routeWithoutQuery === r || routeWithoutQuery.startsWith(`${r}/`));
  });
  return topicMatch?.id ?? routeWithoutQuery.replace(/^\/+/, '').replace(/\/.*$/, '');
}

export function findBootcampById(id: string | undefined | null): BootcampDef | undefined {
  if (!id) return undefined;
  return BOOTCAMPS.find((b) => b.id === id);
}

export function findBootcampByRoute(route: string | undefined | null): BootcampDef | undefined {
  if (!route) return undefined;
  const normalized = route.split('?')[0]?.split('#')[0] ?? route;
  return BOOTCAMPS.find((b) => {
    const routes = [b.route, ...(b.legacyRoutes ?? [])];
    return routes.some((r) => normalized === r || normalized.startsWith(`${r}/`));
  });
}

export function bootcampAcceptedRoutes(bootcampIdOrRoute: string): string[] {
  const bootcamp =
    findBootcampById(bootcampIdOrRoute) ?? findBootcampByRoute(bootcampIdOrRoute);
  if (!bootcamp) return [bootcampIdOrRoute];
  return [bootcamp.route, ...(bootcamp.legacyRoutes ?? [])];
}

export function classroomItemMatchesBootcamp(
  item: { source_id?: string | null; metadata_json?: Record<string, unknown> | null },
  bootcampIdOrRoute: string,
): boolean {
  const bootcamp =
    findBootcampById(bootcampIdOrRoute) ?? findBootcampByRoute(bootcampIdOrRoute);
  const expectedId = bootcamp?.id ?? bootcampIdFromRoute(bootcampIdOrRoute);
  const metadataId = item.metadata_json?.bootcamp_id;
  if (metadataId === expectedId) return true;

  if (!item.source_id) return false;
  const sourceBootcamp = findBootcampByRoute(item.source_id);
  if (sourceBootcamp?.id === expectedId) return true;

  const acceptedRoutes = bootcamp ? [bootcamp.route, ...(bootcamp.legacyRoutes ?? [])] : [bootcampIdOrRoute];
  return acceptedRoutes.some((route) => item.source_id === route || item.source_id?.startsWith(`${route}/`));
}

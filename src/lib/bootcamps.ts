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
  /** Text that sits on top of the accent block. */
  accentInk: string;
}

export interface BootcampDef {
  id: string;
  title: string;
  description: string;
  route: string;
  theme: BootcampTheme;
}

export const BOOTCAMPS: BootcampDef[] = [
  {
    id: 'principle-flaw',
    title: 'Principle & Flaw',
    description: 'Two-week LR bootcamp',
    route: '/bootcamp/principle-flaw',
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
    description: 'Foundational LR skills',
    route: '/bootcamp/intro-to-lr',
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
    description: 'Causal reasoning patterns',
    route: '/bootcamp/causation-station',
    // Dark, electric cyan accent (Zap / causal arrows).
    theme: {
      style: 'dark',
      bg: '#0a0f12',
      ink: '#ecfeff',
      inkSoft: '#7d9aa3',
      accent: '#22d3ee',
      accentInk: '#042f2e',
    },
  },
  {
    id: 'fallacy-flaw',
    title: 'Flaw & Famous Flaws',
    description: '18 canonical logical flaws',
    route: '/bootcamp/fallacy-flaw',
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
    id: 'abstraction',
    title: 'Abstract',
    description:
      'Strip-Down + Decode. The bilingual fluency foundation topic that every other LR bootcamp builds on.',
    route: '/topics/abstract',
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

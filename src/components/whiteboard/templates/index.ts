import { conditionalTemplates } from './conditionalTemplates';
import { argumentTemplates } from './argumentTemplates';
import { blankTemplates } from './blankTemplates';
import type { WhiteboardTemplate } from './types';

export const TEMPLATES: WhiteboardTemplate[] = [
  ...conditionalTemplates,
  ...argumentTemplates,
  ...blankTemplates,
];

export const TEMPLATES_BY_CATEGORY: Record<string, WhiteboardTemplate[]> = TEMPLATES.reduce(
  (acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  },
  {} as Record<string, WhiteboardTemplate[]>,
);

export type { WhiteboardTemplate, BuildContext } from './types';

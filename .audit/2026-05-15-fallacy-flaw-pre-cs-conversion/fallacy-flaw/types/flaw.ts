export type Group = 'g1' | 'g2' | 'g3';

export type Frequency =
  | 'Extreme'
  | 'Very High'
  | 'High'
  | 'Medium-High'
  | 'Medium'
  | 'Low-Medium'
  | 'Low';

export interface Disambiguation {
  other: string;
  question: string;
}

export interface FlawEntry {
  slug: string;
  name: string;
  number: number;
  group: Group;
  groupLabel: string;
  frequency: Frequency;
  rightAnswerFreq?: Frequency;
  definition: string;
  stimulusTells: string;
  disguises: string[];
  workedExample: string;
  workedAnalysis?: string;
  whatIfCounter: string;
  disambiguateFrom?: Disambiguation[];
  realPhrasePairs?: string[];
  crossLink?: string;
  notes?: string;
}

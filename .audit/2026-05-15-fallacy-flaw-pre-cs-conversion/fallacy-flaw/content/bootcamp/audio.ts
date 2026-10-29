import type { DayId } from '../../lib/store';

export interface AudioChapter {
  day: DayId;
  title: string;
  start: number;
  blurb: string;
}

export const BOOTCAMP_AUDIO_SRC = '/fallacy-flaw/bootcamp-audio.mp3';

export const BOOTCAMP_AUDIO_CHAPTERS: AudioChapter[] = [
  { day: 1, title: 'Hostile Mode & the Key', start: 0, blurb: 'Logical Hostility, Cake-on-Blocks, the What-if method.' },
  { day: 2, title: 'Three Languages', start: 430, blurb: 'Assumption, Objection, Match — and the trigger-phrase rule.' },
  { day: 3, title: 'The Heavy Hitters', start: 860, blurb: 'Necessary/Sufficient, Causal, Part/Whole, Unproven, Ad Hominem, Sampling.' },
  { day: 4, title: 'The House Five', start: 1290, blurb: 'Sleight of Hand, Sleazy Sales Pitch, Universal Desires, Value Assumptions, Secret Downsides.' },
  { day: 5, title: 'Trap School', start: 1720, blurb: 'Five Fast Eliminators, Group 2 distractors, the Disambiguation Matrix.' },
  { day: 6, title: 'Live Fire', start: 2150, blurb: 'Five worked walkthroughs, then the contract drill.' },
];

export interface JumpLink {
  prompt: string;
  /** In the sub-app context these are just labels; no routing. */
  href: string;
}

export const BOOTCAMP_AUDIO_JUMP_LINKS: JumpLink[] = [
  { prompt: 'How does hostile reading apply to a causal flaw?', href: '#' },
  { prompt: 'Walk me through the Three Languages again.', href: '#' },
  { prompt: 'Show me the Sleight of Hand catalog entry.', href: '#' },
  { prompt: 'I want the Disambiguation Matrix.', href: '#' },
  { prompt: 'Run the live-fire drill.', href: '#' },
];

import type { DayId } from '../../lib/store';

export interface VideoChapter {
  day: DayId;
  title: string;
  start: number;
  blurb: string;
}

export const BOOTCAMP_VIDEO_SRC = '/fallacy-flaw/bootcamp-video.mp4';
export const BOOTCAMP_VIDEO_POSTER = '/fallacy-flaw/bootcamp-infographic.png';

export const BOOTCAMP_VIDEO_CHAPTERS: VideoChapter[] = [
  { day: 1, title: 'Hostile Mode & the Key', start: 0, blurb: 'Logical Hostility, Cake-on-Blocks, the What-if method.' },
  { day: 2, title: 'Three Languages', start: 240, blurb: 'Assumption / Objection / Match and the trigger-phrase rule.' },
  { day: 3, title: 'The Heavy Hitters', start: 480, blurb: 'Group 1 stimulus tells, on sight.' },
  { day: 4, title: 'The House Five', start: 720, blurb: 'Sleight of Hand and the four cousins without textbook names.' },
  { day: 5, title: 'Trap School', start: 960, blurb: 'Five Fast Eliminators and the Disambiguation Matrix.' },
  { day: 6, title: 'Live Fire', start: 1200, blurb: 'Five worked walkthroughs at full speed.' },
];

export const VIDEO_OVERVIEW_BLURB =
  "A visual run-through of the bootcamp's six days — diagrams, stimulus tells, and the protocols that turn Flaw into your strongest LR question type.";

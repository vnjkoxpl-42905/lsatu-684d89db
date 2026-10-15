import { describe, it, expect } from 'vitest';
import {
  helpSnapshotHeading,
  smartClickLabel,
  type HelpSnapshot,
} from './helpContextBus';
import { stripHelpContextFromBody } from './inboxAttachments';

const base: HelpSnapshot = {
  path: '/topics/intro-lr/day/2',
  title: 'Intro to LR',
  drillQid: null,
  bootcamp: null,
  capturedAt: '2026-07-23T00:00:00.000Z',
};

describe('helpSnapshotHeading', () => {
  it('appends the bootcamp day', () => {
    expect(helpSnapshotHeading({ ...base, bootcamp: { id: 'intro-lr', day: 2 } })).toBe(
      'Intro to LR · Day 2',
    );
  });
  it('strips a site suffix from the title', () => {
    expect(helpSnapshotHeading({ ...base, title: 'Intro to LR | LSAT U' })).toBe('Intro to LR');
  });
  it('falls back when title is empty', () => {
    expect(helpSnapshotHeading({ ...base, title: '' })).toBe('This page');
  });
});

describe('smartClickLabel', () => {
  it('names the bootcamp destination', () => {
    expect(smartClickLabel({ ...base, bootcamp: { id: 'intro-lr', day: 2 } })).toBe(
      'Open the Intro to LR bootcamp',
    );
  });
  it('names a specific question', () => {
    expect(smartClickLabel({ ...base, drillQid: 'q-123' })).toBe('Open this question');
  });
  it('names a content page', () => {
    expect(smartClickLabel(base)).toBe('Open the Intro to LR page');
  });
  it('never returns a bare route', () => {
    expect(smartClickLabel({ ...base, title: '' })).toBe('Open this page');
  });
});

describe('stripHelpContextFromBody', () => {
  it('removes the legacy — context — tail', () => {
    const body = 'I keep going back to the same sections.\n\n— context —\npage: /topics/intro-lr';
    expect(stripHelpContextFromBody(body)).toBe('I keep going back to the same sections.');
  });
  it('drops a bare [Help request] placeholder', () => {
    expect(stripHelpContextFromBody('[Help request]\n\n— context —\npage: /x')).toBe('');
  });
  it('leaves a clean modern body untouched', () => {
    expect(stripHelpContextFromBody('Where do I find the drill?')).toBe(
      'Where do I find the drill?',
    );
  });
});

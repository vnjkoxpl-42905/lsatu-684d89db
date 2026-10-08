import type { ExcalidrawElement } from './types';

// Cheap UUID-ish generator — Excalidraw doesn't require crypto-grade ids,
// just uniqueness within the scene.
function nid(): string {
  return Math.random().toString(36).slice(2, 11);
}

const COMMON = {
  angle: 0,
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'solid' as const,
  strokeWidth: 2,
  strokeStyle: 'solid' as const,
  roughness: 1,
  opacity: 100,
  groupIds: [] as string[],
  frameId: null as string | null,
  roundness: { type: 3, value: 6 },
  seed: Math.floor(Math.random() * 100000),
  version: 1,
  versionNonce: Math.floor(Math.random() * 100000),
  isDeleted: false,
  boundElements: null as null | unknown[],
  updated: Date.now(),
  link: null as string | null,
  locked: false,
};

export function rect(opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  rounded?: boolean;
  id?: string;
}): ExcalidrawElement[] {
  const id = opts.id ?? nid();
  const text = opts.text ?? '';
  const rectangle: ExcalidrawElement = {
    ...COMMON,
    id,
    type: 'rectangle',
    x: opts.x,
    y: opts.y,
    width: opts.w,
    height: opts.h,
    roundness: opts.rounded === false ? null : { type: 3, value: 6 },
    boundElements: text ? [{ id: `${id}-text`, type: 'text' }] : null,
  };
  if (!text) return [rectangle];
  const textEl: ExcalidrawElement = {
    ...COMMON,
    id: `${id}-text`,
    type: 'text',
    x: opts.x + 12,
    y: opts.y + opts.h / 2 - 12,
    width: opts.w - 24,
    height: 24,
    text,
    fontSize: 18,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: id,
    originalText: text,
    lineHeight: 1.25,
    baseline: 18,
  };
  return [rectangle, textEl];
}

export function text(opts: {
  x: number;
  y: number;
  w?: number;
  content: string;
  fontSize?: number;
  bold?: boolean;
}): ExcalidrawElement {
  return {
    ...COMMON,
    id: nid(),
    type: 'text',
    x: opts.x,
    y: opts.y,
    width: opts.w ?? 200,
    height: (opts.fontSize ?? 16) * 1.4,
    text: opts.content,
    fontSize: opts.fontSize ?? 16,
    fontFamily: opts.bold ? 4 : 1,
    textAlign: 'left',
    verticalAlign: 'top',
    containerId: null,
    originalText: opts.content,
    lineHeight: 1.25,
    baseline: opts.fontSize ?? 16,
  };
}

export function arrow(opts: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}): ExcalidrawElement {
  return {
    ...COMMON,
    id: nid(),
    type: 'arrow',
    x: opts.startX,
    y: opts.startY,
    width: opts.endX - opts.startX,
    height: opts.endY - opts.startY,
    points: [
      [0, 0],
      [opts.endX - opts.startX, opts.endY - opts.startY],
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: 'arrow',
    elbowed: false,
  };
}

export function separator(opts: {
  x: number;
  y: number;
  width: number;
}): ExcalidrawElement {
  return {
    ...COMMON,
    id: nid(),
    type: 'line',
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: 0,
    points: [
      [0, 0],
      [opts.width, 0],
    ],
    strokeWidth: 2,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
  };
}

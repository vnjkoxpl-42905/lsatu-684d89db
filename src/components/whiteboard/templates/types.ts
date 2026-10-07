// Item C — minimal Excalidraw element shape we use to build templates.
// We construct JSON-compatible elements without importing Excalidraw's
// internal types at runtime; we cast to `never` at the API boundary.

export interface ExcalidrawElement {
  id: string;
  type: 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'arrow' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  // Free-form pass-through for type-specific fields. Excalidraw tolerates
  // missing optional fields and fills them in.
  [key: string]: unknown;
}

export interface BuildContext {
  origin: { x: number; y: number };
  selectedText: string | null;
}

export interface ExcalidrawSkeletonInsert {
  elements: ExcalidrawElement[];
  // Element ids that should be removed from the scene (used when a
  // template replaces a selected text element with its diagram).
  replaceElementIds?: string[];
}

export type TemplateCategory = 'conditional' | 'argument' | 'blank' | 'utility';

export interface WhiteboardTemplate {
  id: string;
  label: string;
  description?: string;
  category: TemplateCategory;
  shortLabel?: string;
  build: (ctx: BuildContext) => ExcalidrawSkeletonInsert;
}

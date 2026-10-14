// Item C — opens a small modal with the selected text in a contenteditable
// div with browser-native spellcheck enabled. On confirm, the corrected
// text replaces the selected element's text on the canvas via the same
// updateScene path the templates use.

export interface SelectedTextRef {
  elementId: string;
  text: string;
}

export function readSelectedSingleText(api: {
  getSceneElements: () => unknown[];
  getAppState: () => unknown;
}): SelectedTextRef | null {
  try {
    const appState = api.getAppState() as {
      selectedElementIds?: Record<string, boolean>;
    };
    const ids = Object.keys(appState.selectedElementIds ?? {});
    if (ids.length !== 1) return null;
    const id = ids[0];
    const elements = api.getSceneElements() as Array<{
      id: string;
      type: string;
      text?: string;
    }>;
    const el = elements.find((e) => e.id === id);
    if (!el || el.type !== 'text' || typeof el.text !== 'string') return null;
    return { elementId: el.id, text: el.text };
  } catch {
    return null;
  }
}

export function replaceTextOnElement(
  api: {
    getSceneElements: () => unknown[];
    updateScene: (data: { elements: unknown[] }) => void;
  },
  elementId: string,
  next: string,
) {
  const elements = api.getSceneElements() as Array<{ id: string; text?: string; originalText?: string }>;
  const updated = elements.map((e) =>
    e.id === elementId ? { ...e, text: next, originalText: next } : e,
  );
  api.updateScene({ elements: updated });
}

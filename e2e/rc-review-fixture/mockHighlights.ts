const marks: never[] = [];
export function useRcHighlights() {
  return { forPassage: () => marks, loaded: true, loadError: null,
    statusForPassage: () => 'idle', color: 'yellow', setColor: () => undefined,
    retryLoad: () => undefined, retrySave: () => undefined, add: () => undefined,
    removeAt: () => undefined, removeRange: () => undefined };
}

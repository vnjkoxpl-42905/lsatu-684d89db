import { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  GitBranch,
  AlignVerticalJustifyCenter,
  Square,
  SpellCheck,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TEMPLATES_BY_CATEGORY, type WhiteboardTemplate } from './templates';
import {
  readSelectedSingleText,
  replaceTextOnElement,
  type SelectedTextRef,
} from './templates/spellCheck';
import { cn } from '@/lib/utils';

// Item C — palette docked to the right of the canvas, inside both
// TeacherSmartboard and FloatingWhiteboard. Click a template chip to
// insert it; the build receives the currently-selected text element (if
// any) so smart conditionals can auto-fill from a highlighted sentence.

export interface ExcalidrawTemplateApi {
  getSceneElements: () => unknown[];
  getAppState: () => unknown;
  updateScene: (data: { elements: unknown[] }) => void;
}

interface TemplatePaletteProps {
  getApi: () => ExcalidrawTemplateApi | null;
  className?: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  conditional: GitBranch,
  argument: AlignVerticalJustifyCenter,
  blank: Square,
  utility: Sparkles,
};

const CATEGORY_LABELS: Record<string, string> = {
  conditional: 'Conditionals',
  argument: 'Argument structure',
  blank: 'Blanks',
};

export function TemplatePalette({ getApi, className }: TemplatePaletteProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    conditional: true,
    argument: true,
    blank: false,
  });
  const [spellSelection, setSpellSelection] = useState<SelectedTextRef | null>(null);
  const [canSpell, setCanSpell] = useState(false);

  // Poll the API for selection state (Excalidraw doesn't expose a
  // selection-change subscription, so we sample lightly).
  useEffect(() => {
    const interval = setInterval(() => {
      const api = getApi();
      if (!api) {
        setCanSpell(false);
        return;
      }
      const sel = readSelectedSingleText(api);
      setCanSpell(!!sel);
    }, 400);
    return () => clearInterval(interval);
  }, [getApi]);

  const getViewportCenter = (api: ExcalidrawTemplateApi): { x: number; y: number } => {
    try {
      const state = api.getAppState() as {
        scrollX?: number;
        scrollY?: number;
        width?: number;
        height?: number;
        zoom?: { value?: number } | number;
      };
      const zoom =
        typeof state.zoom === 'number'
          ? state.zoom
          : (state.zoom?.value ?? 1);
      const w = (state.width ?? 800) / (zoom || 1);
      const h = (state.height ?? 600) / (zoom || 1);
      const cx = -(state.scrollX ?? 0) + w / 2;
      const cy = -(state.scrollY ?? 0) + h / 2;
      return { x: cx, y: cy };
    } catch {
      return { x: 0, y: 0 };
    }
  };

  const insert = useCallback(
    (template: WhiteboardTemplate) => {
      const api = getApi();
      if (!api) return;
      const selectedRef = readSelectedSingleText(api);
      const origin = getViewportCenter(api);
      const result = template.build({
        origin,
        selectedText: selectedRef?.text ?? null,
      });
      const current = api.getSceneElements();
      let next = [...current];
      if (result.replaceElementIds && result.replaceElementIds.length > 0) {
        const ids = new Set(result.replaceElementIds);
        next = next.filter((e) => !ids.has((e as { id: string }).id));
      }
      next = [...next, ...result.elements];
      api.updateScene({ elements: next });
    },
    [getApi],
  );

  const openSpell = () => {
    const api = getApi();
    if (!api) return;
    const ref = readSelectedSingleText(api);
    if (!ref) return;
    setSpellSelection(ref);
  };

  return (
    <>
      <aside
        className={cn(
          'shrink-0 w-[220px] border-l border-zinc-800 bg-zinc-950 overflow-y-auto',
          className,
        )}
      >
        <div className="px-3 py-2 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Templates
          </div>
        </div>

        {(['conditional', 'argument', 'blank'] as const).map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const items = TEMPLATES_BY_CATEGORY[cat] ?? [];
          const expanded = openSections[cat];
          return (
            <section key={cat} className="border-b border-zinc-800/60">
              <button
                type="button"
                onClick={() =>
                  setOpenSections((s) => ({ ...s, [cat]: !s[cat] }))
                }
                className="w-full px-3 py-2 flex items-center justify-between text-left text-xs text-zinc-300 hover:bg-zinc-900"
              >
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Icon className="w-3.5 h-3.5 text-zinc-500" />
                  {CATEGORY_LABELS[cat]}
                </span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 text-zinc-500 transition-transform',
                    expanded ? 'rotate-180' : '',
                  )}
                />
              </button>
              {expanded && (
                <div className="px-2 pb-2 space-y-1">
                  {items.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => insert(t)}
                      title={t.description ?? t.label}
                      className="w-full text-left px-2 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
                    >
                      <div className="text-[12px] font-medium text-zinc-100">{t.label}</div>
                      {t.description && (
                        <div className="text-[10px] text-zinc-500 line-clamp-2">
                          {t.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        <section className="border-b border-zinc-800/60">
          <div className="px-3 py-2 text-xs text-zinc-300 font-medium inline-flex items-center gap-1.5">
            <SpellCheck className="w-3.5 h-3.5 text-zinc-500" />
            Spell check
          </div>
          <div className="px-2 pb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              disabled={!canSpell}
              onClick={openSpell}
              title={
                canSpell
                  ? 'Open the selected text in a spellcheck editor'
                  : 'Select a single text element to enable spell check'
              }
            >
              <SpellCheck className="w-3.5 h-3.5" />
              {canSpell ? 'Check selection' : 'Select a text element'}
            </Button>
          </div>
        </section>
      </aside>

      <SpellCheckDialog
        selection={spellSelection}
        onClose={() => setSpellSelection(null)}
        onConfirm={(next) => {
          const api = getApi();
          if (api && spellSelection) {
            replaceTextOnElement(api, spellSelection.elementId, next);
          }
          setSpellSelection(null);
        }}
      />
    </>
  );
}

function SpellCheckDialog({
  selection,
  onClose,
  onConfirm,
}: {
  selection: SelectedTextRef | null;
  onClose: () => void;
  onConfirm: (next: string) => void;
}) {
  const [draft, setDraft] = useState('');
  useEffect(() => {
    setDraft(selection?.text ?? '');
  }, [selection]);

  return (
    <Dialog open={!!selection} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Spell check</DialogTitle>
        </DialogHeader>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck
          autoFocus
          rows={5}
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 text-zinc-100 text-sm px-3 py-2 leading-relaxed"
        />
        <div className="text-[11px] text-zinc-500">
          Right-click words with red underlines for browser suggestions.
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(draft)}>Replace text</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

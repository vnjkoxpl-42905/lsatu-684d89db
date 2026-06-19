import type { ReactNode } from 'react';
import { Bold, ChevronDown, Cloud, Italic, List, ListOrdered, Printer, Redo2, Share2, Undo2, X } from 'lucide-react';
import { DraftEditor } from './DraftEditor';

export function DeskCanvasPanel({
  value,
  onChange,
  onClose,
  canUseAi,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  canUseAi: boolean;
}) {
  return (
    <section
      aria-label="Collaborative Workspace"
      className="flex min-h-[560px] min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#1d1d1d] text-zinc-100 shadow-[0_28px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <div className="flex min-h-14 items-center gap-3 border-b border-white/8 px-5 text-sm text-zinc-300">
        <h2 className="w-56 shrink-0 truncate font-medium">Collaborative Workspace</h2>
        <div className="hidden items-center gap-1 text-zinc-300 md:flex">
          <ToolbarButton label="Cloud status">
            <Cloud className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton label="Undo">
            <Undo2 className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton label="Redo">
            <Redo2 className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <span className="mx-2 h-6 w-px bg-white/16" />
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/8"
          >
            Heading 1
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.7} />
          </button>
          <span className="mx-2 h-6 w-px bg-white/16" />
          <ToolbarButton label="Bold">
            <Bold className="h-4 w-4" strokeWidth={2.1} />
          </ToolbarButton>
          <ToolbarButton label="Italic">
            <Italic className="h-4 w-4" strokeWidth={2.1} />
          </ToolbarButton>
          <ToolbarButton label="Bulleted list">
            <List className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton label="Numbered list">
            <ListOrdered className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
        </div>
        <div className="ml-auto hidden items-center gap-1 md:flex">
          <ToolbarButton label="Print">
            <Printer className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton label="Share">
            <Share2 className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <button
            type="button"
            className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full bg-[#126295] px-3 text-xs font-semibold text-white transition hover:bg-[#1774ad]"
          >
            Create
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close canvas"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <DraftEditor
          value={value}
          onChange={onChange}
          canUseAi={canUseAi}
          ariaLabel="Collaborative canvas document"
          placeholder="Paste or draft here..."
          textareaClassName="min-h-[430px] resize-none border-0 bg-transparent p-0 text-[16px] leading-7 text-zinc-100 shadow-none outline-none placeholder:text-zinc-500 focus:border-transparent"
        />
      </div>
    </section>
  );
}

function ToolbarButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-zinc-400 transition hover:bg-white/8 hover:text-white"
    >
      {children}
    </button>
  );
}

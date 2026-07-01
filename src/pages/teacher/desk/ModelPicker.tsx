import { Check, ChevronDown, Sparkles, Wand2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ModelOption {
  id: string;
  label: string;
  short: string;
  provider: 'Auto' | 'Google — Gemini';
  hint: string;
}

export const AUTO_MODEL_ID = 'auto';

// Only real Google Gemini models the public API accepts with a GEMINI_API_KEY.
// The gemini-proxy edge function normalises any legacy id into one of these.
export const AVAILABLE_MODELS: ModelOption[] = [
  { id: AUTO_MODEL_ID, short: 'Auto', label: 'Auto', provider: 'Auto', hint: 'picks the cheapest Gemini model that fits the task' },
  { id: 'google/gemini-2.5-pro', short: 'Gemini 2.5 Pro', label: 'Gemini 2.5 Pro', provider: 'Google — Gemini', hint: 'strongest reasoning' },
  { id: 'google/gemini-2.5-flash', short: 'Gemini 2.5 Flash', label: 'Gemini 2.5 Flash', provider: 'Google — Gemini', hint: 'balanced default · best for tools' },
  { id: 'google/gemini-2.5-flash-lite', short: 'Gemini 2.5 Lite', label: 'Gemini 2.5 Flash Lite', provider: 'Google — Gemini', hint: 'fastest · cheapest' },
];

export const DEFAULT_MODEL_ID = AUTO_MODEL_ID;

export function getModelOption(id: string | null | undefined): ModelOption {
  return AVAILABLE_MODELS.find((m) => m.id === id) ?? AVAILABLE_MODELS[0];
}

const PROVIDERS: ModelOption['provider'][] = ['Auto', 'Google — Gemini'];

export function ModelPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const active = getModelOption(value);
  const isAuto = active.id === AUTO_MODEL_ID;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={isAuto ? 'Auto — picks the cheapest capable model' : active.id}
          aria-label={`Model: ${active.label}`}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/60 px-2.5 text-[12px] font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {isAuto ? (
            <Wand2 className="h-3.5 w-3.5 text-[#c8841f]" strokeWidth={1.9} />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.8} />
          )}
          <span className="max-w-[120px] truncate">{active.short}</span>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.8} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-72 max-h-[60vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-200"
      >
        {PROVIDERS.map((provider, idx) => (
          <div key={provider}>
            {idx > 0 ? <DropdownMenuSeparator className="bg-zinc-800" /> : null}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-zinc-500">
              {provider}
            </DropdownMenuLabel>
            {AVAILABLE_MODELS.filter((m) => m.provider === provider).map((m) => {
              const isActive = m.id === active.id;
              return (
                <DropdownMenuItem
                  key={m.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    onChange(m.id);
                  }}
                  className={cn(
                    'flex items-start gap-2 rounded-lg px-2 py-1.5 text-[13px] focus:bg-zinc-800',
                    isActive && 'bg-zinc-800/60',
                  )}
                >
                  <Check
                    className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', isActive ? 'text-white' : 'text-transparent')}
                    strokeWidth={2}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-zinc-100">{m.label}</div>
                    <div className="truncate text-[11px] text-zinc-500">{m.hint}</div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

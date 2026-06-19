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
  provider: 'Auto' | 'Google — Gemini' | 'OpenAI — ChatGPT';
  hint: string;
}

export const AUTO_MODEL_ID = 'auto';

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: AUTO_MODEL_ID, short: 'Auto', label: 'Auto', provider: 'Auto', hint: 'picks the cheapest model that can do the job' },
  // Gemini
  { id: 'google/gemini-3-flash-preview', short: 'Gemini 3 Flash', label: 'Gemini 3 Flash (preview)', provider: 'Google — Gemini', hint: 'fast default' },
  { id: 'google/gemini-3.1-flash-lite', short: 'Gemini 3.1 Lite', label: 'Gemini 3.1 Flash Lite', provider: 'Google — Gemini', hint: 'cheapest' },
  { id: 'google/gemini-3.5-flash', short: 'Gemini 3.5 Flash', label: 'Gemini 3.5 Flash', provider: 'Google — Gemini', hint: 'fast + strong' },
  { id: 'google/gemini-3.1-pro-preview', short: 'Gemini 3.1 Pro', label: 'Gemini 3.1 Pro (preview)', provider: 'Google — Gemini', hint: 'smartest preview' },
  { id: 'google/gemini-2.5-pro', short: 'Gemini 2.5 Pro', label: 'Gemini 2.5 Pro', provider: 'Google — Gemini', hint: 'strong reasoning' },
  { id: 'google/gemini-2.5-flash', short: 'Gemini 2.5 Flash', label: 'Gemini 2.5 Flash', provider: 'Google — Gemini', hint: 'balanced' },
  { id: 'google/gemini-2.5-flash-lite', short: 'Gemini 2.5 Lite', label: 'Gemini 2.5 Flash Lite', provider: 'Google — Gemini', hint: 'cheap · fast' },
  // OpenAI
  { id: 'openai/gpt-5', short: 'GPT-5', label: 'GPT-5', provider: 'OpenAI — ChatGPT', hint: 'all-rounder' },
  { id: 'openai/gpt-5-mini', short: 'GPT-5 Mini', label: 'GPT-5 Mini', provider: 'OpenAI — ChatGPT', hint: 'balanced' },
  { id: 'openai/gpt-5-nano', short: 'GPT-5 Nano', label: 'GPT-5 Nano', provider: 'OpenAI — ChatGPT', hint: 'fastest · cheapest' },
  { id: 'openai/gpt-5.2', short: 'GPT-5.2', label: 'GPT-5.2', provider: 'OpenAI — ChatGPT', hint: 'enhanced reasoning' },
  { id: 'openai/gpt-5.4', short: 'GPT-5.4', label: 'GPT-5.4', provider: 'OpenAI — ChatGPT', hint: 'advanced reasoning' },
  { id: 'openai/gpt-5.4-mini', short: 'GPT-5.4 Mini', label: 'GPT-5.4 Mini', provider: 'OpenAI — ChatGPT', hint: 'balanced 5.4' },
  { id: 'openai/gpt-5.4-nano', short: 'GPT-5.4 Nano', label: 'GPT-5.4 Nano', provider: 'OpenAI — ChatGPT', hint: 'fast 5.4' },
  { id: 'openai/gpt-5.4-pro', short: 'GPT-5.4 Pro', label: 'GPT-5.4 Pro', provider: 'OpenAI — ChatGPT', hint: 'premium 5.4' },
  { id: 'openai/gpt-5.5', short: 'GPT-5.5', label: 'GPT-5.5', provider: 'OpenAI — ChatGPT', hint: 'most capable' },
  { id: 'openai/gpt-5.5-pro', short: 'GPT-5.5 Pro', label: 'GPT-5.5 Pro', provider: 'OpenAI — ChatGPT', hint: 'premium' },
];

export const DEFAULT_MODEL_ID = AUTO_MODEL_ID;

export function getModelOption(id: string | null | undefined): ModelOption {
  return AVAILABLE_MODELS.find((m) => m.id === id) ?? AVAILABLE_MODELS[0];
}

const PROVIDERS: ModelOption['provider'][] = ['Auto', 'Google — Gemini', 'OpenAI — ChatGPT'];

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

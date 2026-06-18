import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, ChevronRight, History, Loader2, Lock, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOperatorChat, type OperatorToolResult } from '@/hooks/useOperatorChat';
import {
  buildPriorityChips,
  buildSeedCommand,
  buildTaskContext,
  approvedLabel,
  type DeskMode,
  type DeskTask,
  type PriorityChip,
} from './deskTasks';
import { DeskActionCard, type DeskCardStatus } from './DeskActionCard';
import { useGuidedDrillOptions, type ApproveOptions } from './useDeskActions';

export interface DeskSeedSignal {
  task: DeskTask;
  nonce: number;
}

interface DeskCard {
  id: string;
  task: DeskTask;
  status: DeskCardStatus;
  body: string;
  editing: boolean;
  drillId: string;
  dueAt: string;
  draftRowId?: string;
  error?: string;
}

const uid = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

interface CreatedDraft {
  id?: string;
  draft_markdown?: string;
  draft_type?: string;
  student_id?: string;
}

function findCreateDraft(results?: OperatorToolResult[]): CreatedDraft | undefined {
  const data = results?.find((r) => r.name === 'create_draft' && r.result?.ok)?.result?.data;
  return (data as { draft?: CreatedDraft } | undefined)?.draft;
}

/**
 * The center workbench: a graphite-styled assistant that is a task execution
 * console, not a general chat. At rest it leads with the next teacher move and
 * cross-mode priority chips; clicking one seeds a visible command and produces an
 * editable, approval-gated DeskActionCard. Reuses the operator engine.
 *
 * Honest about limits: in unauthenticated local preview the chat is disabled (no
 * failing Supabase invoke), mirroring the Assign-picker discipline.
 */
export function DeskAssistant({
  tasksByMode,
  nextTask,
  selectedTask,
  localPreview,
  loading,
  seedSignal,
  actions,
  onSelectTask,
}: {
  tasksByMode: Record<DeskMode, DeskTask[]>;
  nextTask: DeskTask | null;
  selectedTask: DeskTask | null;
  localPreview: boolean;
  loading: boolean;
  seedSignal: DeskSeedSignal | null;
  actions: {
    approve: (task: DeskTask, opts?: ApproveOptions) => Promise<void>;
    discard: (task: DeskTask, opts?: ApproveOptions) => Promise<void>;
  };
  onSelectTask: (task: DeskTask) => void;
}) {
  const navigate = useNavigate();
  const { messages, conversations, isLoading, error, sendMessage, newConversation, openConversation } =
    useOperatorChat();
  const [input, setInput] = useState('');
  const [cards, setCards] = useState<DeskCard[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSeedNonce = useRef<number>(seedSignal?.nonce ?? -1);
  const pendingCardRef = useRef<string | null>(null);
  const lastBoundMsgId = useRef<string | null>(null);

  const chips = useMemo(() => buildPriorityChips(tasksByMode), [tasksByMode]);
  const hasAssignCard = useMemo(
    () => cards.some((card) => card.task.sourceKind === 'assignment-gap' && card.status !== 'discarded'),
    [cards],
  );
  const { options: drillOptions, loading: drillsLoading } = useGuidedDrillOptions(hasAssignCard, localPreview);
  const empty = messages.length === 0 && cards.length === 0;

  const patchCard = useCallback((id: string, patch: Partial<DeskCard>) => {
    setCards((prev) => prev.map((card) => (card.id === id ? { ...card, ...patch } : card)));
  }, []);

  const seed = useCallback(
    (task: DeskTask) => {
      if (localPreview) return;
      onSelectTask(task);
      const id = uid();
      const awaitsAI = task.sourceKind === 'conversation' || task.sourceKind === 'assignment-gap';
      const card: DeskCard = {
        id,
        task,
        status: awaitsAI ? 'drafting' : 'ready',
        body: task.sourceKind === 'draft' ? task.editableText ?? '' : '',
        editing: false,
        drillId: '',
        dueAt: '',
      };
      setCards((prev) => [...prev, card]);
      if (awaitsAI) pendingCardRef.current = id;
      sendMessage(buildSeedCommand(task), buildTaskContext(task));
    },
    [localPreview, onSelectTask, sendMessage],
  );

  // Left-list clicks seed via a bumped nonce (chips seed directly).
  useEffect(() => {
    if (!seedSignal || seedSignal.nonce === lastSeedNonce.current) return;
    lastSeedNonce.current = seedSignal.nonce;
    seed(seedSignal.task);
  }, [seedSignal, seed]);

  // Bind a freshly completed assistant turn to the card that seeded it.
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant || lastAssistant.pending) return;
    if (lastAssistant.id === lastBoundMsgId.current) return;
    lastBoundMsgId.current = lastAssistant.id;
    const cardId = pendingCardRef.current;
    if (!cardId) return;
    pendingCardRef.current = null;
    const draft = findCreateDraft(lastAssistant.tool_results);
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? {
              ...card,
              status: 'ready',
              body: draft?.draft_markdown ?? card.body,
              draftRowId: draft?.id ?? card.draftRowId,
            }
          : card,
      ),
    );
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, cards]);

  const submit = () => {
    const text = input.trim();
    if (!text || localPreview || isLoading) return;
    setInput('');
    sendMessage(text);
  };

  const approveCard = useCallback(
    async (card: DeskCard) => {
      if (card.status !== 'ready' && card.status !== 'error') return; // idempotency guard
      patchCard(card.id, { status: 'working', error: undefined });
      try {
        await actions.approve(card.task, {
          body: card.body,
          drillId: card.drillId,
          dueAt: card.dueAt,
          drillTitle: drillOptions.find((d) => d.id === card.drillId)?.title,
          draftRowId: card.draftRowId,
        });
        patchCard(card.id, { status: 'done', editing: false });
        toast.success(approvedLabel(card.task));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Action failed';
        patchCard(card.id, { status: 'error', error: msg });
        toast.error(msg);
      }
    },
    [actions, drillOptions, patchCard],
  );

  const discardCard = useCallback(
    async (card: DeskCard) => {
      if (card.status === 'working' || card.status === 'done') return;
      patchCard(card.id, { status: 'working', error: undefined });
      try {
        await actions.discard(card.task, { draftRowId: card.draftRowId });
        patchCard(card.id, { status: 'discarded' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not discard';
        patchCard(card.id, { status: 'error', error: msg });
        toast.error(msg);
      }
    },
    [actions, patchCard],
  );

  const headerTitle = selectedTask ? selectedTask.title : 'Today queue';

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[860px] flex-col">
      {/* Header — names the selected task, or "Today queue" at rest. */}
      <div className="relative mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-black/45">
          <Sparkles className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{headerTitle}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="inline-flex items-center gap-1 border border-black/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55 transition hover:border-black/40 hover:text-black"
          >
            <History className="h-3.5 w-3.5" strokeWidth={1.5} /> Recent chats
          </button>
          {!empty && !localPreview ? (
            <button
              type="button"
              onClick={() => {
                newConversation();
                setCards([]);
                setInput('');
              }}
              className="inline-flex items-center gap-1 border border-black/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55 transition hover:border-black/40 hover:text-black"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> New
            </button>
          ) : null}
          {historyOpen ? (
            <>
              <button
                type="button"
                aria-label="Close recent chats"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setHistoryOpen(false)}
              />
              <div className="absolute right-0 top-8 z-20 max-h-[320px] w-[260px] overflow-y-auto border border-black/18 bg-[#d3d8db] shadow-lg">
                {localPreview ? (
                  <div className="px-3 py-3 text-xs text-black/50">Recent chats load on the live teacher desk.</div>
                ) : conversations.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-black/50">No past conversations yet.</div>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => {
                        openConversation(conversation.id);
                        setCards([]);
                        setHistoryOpen(false);
                      }}
                      className="block w-full truncate border-b border-black/8 px-3 py-2 text-left text-[13px] text-black/70 transition last:border-b-0 hover:bg-white/40"
                    >
                      {conversation.title || 'Conversation'}
                    </button>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => {
                    setHistoryOpen(false);
                    navigate('/teacher/command');
                  }}
                  className="block w-full border-t border-black/12 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55 transition hover:bg-white/40"
                >
                  Open full history
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {empty ? (
        <EmptyState
          nextTask={nextTask}
          chips={chips}
          loading={loading}
          localPreview={localPreview}
          onSeed={seed}
          onAsk={() => setInput('')}
        />
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 space-y-3 overflow-y-auto border border-black/12 bg-white/10 p-4"
        >
          {messages.map((m) => (
            <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] border px-3.5 py-2.5 text-sm leading-relaxed',
                  m.role === 'user' ? 'border-black bg-black text-white' : 'border-black/14 bg-white/55 text-[#11181c]',
                )}
              >
                {m.pending && !m.content ? (
                  <span className="inline-flex items-center gap-2 text-black/55">
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Drafting…
                  </span>
                ) : (
                  <div
                    className={cn(
                      'prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5',
                      m.role === 'user' ? 'prose-invert' : 'prose-neutral',
                    )}
                  >
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {cards.map((card) => (
            <DeskActionCard
              key={card.id}
              task={card.task}
              status={card.status}
              body={card.body}
              editing={card.editing}
              error={card.error}
              drillId={card.drillId}
              dueAt={card.dueAt}
              drillOptions={drillOptions}
              drillsLoading={drillsLoading}
              onBodyChange={(value) => patchCard(card.id, { body: value })}
              onToggleEdit={() => patchCard(card.id, { editing: !card.editing })}
              onStartBlank={() => patchCard(card.id, { body: '', editing: true })}
              onDrillChange={(value) => patchCard(card.id, { drillId: value })}
              onDueChange={(value) => patchCard(card.id, { dueAt: value })}
              onApprove={() => approveCard(card)}
              onDiscard={() => discardCard(card)}
            />
          ))}
        </div>
      )}

      {/* Command input — present, but never the hero. */}
      <div className="mt-3">
        {error ? (
          <div className="mb-2 border border-black/25 bg-white/30 px-3 py-1.5 text-xs text-[#11181c]">{error}</div>
        ) : null}
        <div
          className={cn(
            'flex items-center gap-2 border px-3 py-2',
            localPreview ? 'border-black/12 bg-white/10' : 'border-black/16 bg-white/22 focus-within:border-black',
          )}
        >
          {localPreview ? (
            <>
              <Lock className="h-4 w-4 shrink-0 text-black/40" strokeWidth={1.5} />
              <span className="truncate text-sm text-black/45">
                Assistant is read-only in local preview. It connects on the live teacher desk.
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-sm text-black/40">❯</span>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder="Type a command, or pick a priority above…"
                className="min-w-0 flex-1 bg-transparent font-mono text-sm text-[#11181c] outline-none placeholder:text-black/35"
              />
              <button
                type="button"
                onClick={submit}
                disabled={!input.trim() || isLoading}
                aria-label="Send command"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-black/16 text-black/60 transition hover:bg-black hover:text-white disabled:opacity-40"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  nextTask,
  chips,
  loading,
  localPreview,
  onSeed,
  onAsk,
}: {
  nextTask: DeskTask | null;
  chips: PriorityChip[];
  loading: boolean;
  localPreview: boolean;
  onSeed: (task: DeskTask) => void;
  onAsk: () => void;
}) {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
      {/* Next move — the single highest-priority task across modes. */}
      <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">Next move</div>
      {loading ? (
        <div className="mt-2 flex items-center gap-2 border border-black/12 bg-white/15 px-4 py-4 text-sm text-black/50">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Ranking today’s queue…
        </div>
      ) : nextTask ? (
        <button
          type="button"
          onClick={() => onSeed(nextTask)}
          disabled={localPreview}
          className="mt-2 w-full border border-black/18 bg-white/25 px-4 py-3.5 text-left transition hover:border-black disabled:cursor-default disabled:hover:border-black/18"
        >
          <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">
            <span>{nextTask.verb}</span>
            <span className="tabular-nums">{nextTask.timing}</span>
          </div>
          <div className="mt-1 text-base font-semibold tracking-tight">{nextTask.title}</div>
          <div className="mt-0.5 line-clamp-2 text-sm text-black/55">{nextTask.preview}</div>
          {!localPreview ? (
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-black/60">
              Draft this <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </div>
          ) : null}
        </button>
      ) : (
        <div className="mt-2 border border-dashed border-black/18 bg-white/12 px-4 py-4 text-sm text-black/50">
          The queue is clear. Nothing needs a teacher move right now.
        </div>
      )}

      {/* Priority chips — top cross-mode actions + a freeform Ask. */}
      {chips.length > 0 ? (
        <>
          <div className="mt-6 text-[10px] uppercase tracking-[0.2em] text-black/40">Priorities</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.map((chip, index) => {
              const isAsk = chip.task === null;
              const prime = index === 0 && !isAsk;
              return (
                <button
                  key={chip.id}
                  type="button"
                  disabled={localPreview && !isAsk}
                  onClick={() => {
                    if (isAsk) {
                      onAsk();
                      return;
                    }
                    if (chip.task) onSeed(chip.task);
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 border px-3 py-2 text-[13px] font-semibold transition',
                    prime
                      ? 'border-black bg-black text-white hover:bg-black/85'
                      : 'border-black/16 bg-white/30 text-[#11181c] hover:border-black/40',
                    localPreview && !isAsk ? 'opacity-50' : '',
                  )}
                >
                  <span
                    className={cn(
                      'text-[9px] font-bold uppercase tracking-[0.14em]',
                      prime ? 'text-white/60' : 'text-black/45',
                    )}
                  >
                    {chip.kicker}
                  </span>
                  {chip.label}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {localPreview ? (
        <p className="mt-5 text-xs leading-5 text-black/45">
          Preview data. Priorities are real-shaped, but the assistant runs only on the live teacher desk.
        </p>
      ) : (
        <p className="mt-auto pt-5 text-xs leading-5 text-black/40">
          Pick a priority to draft an approval card, or type a command below.
        </p>
      )}
    </div>
  );
}

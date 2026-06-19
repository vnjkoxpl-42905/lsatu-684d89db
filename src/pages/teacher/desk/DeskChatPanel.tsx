import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Sparkles } from 'lucide-react';
import { useOperatorChatContext } from '@/components/teacher/ai-ta/OperatorChatProvider';
import { cn } from '@/lib/utils';
import { AssistantComposer } from './AssistantComposer';
import { ImageLightbox } from './ImageLightbox';
import { DraftReplyCard, type DraftReplyData } from './DraftReplyCard';
import { DeskCanvasPanel } from './DeskCanvasPanel';
import type { OperatorImage, OperatorToolResult } from '@/hooks/useOperatorChat';

const STARTER_CANVAS = `# Collaborative Workspace

Welcome to your collaborative canvas. This space is designed for us to work together on your writing, brainstorming, planning, or analysis.

## How We Can Use This Space

- **Writing & Editing:** Paste an essay, article, story, or professional email here. I can provide constructive feedback, proofread, or help you polish your ideas while preserving your authentic voice.
- **Brainstorming:** Map out ideas, outline a project, or draft a plan.
- **Refining:** We can work iteratively. You make edits, and I will offer guidance, suggestions, and critique as we go.

## Get Started

To begin, simply reply in the chat and let me know what you'd like to do, or paste your text directly into this document.`;

/** Pull the renderable draft cards out of an assistant turn's tool results. */
function draftsFromToolResults(toolResults?: OperatorToolResult[]): DraftReplyData[] {
  if (!toolResults?.length) return [];
  return toolResults
    .filter((tr) => tr.name === 'create_draft' && tr.result?.ok)
    .map((tr) => (tr.result?.data as { draft?: DraftReplyData })?.draft)
    .filter((d): d is DraftReplyData => !!d && typeof d.draft_markdown === 'string');
}

/**
 * Center chat surface for the Teacher Desk. Light "instrument-panel" transcript
 * (not the dark AI TA page) plus the existing AssistantComposer. Reads the
 * shared OperatorChat session, so opening a saved chat from the left rail loads
 * its transcript here.
 */
export function DeskChatPanel({ localPreview }: { localPreview: boolean }) {
  const { messages, isLoading, error, sendMessage } = useOperatorChatContext();
  const [input, setInput] = useState('');
  const [previewImage, setPreviewImage] = useState<OperatorImage | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasBody, setCanvasBody] = useState(STARTER_CANVAS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const empty = messages.length === 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = (text: string, context?: Record<string, unknown>) => {
    if (!text.trim() || localPreview || isLoading) return;
    sendMessage(text, context);
  };

  const submit = (sources?: import('./AssistantComposer').ComposerSubmitSources) => {
    const text = input.trim();
    const images = sources?.images ?? [];
    if (!text && images.length === 0) return;
    if (localPreview || isLoading) return;
    setInput('');
    const parts = text ? [text] : [];
    if (sources?.labels.length) {
      parts.push(`[Attached context: ${sources.labels.join(', ')}]`);
    }
    if (sources?.drive.length) {
      const drive = sources.drive.map((f) => `${f.name} (${f.url})`).join(', ');
      parts.push(`[Google Drive files: ${drive}]`);
    }

    const context: Record<string, unknown> = {};
    if (sources?.driveConnector) context.driveConnector = true;
    if (sources?.gmailConnector) context.gmailConnector = true;
    if (sources?.calendarConnector) context.calendarConnector = true;
    sendMessage(
      parts.join('\n\n'),
      Object.keys(context).length ? context : undefined,
      images.length ? images : undefined,
    );
  };

  return (
    <div
      className={cn(
        'flex w-full flex-col lg:h-full lg:min-h-0',
        canvasOpen ? 'max-w-[1440px] gap-5 xl:flex-row' : 'max-w-[680px]',
      )}
    >
      <ImageLightbox
        src={previewImage?.dataUrl ?? null}
        alt={previewImage?.name ?? ''}
        open={previewImage !== null}
        onOpenChange={(next) => {
          if (!next) setPreviewImage(null);
        }}
      />
      <div className={cn('flex min-h-0 min-w-0 flex-col', canvasOpen ? 'xl:w-[430px] xl:shrink-0' : 'flex-1')}>
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-1 py-5"
        >
          {empty ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04]">
                <Sparkles className="h-5 w-5 text-[#c8841f]" strokeWidth={1.6} />
              </span>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">What can I help you get done?</h2>
              <p className="mt-1 max-w-sm text-sm leading-6 text-black/52">
                Draft replies, plan a student's next work, or summarize a session. Saved chats stay in the left rail to
                return to.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const drafts = message.role === 'assistant' ? draftsFromToolResults(message.tool_results) : [];
                const showBubble = !!message.content || !!message.images?.length || !!message.pending;
                return (
                  <div
                    key={message.id}
                    className={cn('flex flex-col gap-2.5', message.role === 'user' ? 'items-end' : 'items-start')}
                  >
                    {showBubble ? (
                      <div
                        className={cn(
                          'max-w-[88%] px-3.5 py-2.5 text-sm leading-relaxed',
                          message.role === 'user'
                            ? 'bg-[#c8841f]/12 text-black/80'
                            : 'bg-white/70 text-black/80',
                        )}
                      >
                        {message.images?.length ? (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {message.images.map((img, index) => (
                              <button
                                key={`${message.id}-img-${index}`}
                                type="button"
                                onClick={() => setPreviewImage(img)}
                                aria-label={`Preview ${img.name}`}
                                className="block overflow-hidden rounded-md border border-black/15"
                              >
                                <img
                                  src={img.dataUrl}
                                  alt={img.name}
                                  className="h-24 w-24 object-cover transition hover:opacity-90"
                                />
                              </button>
                            ))}
                          </div>
                        ) : null}
                        {message.pending && !message.content ? (
                          <Loader2 className="h-4 w-4 animate-spin text-black/40" />
                        ) : message.content ? (
                          <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {drafts.map((draft, index) => (
                      <DraftReplyCard
                        key={draft.id ?? `${message.id}-draft-${index}`}
                        draft={draft}
                        localPreview={localPreview}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-2 border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-700">{error}</div>
        ) : null}

        <AssistantComposer
          value={input}
          onChange={setInput}
          onSubmit={submit}
          loading={isLoading}
          disabled={localPreview}
          onUtilityCommand={send}
          onOpenCanvas={() => setCanvasOpen(true)}
          readOnlyMessage={
            localPreview ? 'Assistant is read-only in local preview. It connects on the live teacher desk.' : undefined
          }
          placeholder="Ask the assistant anything..."
        />
      </div>

      {canvasOpen ? (
        <DeskCanvasPanel
          value={canvasBody}
          onChange={setCanvasBody}
          canUseAi={!localPreview}
          onClose={() => setCanvasOpen(false)}
        />
      ) : null}
    </div>
  );
}

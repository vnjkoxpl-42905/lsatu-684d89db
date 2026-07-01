import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ChevronRight,
  CopyPlus,
  Image as ImageIcon,
  Library,
  Loader2,
  Paperclip,
  Plus,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { GoogleDriveIcon } from '@/components/icons/GoogleDriveIcon';
import { GmailIcon } from '@/components/icons/GmailIcon';
import { GoogleCalendarIcon } from '@/components/icons/GoogleCalendarIcon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { DriveBrowserDialog } from './DriveBrowserDialog';
import { ImageLightbox } from './ImageLightbox';
import { ModelPicker, DEFAULT_MODEL_ID, AVAILABLE_MODELS } from './ModelPicker';

const MODEL_STORAGE_KEY = 'desk.assistant.model';

interface SeedAction {
  label: string;
  onClick: () => void;
}

type SourceKind = 'file' | 'drive' | 'material' | 'driveConnector' | 'gmailConnector' | 'calendarConnector';

export interface DriveFileRef {
  fileId: string;
  name: string;
  mimeType: string;
  url: string;
}

interface AttachedSource {
  id: string;
  kind: SourceKind;
  label: string;
  drive?: DriveFileRef;
}

export interface ComposerImage {
  id: string;
  name: string;
  /** data URL (data:image/...;base64,...). */
  dataUrl: string;
}

export interface ComposerSubmitSources {
  labels: string[];
  drive: DriveFileRef[];
  images: ComposerImage[];
  driveConnector: boolean;
  gmailConnector: boolean;
  calendarConnector: boolean;
  model: string;
}

const DRIVE_CONNECTOR_ID = 'driveConnector:google-drive';
const GMAIL_CONNECTOR_ID = 'gmailConnector:gmail';
const CALENDAR_CONNECTOR_ID = 'calendarConnector:google-calendar';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PROMPT_POLISH_INSTRUCTION =
  'Clean up this prompt only. Fix spelling, grammar, and clarity while preserving the writer’s direct, casual intent. Do not answer the prompt. Do not add new sections, constraints, examples, or structure. Return only the improved prompt text.';

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}


export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  loading,
  disabled,
  placeholder,
  onUtilityCommand,
  onOpenCanvas,
  canvasOpen,
  onCloseCanvas,
  readOnlyMessage,
  focusSignal,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (sources?: ComposerSubmitSources) => void;
  loading: boolean;
  disabled: boolean;
  placeholder: string;
  seedAction?: SeedAction;
  onUtilityCommand?: (command: string) => void;
  onOpenCanvas?: () => void;
  canvasOpen?: boolean;
  onCloseCanvas?: () => void;
  readOnlyMessage?: string;
  focusSignal?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [attachedSources, setAttachedSources] = useState<AttachedSource[]>([]);
  const [images, setImages] = useState<ComposerImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<ComposerImage | null>(null);
  const [driveBrowserOpen, setDriveBrowserOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_MODEL_ID;
    const saved = window.localStorage.getItem(MODEL_STORAGE_KEY);
    return saved && AVAILABLE_MODELS.some((m) => m.id === saved) ? saved : DEFAULT_MODEL_ID;
  });
  const handleModelChange = useCallback((id: string) => {
    setSelectedModel(id);
    if (typeof window !== 'undefined') window.localStorage.setItem(MODEL_STORAGE_KEY, id);
  }, []);
  const [promptHelperOpen, setPromptHelperOpen] = useState(false);
  const [promptHelperText, setPromptHelperText] = useState('');
  const [polishingPrompt, setPolishingPrompt] = useState(false);
  const [promptPolishError, setPromptPolishError] = useState<string | null>(null);
  const [promptPreview, setPromptPreview] = useState<{ original: string; polished: string } | null>(null);
  const canSubmit = (value.trim().length > 0 || images.length > 0) && !loading && !disabled;
  const canUseAssistantActions = !loading && !disabled && Boolean(onUtilityCommand);
  const canOpenCanvas = !loading && Boolean(onOpenCanvas);
  const canPolishPrompt = !loading && !disabled && !polishingPrompt;

  const addImageFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled || loading) return;
      const incoming = Array.from(files).filter((file) => file.type.startsWith('image/'));
      if (incoming.length === 0) return;
      setImageError(null);

      let tooLarge = false;
      const accepted: ComposerImage[] = [];
      for (const file of incoming) {
        if (file.size > MAX_IMAGE_BYTES) {
          tooLarge = true;
          continue;
        }
        try {
          const dataUrl = await readAsDataUrl(file);
          accepted.push({
            id: `${file.name}-${file.size}-${file.lastModified}`,
            name: file.name || 'screenshot.png',
            dataUrl,
          });
        } catch (err) {
          setImageError(err instanceof Error ? err.message : 'Could not read image');
        }
      }

      let overflow = false;
      setImages((current) => {
        const merged = [...current];
        for (const img of accepted) {
          if (merged.some((m) => m.id === img.id)) continue;
          if (merged.length >= MAX_IMAGES) {
            overflow = true;
            break;
          }
          merged.push(img);
        }
        return merged;
      });
      if (tooLarge) setImageError('Each image must be under 5MB.');
      else if (overflow) setImageError(`You can attach up to ${MAX_IMAGES} images.`);
    },
    [disabled, loading],
  );

  const removeImage = (id: string) => {
    setImages((current) => current.filter((img) => img.id !== id));
    setImageError(null);
  };

  const openImagePicker = () => {
    if (disabled || loading) return;
    setActionMenuOpen(false);
    setMaterialOpen(false);
    fileInputRef.current?.click();
  };

  const adjustHeight = useCallback((reset?: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = '44px';
    if (reset) return;
    textarea.style.height = `${Math.max(44, Math.min(textarea.scrollHeight, 132))}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight, value]);

  useEffect(() => {
    if (!focusSignal) return;
    textareaRef.current?.focus();
    adjustHeight();
  }, [adjustHeight, focusSignal]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);

  const submit = () => {
    if (!canSubmit) return;
    const connectorKinds: SourceKind[] = ['drive', 'driveConnector', 'gmailConnector', 'calendarConnector'];
    const labels = attachedSources
      .filter((s) => !connectorKinds.includes(s.kind))
      .map((s) => s.label);
    const drive = attachedSources
      .filter((s): s is AttachedSource & { drive: DriveFileRef } => s.kind === 'drive' && !!s.drive)
      .map((s) => s.drive);
    const driveConnector = attachedSources.some((s) => s.kind === 'driveConnector');
    const gmailConnector = attachedSources.some((s) => s.kind === 'gmailConnector');
    const calendarConnector = attachedSources.some((s) => s.kind === 'calendarConnector');
    const hasAny =
      labels.length > 0 || drive.length > 0 || images.length > 0 || driveConnector || gmailConnector || calendarConnector;
    onSubmit(hasAny
      ? { labels, drive, images, driveConnector, gmailConnector, calendarConnector, model: selectedModel }
      : { labels: [], drive: [], images: [], driveConnector: false, gmailConnector: false, calendarConnector: false, model: selectedModel });
    setAttachedSources([]);
    setImages([]);
    setImageError(null);
    requestAnimationFrame(() => adjustHeight(true));
  };


  const runUtility = (command: string) => {
    if (!canUseAssistantActions) return;
    onUtilityCommand?.(command);
  };

  const polishPromptText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPromptPolishError(null);
    setPolishingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('polish-message', {
        body: { text: trimmed, instruction: PROMPT_POLISH_INSTRUCTION },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const polished = typeof data?.polished === 'string' ? data.polished.trim() : '';
      if (!polished) throw new Error('The assistant returned an empty prompt.');
      setPromptPreview({ original: trimmed, polished });
      setPromptHelperOpen(false);
    } catch (error) {
      setPromptPolishError(error instanceof Error ? error.message : 'Could not improve the prompt.');
    } finally {
      setPolishingPrompt(false);
    }
  };

  const improvePrompt = () => {
    if (!canPolishPrompt) return;
    const trimmed = value.trim();
    setActionMenuOpen(false);
    setMaterialOpen(false);
    if (!trimmed) {
      setPromptHelperText('');
      setPromptPolishError(null);
      setPromptHelperOpen(true);
      return;
    }
    void polishPromptText(trimmed);
  };

  const acceptPromptPreview = () => {
    if (!promptPreview) return;
    onChange(promptPreview.polished);
    setPromptPreview(null);
    requestAnimationFrame(() => adjustHeight());
  };

  const openCanvas = () => {
    if (!canOpenCanvas) return;
    setActionMenuOpen(false);
    setMaterialOpen(false);
    onOpenCanvas?.();
  };

  const closeCanvas = () => {
    setActionMenuOpen(false);
    setMaterialOpen(false);
    onCloseCanvas?.();
  };

  const addSource = (kind: SourceKind, label: string) => {
    if (disabled || loading) return;
    setActionMenuOpen(false);
    setMaterialOpen(false);
    const id = `${kind}:${label}`;
    setAttachedSources((current) =>
      current.some((source) => source.id === id) ? current : [...current, { id, kind, label }],
    );
  };

  const addDriveFiles = (files: DriveFileRef[]) => {
    if (!files.length) return;
    setAttachedSources((current) => {
      const next = [...current];
      for (const f of files) {
        const id = `drive:${f.fileId}`;
        if (next.some((s) => s.id === id)) continue;
        next.push({
          id,
          kind: 'drive',
          label: f.name,
          drive: f,
        });
      }
      return next;
    });
  };

  const openDrivePicker = () => {
    if (disabled || loading) return;
    setActionMenuOpen(false);
    setMaterialOpen(false);
    setDriveBrowserOpen(true);
  };

  const removeSource = (id: string) => {
    setAttachedSources((current) => current.filter((source) => source.id !== id));
  };

  const toggleConnector = (id: string, kind: SourceKind, label: string) => {
    if (disabled || loading) return;
    setActionMenuOpen(false);
    setMaterialOpen(false);
    setAttachedSources((current) => {
      if (current.some((s) => s.id === id)) {
        return current.filter((s) => s.id !== id);
      }
      return [...current, { id, kind, label }];
    });
  };

  const driveConnectorActive = attachedSources.some((s) => s.id === DRIVE_CONNECTOR_ID);
  const gmailConnectorActive = attachedSources.some((s) => s.id === GMAIL_CONNECTOR_ID);
  const calendarConnectorActive = attachedSources.some((s) => s.id === CALENDAR_CONNECTOR_ID);


  return (
    <div className="mt-5 w-full">
      <DriveBrowserDialog open={driveBrowserOpen} onOpenChange={setDriveBrowserOpen} onAttach={addDriveFiles} />
      <ImageLightbox
        src={previewImage?.dataUrl ?? null}
        alt={previewImage?.name ?? ''}
        open={previewImage !== null}
        onOpenChange={(next) => {
          if (!next) setPreviewImage(null);
        }}
      />
      <Dialog open={promptHelperOpen} onOpenChange={(open) => !polishingPrompt && setPromptHelperOpen(open)}>
        <DialogContent className="max-w-lg border-white/10 bg-[#171717] text-white">
          <DialogHeader>
            <DialogTitle>Improve a prompt</DialogTitle>
            <DialogDescription className="text-white/65">
              Write the rough thing you want to ask. This will clean up the prompt without answering it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={promptHelperText}
            onChange={(event) => setPromptHelperText(event.target.value)}
            placeholder="rough prompt..."
            aria-label="Rough prompt"
            disabled={polishingPrompt}
            className="min-h-28 border-white/10 bg-[#101010] text-white placeholder:text-white/35 focus-visible:ring-white/20"
          />
          {promptPolishError ? <div className="text-sm text-red-300" role="alert">{promptPolishError}</div> : null}
          <DialogFooter className="gap-2 sm:space-x-0">
            <button
              type="button"
              onClick={() => setPromptHelperOpen(false)}
              disabled={polishingPrompt}
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 px-4 text-sm text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void polishPromptText(promptHelperText)}
              disabled={polishingPrompt || promptHelperText.trim().length === 0}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {polishingPrompt ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
              Improve prompt
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={promptPreview !== null} onOpenChange={(open) => !open && setPromptPreview(null)}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#171717] text-white">
          <DialogHeader>
            <DialogTitle>Review improved prompt</DialogTitle>
            <DialogDescription className="text-white/65">
              Accept to replace the text box, or reject to keep your original prompt.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <PromptPreviewBlock title="Original" text={promptPreview?.original ?? ''} />
            <PromptPreviewBlock title="Improved" text={promptPreview?.polished ?? ''} emphasized />
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <button
              type="button"
              onClick={() => setPromptPreview(null)}
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 px-4 text-sm text-white/75 transition hover:bg-white/10"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={acceptPromptPreview}
              className="inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Accept
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        aria-label="Attach screenshot"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) void addImageFiles(event.target.files);
          event.target.value = '';
        }}
      />
      {readOnlyMessage ? <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">{readOnlyMessage}</div> : null}
      <div
        className={cn(
          'relative rounded-2xl border border-neutral-700 bg-[#151515] shadow-[0_16px_40px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]',
          isDragging && 'border-white/70 ring-2 ring-white/30',
        )}
        onDragOver={(event) => {
          if (disabled || loading) return;
          if (Array.from(event.dataTransfer.types).includes('Files')) {
            event.preventDefault();
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          if (disabled || loading) return;
          if (event.dataTransfer.files?.length) {
            event.preventDefault();
            void addImageFiles(event.dataTransfer.files);
          }
          setIsDragging(false);
        }}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            adjustHeight();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData?.items ?? [])
              .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
              .map((item) => item.getAsFile())
              .filter((file): file is File => file !== null);
            if (files.length) {
              event.preventDefault();
              void addImageFiles(files);
            }
          }}
          aria-label="Assistant instructions"
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'min-h-[84px] w-full resize-none overflow-hidden border-0 bg-transparent px-4 py-4 text-[15px] leading-6 text-white shadow-none outline-none ring-0',
            'focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60',
            'placeholder:text-neutral-500',
          )}
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <div className="relative flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActionMenuOpen((current) => !current);
                setMaterialOpen(false);
              }}
              disabled={disabled || loading}
              aria-label="Open composer actions"
              aria-expanded={actionMenuOpen}
              aria-haspopup="menu"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#242424] text-zinc-200 transition hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Plus className="h-5 w-5" strokeWidth={2} />
            </button>
            {attachedSources.map((source) => (
              <SourceChip key={source.id} source={source} onRemove={() => removeSource(source.id)} disabled={disabled || loading} />
            ))}
            {images.map((img) => (
              <ImagePreviewChip
                key={img.id}
                image={img}
                onRemove={() => removeImage(img.id)}
                onPreview={() => setPreviewImage(img)}
                disabled={disabled || loading}
              />
            ))}
            {canvasOpen ? (
              <CanvasSourceChip
                onOpen={openCanvas}
                onRemove={closeCanvas}
                disabled={!canOpenCanvas}
                removeDisabled={!onCloseCanvas}
              />
            ) : null}
            {actionMenuOpen ? (
              <div
                role="menu"
                className="absolute bottom-11 left-0 z-20 w-72 overflow-hidden rounded-2xl border border-zinc-700 bg-[#303030] p-1.5 text-sm text-zinc-100 shadow-2xl"
              >
                <ComposerMenuItem
                  icon={<CopyPlus className="h-5 w-5" strokeWidth={1.8} />}
                  label="Canvas"
                  description="Open a collaborative workspace beside this chat"
                  onClick={openCanvas}
                  disabled={!canOpenCanvas}
                />
                <ComposerMenuItem
                  icon={<GoogleDriveIcon className="h-5 w-5" />}
                  label="Google Drive"
                  description="Use Drive as a context source for the next message"
                  onClick={() => toggleConnector(DRIVE_CONNECTOR_ID, 'driveConnector', 'Google Drive')}
                  disabled={disabled || loading}
                  trailing={
                    driveConnectorActive ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">On</span>
                    ) : undefined
                  }
                />
                <ComposerMenuItem
                  icon={<GmailIcon className="h-5 w-5" />}
                  label="Gmail"
                  description="Use Gmail as a context source for the next message"
                  onClick={() => toggleConnector(GMAIL_CONNECTOR_ID, 'gmailConnector', 'Gmail')}
                  disabled={disabled || loading}
                  trailing={
                    gmailConnectorActive ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">On</span>
                    ) : undefined
                  }
                />
                <ComposerMenuItem
                  icon={<GoogleCalendarIcon className="h-5 w-5" />}
                  label="Google Calendar"
                  description="Use Calendar as a context source for the next message"
                  onClick={() => toggleConnector(CALENDAR_CONNECTOR_ID, 'calendarConnector', 'Google Calendar')}
                  disabled={disabled || loading}
                  trailing={
                    calendarConnectorActive ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">On</span>
                    ) : undefined
                  }
                />
                <ComposerMenuItem
                  icon={<ImageIcon className="h-5 w-5" strokeWidth={1.8} />}
                  label="Attach screenshot"
                  description="Upload or paste an image for the assistant to read"
                  onClick={openImagePicker}
                  disabled={disabled || loading}
                />
                <ComposerMenuItem
                  icon={<GoogleDriveIcon className="h-5 w-5" />}
                  label="Attach from Drive"
                  description="Browse and pick files from your connected Drive"
                  onClick={openDrivePicker}
                  disabled={disabled || loading}
                />
                <ComposerMenuItem
                  icon={<Library className="h-5 w-5" strokeWidth={1.8} />}
                  label="Attach material"
                  onClick={() => setMaterialOpen((current) => !current)}
                  trailing={<ChevronRight className={cn('h-4 w-4 transition', materialOpen && 'rotate-90')} strokeWidth={1.9} />}
                />
                {materialOpen ? (
                  <div className="my-1 border-y border-white/10 py-1">
                    {MATERIAL_TYPES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        role="menuitem"
                        onClick={() => addSource('material', item)}
                        disabled={disabled || loading}
                        className="flex w-full items-center rounded-xl px-9 py-2 text-left text-[13px] text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}

              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ModelPicker value={selectedModel} onChange={handleModelChange} disabled={disabled || loading} />
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              aria-label="Send command"
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-800',
                canSubmit && 'border-white bg-white text-black hover:bg-white/90',
              )}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <ArrowUp className="h-4 w-4" strokeWidth={1.75} />}
            </button>
          </div>
        </div>
      </div>
      {imageError ? (
        <div className="mt-2 text-[11px] font-medium text-red-400" role="alert">
          {imageError}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <ActionChip
          icon={polishingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} /> : <Wand2 className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Improve writing"
          disabled={!canPolishPrompt}
          onClick={improvePrompt}
        />
        <ActionChip
          icon={<CopyPlus className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Canvas"
          disabled={!canOpenCanvas}
          onClick={openCanvas}
        />
        <ActionChip
          icon={<Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Recommend next work"
          disabled={!canUseAssistantActions}
          onClick={() => runUtility('Recommend the next useful LSAT work for this student, using this Teacher Desk context.')}
        />
      </div>
    </div>
  );
}

const MATERIAL_TYPES = [
  'Guided drill',
  'Bootcamp lesson/module',
  'Practice set',
  'PT / section assignment',
  'Reading or lesson page',
  'Homework/classroom item',
  'Recap or note',
  'Student upload/source material',
];

function SourceChipIcon({ kind }: { kind: SourceKind }) {
  if (kind === 'drive' || kind === 'driveConnector') return <GoogleDriveIcon className="h-3.5 w-3.5" />;
  if (kind === 'gmailConnector') return <GmailIcon className="h-3.5 w-3.5" />;
  if (kind === 'calendarConnector') return <GoogleCalendarIcon className="h-3.5 w-3.5" />;
  if (kind === 'file') return <Paperclip className="h-3.5 w-3.5" strokeWidth={1.9} />;
  return <Library className="h-3.5 w-3.5" strokeWidth={1.8} />;
}


function SourceChip({
  source,
  onRemove,
  disabled,
}: {
  source: AttachedSource;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full border border-zinc-700 bg-[#242424] py-1 pl-2.5 pr-1.5 text-[12px] text-zinc-200">
      <SourceChipIcon kind={source.kind} />
      <span className="truncate">{source.label}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${source.label}`}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </button>
    </span>
  );
}

function CanvasSourceChip({
  onOpen,
  onRemove,
  disabled,
  removeDisabled,
}: {
  onOpen: () => void;
  onRemove: () => void;
  disabled?: boolean;
  removeDisabled?: boolean;
}) {
  return (
    <span className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full bg-[#4a4a4a] py-1 pl-2.5 pr-1.5 text-[12px] font-medium text-zinc-100">
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        aria-label="Open canvas"
        className="inline-flex min-w-0 items-center gap-1.5 rounded-full transition hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
      >
        <CopyPlus className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
        <span className="truncate">Canvas</span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={removeDisabled}
        aria-label="Remove Canvas"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </button>
    </span>
  );
}

function ImagePreviewChip({
  image,
  onRemove,
  onPreview,
  disabled,
}: {
  image: ComposerImage;
  onRemove: () => void;
  onPreview: () => void;
  disabled?: boolean;
}) {
  return (
    <span className="group relative inline-flex h-12 w-12 overflow-hidden rounded-lg border border-zinc-700 bg-[#242424]">
      <button
        type="button"
        onClick={onPreview}
        aria-label={`Preview ${image.name}`}
        className="block h-full w-full"
      >
        <img src={image.dataUrl} alt={image.name} className="h-full w-full object-cover transition group-hover:opacity-80" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${image.name}`}
        className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-zinc-200 transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </button>
    </span>
  );
}

function PromptPreviewBlock({ title, text, emphasized }: { title: string; text: string; emphasized?: boolean }) {
  return (
    <div
      className={cn(
        'min-h-40 rounded-2xl border p-3',
        emphasized ? 'border-white/18 bg-white/[0.07]' : 'border-white/10 bg-black/20',
      )}
    >
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{title}</div>
      <div className="whitespace-pre-wrap text-sm leading-6 text-white/82">{text}</div>
    </div>
  );
}

function ComposerMenuItem({
  icon,
  label,
  description,
  trailing,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className="text-zinc-100">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span>{label}</span>
        {description ? <span className="text-[11px] text-zinc-400">{description}</span> : null}
      </span>
      {trailing}
    </button>
  );
}


function ActionChip({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-neutral-800 bg-[#151515] px-4 py-2 text-xs text-neutral-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-neutral-700 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-55"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

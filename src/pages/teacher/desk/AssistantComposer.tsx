import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ChevronRight,
  FileText,
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DriveBrowserDialog } from './DriveBrowserDialog';

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

export interface ComposerSubmitSources {
  labels: string[];
  drive: DriveFileRef[];
  driveConnector: boolean;
  gmailConnector: boolean;
  calendarConnector: boolean;
}

const DRIVE_CONNECTOR_ID = 'driveConnector:google-drive';
const GMAIL_CONNECTOR_ID = 'gmailConnector:gmail';
const CALENDAR_CONNECTOR_ID = 'calendarConnector:google-calendar';


export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  loading,
  disabled,
  placeholder,
  onUtilityCommand,
  readOnlyMessage,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (sources?: ComposerSubmitSources) => void;
  loading: boolean;
  disabled: boolean;
  placeholder: string;
  seedAction?: SeedAction;
  onUtilityCommand?: (command: string) => void;
  readOnlyMessage?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [attachedSources, setAttachedSources] = useState<AttachedSource[]>([]);
  const [driveBrowserOpen, setDriveBrowserOpen] = useState(false);
  const canSubmit = value.trim().length > 0 && !loading && !disabled;
  const canUseAssistantActions = !loading && !disabled && Boolean(onUtilityCommand);

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
    const hasAny = labels.length > 0 || drive.length > 0 || driveConnector || gmailConnector || calendarConnector;
    onSubmit(hasAny ? { labels, drive, driveConnector, gmailConnector, calendarConnector } : undefined);
    setAttachedSources([]);
    requestAnimationFrame(() => adjustHeight(true));
  };


  const runUtility = (command: string) => {
    if (!canUseAssistantActions) return;
    onUtilityCommand?.(command);
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

  const toggleDriveConnector = () => {
    if (disabled || loading) return;
    setActionMenuOpen(false);
    setMaterialOpen(false);
    setAttachedSources((current) => {
      if (current.some((s) => s.id === DRIVE_CONNECTOR_ID)) {
        return current.filter((s) => s.id !== DRIVE_CONNECTOR_ID);
      }
      return [...current, { id: DRIVE_CONNECTOR_ID, kind: 'driveConnector', label: 'Google Drive' }];
    });
  };

  const driveConnectorActive = attachedSources.some((s) => s.id === DRIVE_CONNECTOR_ID);


  return (
    <div className="mt-5 w-full">
      <DriveBrowserDialog open={driveBrowserOpen} onOpenChange={setDriveBrowserOpen} onAttach={addDriveFiles} />
      {readOnlyMessage ? <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">{readOnlyMessage}</div> : null}
      <div className="relative rounded-2xl border border-neutral-700 bg-[#151515] shadow-[0_16px_40px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]">
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
            {actionMenuOpen ? (
              <div
                role="menu"
                className="absolute bottom-11 left-0 z-20 w-72 overflow-hidden rounded-2xl border border-zinc-700 bg-[#303030] p-1.5 text-sm text-zinc-100 shadow-2xl"
              >
                <ComposerMenuItem
                  icon={<GoogleDriveIcon className="h-5 w-5" />}
                  label="Google Drive"
                  description="Use Drive as a context source for the next message"
                  onClick={toggleDriveConnector}
                  disabled={disabled || loading}
                  trailing={
                    driveConnectorActive ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">On</span>
                    ) : undefined
                  }
                />
                <ComposerMenuItem
                  icon={<Paperclip className="h-5 w-5" strokeWidth={1.9} />}
                  label="Attach file"
                  onClick={() => addSource('file', 'Attach file')}
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
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <ActionChip
          icon={<Wand2 className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Improve writing"
          disabled={!canUseAssistantActions}
          onClick={() => runUtility('Improve the writing in this Teacher Desk task. Keep Joshua’s voice and preserve the substance.')}
        />
        <ActionChip
          icon={<FileText className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Canvas Draft reply"
          disabled={!canUseAssistantActions}
          onClick={() => runUtility('Create a concise Canvas-style draft reply for this Teacher Desk task.')}
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

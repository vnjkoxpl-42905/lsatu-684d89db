import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Archive,
  Tag,
  FileText,
  CalendarDays,
  Eye,
  Info,
  ExternalLink,
  Flame,
  Target,
  Lightbulb,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import {
  BOOTCAMP_REFERENCES,
  REFERENCE_TYPE_LABELS,
  PREVIEW_STATUS_LABELS,
  type ReferenceType,
} from '@/data/bootcampReferences';
import { cn } from '@/lib/utils';

const REFERENCE_TYPE_ICONS: Record<ReferenceType, React.ComponentType<{ className?: string }>> = {
  bootcamp: Flame,
  drill: Target,
  'visual-reference': Eye,
  'content-reference': FileText,
};

export default function BootcampReferenceDetail() {
  const { refId } = useParams<{ refId: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const entry = BOOTCAMP_REFERENCES.find((r) => r.id === refId);

  if (!entry) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-400">Reference not found.</p>
        <button
          type="button"
          onClick={() => navigate('/teacher/reference-library')}
          className="mt-3 text-xs text-amber-400/70 hover:text-amber-300 transition-colors"
        >
          Back to Reference Library
        </button>
      </div>
    );
  }

  const Icon = REFERENCE_TYPE_ICONS[entry.referenceType];
  const preview = PREVIEW_STATUS_LABELS[entry.previewStatus];

  function copyFilename() {
    void navigator.clipboard.writeText(entry.sourceFilename);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950">
      {/* Sticky sub-header */}
      <div className="shrink-0 border-b border-zinc-800/60 px-6 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/teacher/reference-library')}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Reference Library
        </button>
        <div className="h-4 w-px bg-zinc-800" />
        <span className="text-xs text-zinc-500 truncate max-w-xs">{entry.title}</span>

        {/* Reference-only badge */}
        <div className="ml-auto flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded-full px-2.5 py-0.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
          <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
            Reference only
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Title block */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-amber-400/80" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">{entry.title}</h1>
              <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{entry.description}</p>
            </div>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {[
              {
                label: 'Topic',
                value: entry.topic,
                icon: Tag,
                valueClass: 'text-zinc-200',
              },
              {
                label: 'Reference Type',
                value: REFERENCE_TYPE_LABELS[entry.referenceType],
                icon: Archive,
                valueClass: 'text-zinc-200',
              },
              {
                label: 'Status',
                value: 'Reference only',
                icon: Info,
                valueClass: 'text-amber-300',
              },
              {
                label: 'Preview',
                value: preview.label,
                icon: Eye,
                valueClass: preview.color,
              },
              {
                label: 'Imported',
                value: new Date(entry.importedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                }),
                icon: CalendarDays,
                valueClass: 'text-zinc-400',
              },
              ...(entry.fileCount
                ? [
                    {
                      label: 'File Count',
                      value: `${entry.fileCount} file${entry.fileCount !== 1 ? 's' : ''}`,
                      icon: FileText,
                      valueClass: 'text-zinc-400',
                    },
                  ]
                : []),
            ].map(({ label, value, icon: MetaIcon, valueClass }) => (
              <div
                key={label}
                className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-1">
                  <MetaIcon className="w-3 h-3" />
                  {label}
                </div>
                <p className={cn('text-xs font-medium', valueClass)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Source file */}
          <section className="mb-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">
              Source File
            </h2>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-zinc-300 truncate">{entry.sourceFilename}</span>
              <button
                type="button"
                onClick={copyFilename}
                className="shrink-0 inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                {copied ? (
                  <><Check className="w-3 h-3 text-emerald-400" /> Copied</>
                ) : (
                  <><Copy className="w-3 h-3" /> Copy</>
                )}
              </button>
            </div>
          </section>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <section className="mb-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">
                Tags
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] bg-zinc-800/80 border border-zinc-700/40 text-zinc-400 px-2.5 py-1 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Admin notes */}
          {entry.notes && (
            <section className="mb-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">
                Admin Notes
              </h2>
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg px-4 py-3">
                <p className="text-xs text-zinc-400 leading-relaxed">{entry.notes}</p>
              </div>
            </section>
          )}

          {/* Preview area */}
          <section className="mb-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">
              Preview
            </h2>

            {(() => {
              const iframeSrc = entry.appRoute ?? entry.previewPath;
              if ((entry.previewStatus === 'static-ready' || entry.appRoute) && iframeSrc) {
                return (
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-zinc-400">
                      {entry.appRoute ? 'Live in-app preview' : 'Static preview available'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewExpanded(!previewExpanded)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                      {previewExpanded ? 'Collapse' : 'Expand'}
                    </button>
                    {entry.appRoute && (
                      <button
                        type="button"
                        onClick={() => navigate(entry.appRoute!)}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-400/80 hover:text-amber-300 transition-colors"
                      >
                        Open in app
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const url = entry.appRoute
                          ? `${window.location.origin}${entry.appRoute}`
                          : new URL(iframeSrc, window.location.origin).toString();
                        const win = window.open(url, '_blank', 'noopener,noreferrer');
                        if (!win) window.location.href = url;
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-amber-400/80 hover:text-amber-300 transition-colors"
                    >
                      Open full screen
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div
                  className={cn(
                    'transition-all duration-300 overflow-hidden',
                    previewExpanded ? 'h-[700px]' : 'h-[400px]',
                  )}
                >
                  <iframe
                    src={iframeSrc}
                    title={`Preview: ${entry.title}`}
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    loading="lazy"
                  />
                </div>
              </div>
                );
              }
              return null;
            })() ||
            (entry.previewStatus === 'metadata-only' ? (
              <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-lg px-5 py-6 flex flex-col items-center gap-2 text-center">
                <Info className="w-5 h-5 text-amber-400/50" />
                <p className="text-xs font-medium text-zinc-400">Metadata only</p>
                <p className="text-[11px] text-zinc-600 max-w-sm">
                  This reference has metadata but no static preview has been generated yet.
                </p>
              </div>
            ) : (
              <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-lg px-5 py-6 flex flex-col items-center gap-2 text-center">
                <Archive className="w-5 h-5 text-zinc-600" />
                <p className="text-xs font-medium text-zinc-500">Preview not generated yet</p>
                <p className="text-[11px] text-zinc-600 max-w-sm">
                  This reference requires extraction and build setup before a preview can be
                  displayed. The ZIP source file is available for manual inspection.
                </p>
              </div>
            ))}
          </section>

          {/* Use as inspiration */}
          <div className="border border-zinc-800/50 rounded-xl p-4 flex items-start gap-3 bg-zinc-900/30">
            <Lightbulb className="w-4 h-4 text-amber-400/60 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-zinc-300">Using as inspiration</p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                This is a reference-only material. It is never visible to students. Use it as
                design or content inspiration when building new LSAT U bootcamp surfaces.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

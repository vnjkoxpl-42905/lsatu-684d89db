import * as React from 'react';
import { createPortal } from 'react-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronDown, Search, X } from 'lucide-react';
import type { RcIndexPassageWithPt } from '../lib/rcAdaptive';
import {
  EMPTY_RC_FINDER_ADDRESS,
  addressForOption,
  buildRcFinderIndex,
  describeFinderView,
  finderOptionLabel,
  finderPlate,
  flattenFinderOptions,
  formatPassageReference,
  isCommittedOption,
  parseRcFinderQuery,
  resolveFinderAddress,
  resolveRcFinderView,
  stepBackAddress,
  type RcFinderAddress,
  type RcFinderGroup,
  type RcFinderOption,
  type RcFinderPlateSlot,
} from '../lib/rcPassageFinder';
import '../rcPassageFinder.css';

export interface RcPassageFinderProps {
  /** The index the builder already loaded. The finder never fetches. */
  passages: readonly RcIndexPassageWithPt[];
  status: 'loading' | 'ready' | 'failed';
  onRetry: () => void;
  /** The builder's lookup address. Every change goes back through `onAddressChange`. */
  address: RcFinderAddress;
  onAddressChange: (address: RcFinderAddress) => void;
}

/** Phones get a full-width sheet; wider screens get a panel anchored under the field. */
const PHONE_QUERY = '(max-width: 560px)';

function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback((callback: () => void) => {
    const list = typeof window.matchMedia === 'function' ? window.matchMedia(query) : null;
    list?.addEventListener?.('change', callback);
    return () => list?.removeEventListener?.('change', callback);
  }, [query]);
  return React.useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === 'function' && Boolean(window.matchMedia(query).matches),
    () => false,
  );
}

function depth(address: RcFinderAddress): number {
  return address.passage ? 3 : address.section ? 2 : address.pt ? 1 : 0;
}

/** Marks typed title/topic words. Display only; matching lives in the pure helper. */
function markTerms(text: string, query: string): React.ReactNode {
  const parsed = parseRcFinderQuery(query);
  if (parsed.kind !== 'text' || !parsed.terms.length) return text;
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const term of parsed.terms) {
    const at = lower.indexOf(term);
    if (at >= 0) ranges.push([at, at + term.length]);
  }
  if (!ranges.length) return text;
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  merged.forEach(([start, end], index) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(<mark key={index} className="rc-finder-mark">{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function AddressPlate({ slots, surface }: { slots: RcFinderPlateSlot[]; surface: 'paper' | 'dark' }) {
  return (
    <span className="rc-finder-plate" data-surface={surface} aria-hidden="true">
      {slots.map(slot => (
        <span key={slot.label} className="rc-finder-slot" data-state={slot.state}>
          <span className="rc-finder-slot-label">{slot.label}</span>
          {/* Keyed by value so a new value rolls in; an unchanged one stays still. */}
          <span key={`${slot.state}:${slot.value}`} className="rc-finder-slot-value" data-roll={slot.state === 'committed' || undefined}>{slot.value || '–'}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * The left-side passage finder for the RC builder. One combobox reads an
 * address ("140 3 1"), a partial address, or title and topic words, over the
 * already-loaded metadata index. Browsing and searching are metadata only:
 * nothing here loads passage text, records exposure or starts a drill.
 */
export function RcPassageFinder({ passages, status, onRetry, address, onAddressChange }: RcPassageFinderProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ids = {
    input: `rc-finder-input-${uid}`,
    listbox: `rc-finder-listbox-${uid}`,
    hint: `rc-finder-hint-${uid}`,
    message: `rc-finder-message-${uid}`,
    sheetDescription: `rc-finder-sheet-description-${uid}`,
  };
  const optionId = (key: string) => `rc-finder-${uid}-${key}`;
  const phone = useMediaQuery(PHONE_QUERY);

  const index = React.useMemo(() => buildRcFinderIndex(passages), [passages]);
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState('');
  const [step, setStep] = React.useState<'forward' | 'back' | null>(null);
  const [settled, settle] = React.useReducer((n: number) => n + 1, 0);
  const highlightFirst = React.useRef(false);
  const announcePrefix = React.useRef('');

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const view = React.useMemo(() => resolveRcFinderView(index, address, query), [index, address, query]);
  const options = React.useMemo(() => flattenFinderOptions(view), [view]);
  const committed = resolveFinderAddress(index, address);
  const hasIndex = index.passages.length > 0;
  const loading = status === 'loading' && !hasIndex;
  const failed = status === 'failed' && !hasIndex;
  const plate = finderPlate(address, query);

  // A new result set highlights its best match while typing, and after a
  // level step. Browsing an untouched level waits for the arrow keys.
  React.useEffect(() => {
    if (!options.length) { setActiveKey(null); return; }
    if (query.trim() || highlightFirst.current) setActiveKey(options[0].key);
    else setActiveKey(previous => previous && options.some(option => option.key === previous) ? previous : null);
    highlightFirst.current = false;
  }, [options, query]);

  React.useEffect(() => {
    if (!activeKey || !open) return;
    document.getElementById(optionId(activeKey))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, open]);

  React.useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const prefix = announcePrefix.current;
      announcePrefix.current = '';
      setAnnouncement([prefix, loading ? 'Loading the passage index.' : failed ? 'The passage index could not be loaded.' : describeFinderView(view)].filter(Boolean).join(' '));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [view, open, loading, failed]);

  /* ----------------------------------------------------- anchored panel */

  const [placement, setPlacement] = React.useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null);
  const measurePanel = React.useRef<(() => void) | null>(null);
  // Parent status messages may reflow without a window resize or scroll.
  React.useLayoutEffect(() => { measurePanel.current?.(); });
  React.useLayoutEffect(() => {
    if (!open || phone) return;
    const anchor = anchorRef.current;
    // Make room once if the field sits in the last strip of the viewport,
    // rather than squeezing the index into a sliver or covering the heading.
    if (anchor && window.innerHeight - anchor.getBoundingClientRect().bottom < 260) anchor.scrollIntoView?.({ block: 'center' });
    let frame = 0;
    const measure = () => {
      frame = 0;
      const box = anchorRef.current?.getBoundingClientRect();
      if (!box) return;
      // An index whose field has scrolled away would float over unrelated content.
      if (box.height > 0 && (box.bottom < 0 || box.top > window.innerHeight)) { setOpen(false); return; }
      const below = Math.max(0, window.innerHeight - box.bottom - 24);
      const above = Math.max(0, box.top - 24);
      const opensAbove = below < 320 && above > below;
      const maxHeight = Math.min(480, opensAbove ? above : below);
      const next = {
        top: opensAbove ? undefined : box.bottom + 8,
        bottom: opensAbove ? window.innerHeight - box.top + 8 : undefined,
        left: box.left, width: box.width, maxHeight,
      };
      setPlacement(previous => previous && previous.top === next.top && previous.bottom === next.bottom && previous.left === next.left && previous.width === next.width && previous.maxHeight === next.maxHeight ? previous : next);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    measurePanel.current = measure;
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(document.body);
    if (anchor) observer?.observe(anchor);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      measurePanel.current = null;
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [open, phone]);

  React.useEffect(() => {
    if (!open || phone) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (anchorRef.current?.contains(target) || panelRef.current?.contains(target))) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, phone]);

  /* ------------------------------------------------------------ actions */

  const openPanel = () => { setStep(null); setOpen(true); };

  const commit = (option: RcFinderOption) => {
    const next = addressForOption(option);
    setStep(depth(next) > depth(address) ? 'forward' : 'back');
    onAddressChange(next);
    setQuery('');
    if (option.kind === 'passage') {
      setOpen(false);
      setActiveKey(null);
      settle();
      setAnnouncement(`Chosen: ${finderOptionLabel(option)}. Review passages when you are ready.`);
      return;
    }
    highlightFirst.current = true;
    announcePrefix.current = option.kind === 'preptest'
      ? `PT ${option.preptest.preptest} chosen. Choose a section.`
      : `Section ${option.section.section} chosen. Choose a passage.`;
  };

  const moveTo = (next: RcFinderAddress, message: string) => {
    setStep('back');
    onAddressChange(next);
    setQuery('');
    setActiveKey(null);
    // An open index announces the step with its new results.
    if (open) announcePrefix.current = message;
    else setAnnouncement(message);
  };
  const stepBack = () => {
    const next = stepBackAddress(address);
    moveTo(next, address.passage ? 'Passage cleared.' : address.section ? 'Section cleared.' : 'Address cleared.');
  };
  const clearAll = () => {
    moveTo(EMPTY_RC_FINDER_ADDRESS, 'Address cleared.');
    if (!phone) inputRef.current?.focus();
  };
  const changeLevel = () => {
    stepBack();
    openPanel();
    if (!phone) inputRef.current?.focus();
  };

  const preferredKey = () => options.find(option => isCommittedOption(option, address))?.key ?? options[0]?.key ?? null;

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const at = activeKey ? options.findIndex(option => option.key === activeKey) : -1;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) { openPanel(); setActiveKey(event.key === 'ArrowDown' ? preferredKey() : options[options.length - 1]?.key ?? null); return; }
        if (!options.length) return;
        const next = event.key === 'ArrowDown'
          ? (at + 1) % options.length
          : at <= 0 ? options.length - 1 : at - 1;
        setActiveKey(options[next].key);
        return;
      }
      case 'PageDown':
      case 'PageUp': {
        if (!open || view.groups.length < 2) return;
        event.preventDefault();
        const groupAt = Math.max(0, view.groups.findIndex(group => group.options.some(option => option.key === activeKey)));
        const target = view.groups[event.key === 'PageDown' ? Math.min(view.groups.length - 1, groupAt + 1) : Math.max(0, groupAt - 1)];
        setActiveKey(target.options[0]?.key ?? null);
        return;
      }
      case 'Enter': {
        if (!open) { if (query.trim()) { event.preventDefault(); openPanel(); } return; }
        event.preventDefault();
        const target = options.find(option => option.key === activeKey) ?? (options.length === 1 || view.exact ? options[0] : undefined);
        if (target) commit(target);
        return;
      }
      case 'Escape':
        // The phone sheet owns Escape: Radix closes it and returns focus.
        if (phone) return;
        if (open) { event.preventDefault(); setOpen(false); return; }
        if (query) { event.preventDefault(); setQuery(''); }
        return;
      case 'Backspace':
        if (query === '' && address.pt) {
          event.preventDefault();
          stepBack();
          if (!open) openPanel();
        }
        return;
      case 'Tab':
        if (open && !phone) setOpen(false);
        return;
      default:
    }
  };

  /* ------------------------------------------------------------- render */

  const placeholder = loading ? 'Loading passages…' : failed ? 'Passage index unavailable' : '140 3 1, a title or a subject';
  const input = (
    <input
      ref={inputRef}
      id={ids.input}
      className="rc-finder-input"
      type="search"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={open ? ids.listbox : undefined}
      aria-activedescendant={open && activeKey ? optionId(activeKey) : undefined}
      aria-describedby={ids.hint}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="go"
      placeholder={placeholder}
      value={query}
      onChange={event => { setQuery(event.target.value); setStep(null); if (!open) setOpen(true); }}
      onKeyDown={onKeyDown}
      onClick={() => { if (!open) openPanel(); }}
      onBlur={event => {
        if (phone) return;
        const next = event.relatedTarget as Node | null;
        if (next && (panelRef.current?.contains(next) || anchorRef.current?.contains(next))) return;
        setOpen(false);
      }}
    />
  );

  const levelLabel = view.level === 'preptest' ? 'Choose a PrepTest' : view.level === 'section' ? 'Choose a section' : view.level === 'passage' ? 'Choose a passage' : 'Matches';
  const listboxLabel = view.level === 'preptest' ? 'PrepTests'
    : view.level === 'section' ? `Sections${address.pt ? ` in PT ${address.pt}` : ''}`
      : view.level === 'passage' && !query ? `Passages in PT ${address.pt} Section ${address.section}` : 'Matching passages';

  const renderOption = (option: RcFinderOption) => {
    const highlighted = option.key === activeKey;
    const chosen = isCommittedOption(option, address);
    const common = {
      id: optionId(option.key),
      role: 'option' as const,
      'aria-selected': chosen,
      'aria-label': finderOptionLabel(option),
      'data-highlighted': highlighted || undefined,
      'data-chosen': chosen || undefined,
      onPointerMove: () => { if (!highlighted) setActiveKey(option.key); },
      onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
      onClick: () => commit(option),
    };
    if (option.kind === 'preptest') {
      const multiple = option.preptest.sections.length;
      return (
        <div key={option.key} {...common} className="rc-finder-option rc-finder-option-preptest">
          <span className="rc-finder-plate-number">{option.preptest.preptest}</span>
          {multiple > 1 && <span className="rc-finder-plate-mark">×{multiple}</span>}
        </div>
      );
    }
    if (option.kind === 'section') {
      const { section } = option;
      return (
        <div key={option.key} {...common} className="rc-finder-option rc-finder-option-section">
          <span className="rc-finder-row-main">Section {section.section}{chosen && <span className="rc-finder-chosen">Chosen</span>}</span>
          <span className="rc-finder-row-meta">{section.passages.length} {section.passages.length === 1 ? 'passage' : 'passages'} · {section.questionCount} questions</span>
        </div>
      );
    }
    const { passage } = option;
    const meta = [passage.topic, `${passage.questionCount} ${passage.questionCount === 1 ? 'question' : 'questions'}`].filter(Boolean).join(' · ');
    return (
      <div key={option.key} {...common} className="rc-finder-option rc-finder-option-passage">
        <span className="rc-finder-card-ref">
          <span>{formatPassageReference(passage)}</span>
          {chosen ? <span className="rc-finder-chosen">Chosen</span> : highlighted ? <span className="rc-finder-card-key">Enter to choose</span> : null}
        </span>
        <span className="rc-finder-card-title">{markTerms(passage.title || `Passage ${passage.setNumber}`, query)}</span>
        <span className="rc-finder-card-meta">{markTerms(meta, query)}</span>
      </div>
    );
  };

  const renderGroup = (group: RcFinderGroup) => {
    const layout = group.options[0]?.kind === 'preptest' ? 'bay' : view.level === 'search' ? 'stack' : 'plain';
    const labelId = `rc-finder-${uid}-${group.key}-label`;
    return (
      <div key={group.key} role="group" aria-labelledby={labelId} className="rc-finder-group" data-layout={layout}>
        <div id={labelId} className="rc-finder-group-label">{group.label}</div>
        <div className={layout === 'bay' ? 'rc-finder-bay' : 'rc-finder-rows'}>{group.options.map(renderOption)}</div>
      </div>
    );
  };

  const panelBody = (
    <>
      <div className="rc-finder-panel-head">
        <nav className="rc-finder-crumbs" aria-label="Passage index path">
          {address.pt
            ? <button type="button" aria-label="Back to all PrepTests" onMouseDown={event => event.preventDefault()} onClick={() => moveTo(EMPTY_RC_FINDER_ADDRESS, 'Address cleared.')}>Index</button>
            : <span aria-current="location">Index</span>}
          {address.pt && <>
            <span className="rc-finder-crumb-sep" aria-hidden="true">/</span>
            {address.section
              ? <button type="button" aria-label={`Back to PT ${address.pt} sections`} onMouseDown={event => event.preventDefault()} onClick={() => moveTo({ pt: address.pt, section: '', passage: '' }, 'Section cleared.')}>PT {address.pt}</button>
              : <span aria-current="location">PT {address.pt}</span>}
          </>}
          {address.section && <>
            <span className="rc-finder-crumb-sep" aria-hidden="true">/</span>
            <span aria-current="location">Section {address.section}</span>
          </>}
        </nav>
        <span className="rc-finder-level">{levelLabel}</span>
      </div>
      {loading && <div className="rc-finder-state">
        <p>Loading the passage index…</p>
        <div className="rc-finder-skeleton" aria-hidden="true"><span /><span /><span /></div>
      </div>}
      {failed && <div className="rc-finder-state">
        <p>The passage index could not be loaded. Nothing has changed in your drill.</p>
        <button type="button" className="rc-finder-retry" onMouseDown={event => event.preventDefault()} onClick={onRetry}>Retry loading passages</button>
      </div>}
      <div
        id={ids.listbox}
        role="listbox"
        aria-label={listboxLabel}
        aria-describedby={view.message ? ids.message : undefined}
        className="rc-finder-listbox"
        data-level={view.level}
        data-step={step ?? undefined}
        key={`${address.pt}|${address.section}`}
      >
        {!loading && !failed && view.groups.map(renderGroup)}
      </div>
      {!loading && !failed && view.message && <p id={ids.message} className="rc-finder-message">{view.message}</p>}
      {status === 'failed' && hasIndex && <p className="rc-finder-message rc-finder-message-quiet">The latest index refresh failed. You are browsing the list loaded earlier.</p>}
      <div className="rc-finder-panel-foot">
        <span className="rc-finder-keys" aria-hidden="true"><kbd>↑↓</kbd> move <kbd>⏎</kbd> choose <kbd>⌫</kbd> back <kbd>esc</kbd> close</span>
        <span className="rc-finder-source">Titles and topics only</span>
      </div>
    </>
  );

  const statusRow = address.pt ? (
    <div className="rc-finder-status" data-settled={settled} data-complete={committed ? true : undefined}>
      <span className="rc-finder-status-text" role="status">
        {committed
          ? <><span className="rc-finder-status-ref">PT {committed.preptest} · Section {committed.section} · Passage {committed.setNumber}</span>{' '}<span className="rc-finder-status-title">{committed.title || `Passage ${committed.setNumber}`}</span></>
          : `PT ${address.pt}${address.section ? ` · Section ${address.section}` : ''}. Choose ${address.section ? 'a passage' : 'a section and passage'} to continue.`}
      </span>
      <span className="rc-finder-status-actions">
        {address.section && <button type="button" onClick={changeLevel}>{address.passage ? 'Change passage' : 'Change section'}</button>}
        <button type="button" onClick={clearAll}>Clear</button>
      </span>
    </div>
  ) : null;

  const hint = <p id={ids.hint} className="rc-finder-sr">Type an address like 140 3 1, or words from a title or subject. Arrow keys move through results and Enter chooses. Backspace in an empty field steps back one level.</p>;
  const live = <p className="rc-finder-sr" aria-live="polite">{announcement}</p>;

  if (phone) {
    const summary = index.preptests.length ? `${index.preptests.length} PrepTests · ${index.preptests[0].preptest}–${index.preptests[index.preptests.length - 1].preptest}` : loading ? 'Loading passages' : 'No passages available';
    return (
      <div className="rc-finder" data-mode="sheet">
        <DialogPrimitive.Root open={open} onOpenChange={next => { setOpen(next); if (next) setStep(null); }}>
          <DialogPrimitive.Trigger asChild>
            <button type="button" className="rc-finder-instrument rc-finder-trigger">
              <Search className="rc-finder-glyph" aria-hidden="true" />
              <span className="rc-finder-field">
                <span className="rc-finder-label">Find a passage</span>
                <span className="rc-finder-trigger-value" data-empty={!address.pt || undefined}>
                  {committed ? committed.title || `Passage ${committed.setNumber}` : address.pt ? `PT ${address.pt}${address.section ? ` · Section ${address.section}` : ''}` : 'Address, title or subject'}
                </span>
              </span>
              <AddressPlate slots={plate} surface="paper" />
            </button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="rc-finder-sheet-overlay" />
            <DialogPrimitive.Content
              className="rc-finder-sheet"
              aria-describedby={ids.sheetDescription}
              onOpenAutoFocus={event => { event.preventDefault(); inputRef.current?.focus(); }}
            >
              <span className="rc-finder-sheet-grip" aria-hidden="true" />
              <div className="rc-finder-sheet-head">
                <div>
                  <DialogPrimitive.Title className="rc-finder-sheet-title">Find a passage</DialogPrimitive.Title>
                  <DialogPrimitive.Description id={ids.sheetDescription} className="rc-finder-sheet-description">{summary}</DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close className="rc-finder-sheet-close">Close</DialogPrimitive.Close>
              </div>
              <div ref={anchorRef} className="rc-finder-instrument rc-finder-sheet-field">
                <Search className="rc-finder-glyph" aria-hidden="true" />
                <span className="rc-finder-field">
                  <label htmlFor={ids.input} className="rc-finder-label">Find a passage</label>
                  {input}
                </span>
                {query && <button type="button" className="rc-finder-icon-button" aria-label="Clear search text" onClick={() => { setQuery(''); inputRef.current?.focus(); }}><X aria-hidden="true" /></button>}
              </div>
              <AddressPlate slots={plate} surface="dark" />
              <div ref={panelRef} className="rc-finder-panel rc-finder-panel-inline">{panelBody}</div>
              {hint}
              {live}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
        {statusRow}
        {live}
      </div>
    );
  }

  return (
    <div className="rc-finder" data-mode="anchored">
      <div ref={anchorRef} className="rc-finder-instrument" data-open={open || undefined}>
        <Search className="rc-finder-glyph" aria-hidden="true" />
        <span className="rc-finder-field">
          <label htmlFor={ids.input} className="rc-finder-label">Find a passage</label>
          {input}
        </span>
        {query && <button type="button" className="rc-finder-icon-button" aria-label="Clear search text" onMouseDown={event => event.preventDefault()} onClick={() => { setQuery(''); inputRef.current?.focus(); }}><X aria-hidden="true" /></button>}
        <AddressPlate slots={plate} surface="paper" />
        <button
          type="button"
          tabIndex={-1}
          className="rc-finder-icon-button rc-finder-browse"
          aria-label={open ? 'Close the passage index' : 'Browse the passage index'}
          aria-expanded={open}
          aria-controls={open ? ids.listbox : undefined}
          onMouseDown={event => event.preventDefault()}
          onClick={() => { if (open) setOpen(false); else openPanel(); inputRef.current?.focus(); }}
        >
          <ChevronDown aria-hidden="true" />
        </button>
      </div>
      {hint}
      {statusRow}
      {live}
      {open && createPortal(
        <div
          ref={panelRef}
          className="rc-finder-panel"
          data-mode="anchored"
          style={placement ? { ...placement, transformOrigin: placement.bottom === undefined ? 'top center' : 'bottom center' } : { visibility: 'hidden' }}
          // Pressing inside the index never takes focus from the field.
          onMouseDown={event => event.preventDefault()}
        >
          {panelBody}
        </div>,
        document.body,
      )}
    </div>
  );
}

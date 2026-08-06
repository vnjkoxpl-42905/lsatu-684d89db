import * as React from 'react';
import {
  RC_COLOR_SCHEMES,
  RC_FONT_SIZES,
  RC_LINE_HEIGHTS,
  type RcA11ySettings,
} from '../hooks/useRcA11y';
import type { RcSessionItem } from '../lib/rcSession';
import type { RcPassage, RcQuestion } from '../lib/rcTypes';

interface ShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ShellProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="rc-overlay" onClick={onClose}>
      <div
        className="rc-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="rc-modal-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- review */

interface ReviewModalProps {
  items: RcSessionItem[];
  currentIndex: number;
  answered: (item: RcSessionItem) => boolean;
  flagged: (item: RcSessionItem) => boolean;
  pillClass: (item: RcSessionItem, index: number) => string;
  onNavigate: (index: number) => void;
  onClose: () => void;
  onSubmit?: () => void;
}

export function RcReviewModal({
  items,
  currentIndex,
  answered,
  flagged,
  pillClass,
  onNavigate,
  onClose,
  onSubmit,
}: ReviewModalProps) {
  const [onlyFlagged, setOnlyFlagged] = React.useState(false);
  const [onlyUnattempted, setOnlyUnattempted] = React.useState(false);

  const visible = items.filter((item) => {
    if (onlyFlagged && !flagged(item)) return false;
    if (onlyUnattempted && answered(item)) return false;
    return true;
  });

  return (
    <Modal title="Review" onClose={onClose}>
      <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={onlyFlagged}
            onChange={(e) => setOnlyFlagged(e.target.checked)}
          />
          Flagged
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={onlyUnattempted}
            onChange={(e) => setOnlyUnattempted(e.target.checked)}
          />
          Unattempted
        </label>
      </div>

      <div className="rc-review-grid">
        {visible.map((item) => {
          const index = items.indexOf(item);
          return (
            <button
              key={item.question.questionId}
              type="button"
              className={pillClass(item, index)}
              aria-label={`Go to question ${item.number}`}
              aria-current={index === currentIndex ? 'true' : undefined}
              onClick={() => {
                onNavigate(index);
                onClose();
              }}
            >
              {item.number}
              {flagged(item) && <span className="rc-pill-flag" aria-hidden />}
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <p style={{ fontSize: 13, marginTop: 12 }}>Nothing matches those filters.</p>
      )}

      {onSubmit && (
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button type="button" className="rc-button rc-button-primary" onClick={onSubmit}>
            Submit
          </button>
        </div>
      )}
    </Modal>
  );
}

/* --------------------------------------------------------- accessibility */

interface A11yModalProps {
  settings: RcA11ySettings;
  onChange: (patch: Partial<RcA11ySettings>) => void;
  onClose: () => void;
}

export function RcAccessibilityModal({ settings, onChange, onClose }: A11yModalProps) {
  const [tab, setTab] = React.useState<'scheme' | 'size' | 'height' | 'zoom'>('scheme');

  return (
    <Modal title="Accessibility" onClose={onClose}>
      <div className="rc-a11y-tabs">
        {(
          [
            ['scheme', 'Color scheme'],
            ['size', 'Font size'],
            ['height', 'Line spacing'],
            ['zoom', 'Zoom'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rc-button${tab === id ? ' rc-button-primary' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'scheme' &&
        RC_COLOR_SCHEMES.map((scheme) => (
          <button
            key={scheme.id}
            type="button"
            className={`rc-a11y-option${settings.scheme === scheme.id ? ' rc-active' : ''}`}
            onClick={() => onChange({ scheme: scheme.id })}
          >
            {scheme.label}
          </button>
        ))}

      {tab === 'size' &&
        RC_FONT_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            className={`rc-a11y-option${settings.fontSize === size ? ' rc-active' : ''}`}
            onClick={() => onChange({ fontSize: size })}
          >
            {size}%
          </button>
        ))}

      {tab === 'height' &&
        RC_LINE_HEIGHTS.map((height) => (
          <button
            key={height}
            type="button"
            className={`rc-a11y-option${settings.lineHeight === height ? ' rc-active' : ''}`}
            onClick={() => onChange({ lineHeight: height })}
          >
            {height}
            {height === 1.35 ? ' (default)' : ''}
          </button>
        ))}

      {tab === 'zoom' && (
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          Use your browser to zoom the whole screen. On a Mac press Command and the plus or minus
          key. On Windows press Control and the plus or minus key. Press Command 0 or Control 0 to
          go back to normal.
        </p>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------- question details */

const dash = (value: unknown) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

export function RcQuestionDetails({
  question,
  passage,
  number,
  onClose,
}: {
  question: RcQuestion;
  passage: RcPassage;
  number: number;
  onClose: () => void;
}) {
  const rows: [string, string][] = [
    ['PrepTest', dash(passage.preptest)],
    ['Section', dash(passage.section)],
    ['Question', String(number)],
    ['Difficulty', dash(question.difficulty)],
    ['Question Type', dash(question.questionType)],
    [
      'Question Features',
      question.features.length > 0 ? question.features.map((f) => f.name).join(', ') : '—',
    ],
    ['Passage Topic', dash(passage.topic)],
    ['Passage Format', dash(passage.format)],
    ['Frameworks', passage.frameworks.length > 0 ? passage.frameworks.join(', ') : '—'],
    ['Set Difficulty', dash(passage.difficulty)],
    ['Set Number', dash(passage.setNumber)],
  ];

  return (
    <Modal title="Question details" onClose={onClose}>
      <table className="rc-details-table">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

/* ------------------------------------------------------------------ pause */

export function RcPauseOverlay({ onResume }: { onResume: () => void }) {
  return (
    <div className="rc-overlay rc-pause-overlay">
      <div className="rc-modal" role="dialog" aria-modal="true" aria-label="Paused">
        <h2>Paused</h2>
        <p style={{ fontSize: 13, marginBottom: 16 }}>The clock is stopped.</p>
        <button type="button" className="rc-button rc-button-primary" onClick={onResume}>
          Resume
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- overflow menu */

interface MenuProps {
  onClose: () => void;
  onQuestionDetails: () => void;
  onPause: () => void;
  onSaveExit: () => void;
  onSubmit?: () => void;
}

export function RcOverflowMenu({
  onClose,
  onQuestionDetails,
  onPause,
  onSaveExit,
  onSubmit,
}: MenuProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="rc-overlay" onClick={onClose} />
      <div className="rc-drawer" role="dialog" aria-modal="true" aria-label="Menu">
        <button type="button" className="rc-modal-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <h2>Menu</h2>
        <button type="button" className="rc-a11y-option" onClick={onQuestionDetails}>
          Question details
        </button>
        <button type="button" className="rc-a11y-option" onClick={onPause}>
          Pause
        </button>
        <button type="button" className="rc-a11y-option" onClick={onSaveExit}>
          Save and exit
        </button>
        {onSubmit && (
          <button type="button" className="rc-a11y-option" onClick={onSubmit}>
            Submit
          </button>
        )}
      </div>
    </>
  );
}

/* --------------------------------------------------------- confirm submit */

export function RcSubmitConfirm({
  unanswered,
  onCancel,
  onConfirm,
}: {
  unanswered: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Submit this drill?" onClose={onCancel}>
      <p style={{ fontSize: 13, marginBottom: 16 }}>
        {unanswered > 0
          ? `You have ${unanswered} question${unanswered === 1 ? '' : 's'} without an answer. Submitting now scores ${unanswered === 1 ? 'it' : 'them'} as missed.`
          : 'Every question has an answer. You can review everything after you submit.'}
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="rc-button" onClick={onCancel}>
          Keep working
        </button>
        <button type="button" className="rc-button rc-button-primary" onClick={onConfirm}>
          Submit
        </button>
      </div>
    </Modal>
  );
}

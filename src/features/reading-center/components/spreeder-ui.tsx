import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MIcon } from "./Icon";

/**
 * Spreeder-styled primitives (Angular Material look, captured 2026-10-13).
 * Colours come from the --rc-* theme variables in index.css.
 */

// ---------------------------------------------------------------- modal

export function Modal({
  open,
  onClose,
  width,
  height,
  children,
  closeOnBackdrop = false,
  closeOnEscape = false,
  fullScreen = false,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  height?: number | string;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  fullScreen?: boolean;
  labelledBy?: string;
}): React.ReactElement | null {
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeOnEscape, onClose]);
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: fullScreen ? "transparent" : "var(--rc-backdrop)" }}
      onMouseDown={(e) => closeOnBackdrop && e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-rc-dialog
        className="relative flex flex-col overflow-x-hidden overflow-y-auto"
        style={
          fullScreen
            ? { position: "fixed", inset: 0, background: "var(--rc-dialog)", color: "var(--rc-text)" }
            : {
                width,
                height,
                maxWidth: "calc(100vw - 32px)",
                maxHeight: "calc(100vh - 32px)",
                background: "var(--rc-dialog)",
                color: "var(--rc-text)",
                borderRadius: 15,
                border: "0.8px solid var(--rc-dialog-border)",
                boxShadow: "var(--rc-dialog-shadow)",
                padding: 14,
              }
        }
      >
        {children}
      </div>
    </div>,
    document.getElementById("reading-center-root") ?? document.body,
  );
}

export function DialogHeader({ title, onClose, id }: { title: React.ReactNode; onClose: () => void; id?: string }): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-2.5 pl-5 pr-1.5 pt-[5px]">
      <h3 id={id} className="min-w-0 text-2xl font-normal leading-8" style={{ color: "var(--rc-text)" }}>
        {title}
      </h3>
      <button type="button" aria-label="Close" onClick={onClose} className="mt-px flex h-9 w-[34px] shrink-0 items-center justify-center rounded-full hover:bg-[var(--rc-menu-hover)]" style={{ color: "var(--rc-strong)" }}>
        <MIcon name="close" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- dropdown

export interface Option<T extends string | number> {
  value: T;
  label: string;
  style?: React.CSSProperties;
}

export function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  minWidth,
  filled = false,
  ariaLabel,
  buttonStyle,
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  minWidth?: number;
  filled?: boolean;
  ariaLabel: string;
  buttonStyle?: React.CSSProperties;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number }>({ left: 0, top: 0, width: 0 });
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-rc-menu]")) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          const r = btn.current!.getBoundingClientRect();
          setPos({ left: r.left, top: r.bottom, width: r.width });
          setOpen((o) => !o);
        }}
        className="inline-flex h-9 items-center justify-between gap-1 rounded text-sm font-medium"
        style={{
          minWidth,
          padding: "0 8px 0 16px",
          border: "0.8px solid var(--rc-outline)",
          background: filled ? "var(--rc-fontsel-bg)" : "transparent",
          color: "var(--rc-strong)",
          ...buttonStyle,
        }}
      >
        <span className="truncate" style={current?.style}>{current?.label}</span>
        <MIcon name="arrow_drop_down" />
      </button>
      {open &&
        createPortal(
          <div
            data-rc-menu
            role="listbox"
            className="rc-menu fixed z-[60] max-h-[60vh] overflow-y-auto"
            style={{ left: pos.left, top: pos.top, minWidth: Math.max(112, pos.width) }}
          >
            {options.map((o) => (
              <button
                key={String(o.value)}
                type="button"
                role="option"
                aria-selected={o.value === value}
                data-active={o.value === value}
                className="rc-menu-item"
                style={o.style}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            ))}
          </div>,
          document.getElementById("reading-center-root") ?? document.body,
        )}
    </>
  );
}

// ---------------------------------------------------------------- slider

/** Material slider with a tick dot per step, label bottom-left and value bottom-right. */
export function TickSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = String,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}): React.ReactElement {
  const steps = Math.round((max - min) / step);
  const pct = ((value - min) / (max - min)) * 100;
  const track = useRef<HTMLDivElement | null>(null);
  const setFromX = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const v = Math.round((min + ratio * (max - min)) / step) * step;
    onChange(Number(v.toFixed(2)));
  };
  return (
    <div className="select-none">
      <div
        ref={track}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        className="relative h-8 cursor-pointer outline-none"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setFromX(e.clientX);
        }}
        onPointerMove={(e) => e.buttons === 1 && setFromX(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(Math.min(max, Number((value + step).toFixed(2))));
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(Math.max(min, Number((value - step).toFixed(2))));
        }}
      >
        <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2" style={{ background: "rgba(26, 98, 242, 0.35)" }} />
        <div className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2" style={{ width: `${pct}%`, background: "#1a62f2" }} />
        {Array.from({ length: steps + 1 }, (_, i) => (
          <span key={i} className="absolute top-1/2 h-[2px] w-[2px] -translate-y-1/2 rounded-full" style={{ left: `${(i / steps) * 100}%`, background: "#1a3fa8" }} />
        ))}
        <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pct}%`, background: "#1a62f2" }} />
      </div>
      <div className="-mt-1 flex justify-between text-xs" style={{ color: "var(--rc-text)" }}>
        <label>{label}</label>
        <label>{format(value)}</label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- toggle

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }): React.ReactElement {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="relative inline-flex h-5 w-9 items-center">
      <span className="absolute left-0 right-0 h-[14px] rounded-lg" style={{ background: checked ? "rgba(62,146,215,.5)" : "rgba(158,158,158,.7)" }} />
      <span
        className="absolute h-5 w-5 rounded-full transition-transform"
        style={{
          transform: `translateX(${checked ? 16 : 0}px)`,
          background: checked ? "#3e92d7" : "#fafafa",
          boxShadow: "0 2px 1px -1px rgba(0,0,0,.2), 0 1px 1px 0 rgba(0,0,0,.14), 0 1px 3px 0 rgba(0,0,0,.12)",
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------- pill tabs

export function PillTabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: { value: T; label: string }[]; onChange: (v: T) => void }): React.ReactElement {
  return (
    <div role="tablist" className="flex justify-center gap-0">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className="h-[30px] min-w-[100px] rounded-full px-6 text-sm"
            style={{ color: active ? "var(--rc-green)" : "var(--rc-tab-idle)", fontWeight: active ? 500 : 400, background: active ? "var(--rc-ink)" : "transparent" }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function HelpTip({ text }: { text: string }): React.ReactElement {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button type="button" aria-label={text} className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-black" onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
        ?
      </button>
      {show && (
        <span role="tooltip" className="absolute left-1/2 top-8 z-10 w-56 -translate-x-1/2 rounded px-2 py-1.5 text-xs text-white" style={{ background: "rgba(97,97,97,.92)" }}>
          {text}
        </span>
      )}
    </span>
  );
}

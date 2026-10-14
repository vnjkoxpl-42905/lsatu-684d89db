import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePassages, usePreferences, useSavePreferences, useSessions, useReadingProfile, useSaveReadingProfile } from "../hooks/useReadingCenterData";
import { DEFAULT_PREFERENCES, STAT_PERIODS, THEMES } from "../lib/constants";
import { effectiveWpm } from "../lib/timing";
import { readingTestWpm, recommendedGoal } from "../lib/goals";
import { buildTextModel } from "../lib/spreeder";
import type { Preferences, ReaderTheme, ReadingSession } from "../lib/types";
import { Icon, MIcon } from "../components/Icon";
import { TopBar } from "../components/AppShell";
import { SpeedGauge } from "../components/SpeedGauge";
import { DialogHeader, Dropdown, Modal } from "../components/spreeder-ui";
import { PreferencesDialog } from "../components/ReaderDialogs";

type Metric = "speed" | "focus" | "time";
const METRICS: { value: Metric; label: string }[] = [
  { value: "speed", label: "Reading Speed" },
  { value: "focus", label: "Reading Focus" },
  { value: "time", label: "Training Time" },
];

function median(v: number[]): number {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function useSince(period: string): string {
  return useMemo(() => new Date(Date.now() - (STAT_PERIODS.find((p) => p.value === period)?.ms ?? STAT_PERIODS[3].ms)).toISOString(), [period]);
}

function series(sessions: ReadingSession[], metric: Metric): { x: string; y: number }[] {
  const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (metric === "speed") return sessions.map((s) => ({ x: day(s.ended_at), y: effectiveWpm(s.words_read, s.active_ms) }));
  const by = new Map<string, ReadingSession[]>();
  for (const s of sessions) by.set(day(s.ended_at), [...(by.get(day(s.ended_at)) ?? []), s]);
  return [...by.entries()].map(([x, list]) =>
    metric === "time"
      ? { x, y: Math.round(list.reduce((n, s) => n + s.active_ms, 0) / 60000) }
      : { x, y: Math.round((list.reduce((n, s) => n + s.active_ms / Math.max(1, s.active_ms + s.paused_ms), 0) / list.length) * 100) },
  );
}

function Chart({ data, metric }: { data: { x: string; y: number }[]; metric: Metric }): React.ReactElement {
  const unit = metric === "speed" ? "WPM" : metric === "focus" ? "%" : "min";
  return (
    <ResponsiveContainer width="100%" height="100%">
      {metric === "speed" ? (
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="rgba(128,128,128,.25)" vertical={false} />
          <XAxis dataKey="x" tick={{ fontSize: 11, fill: "currentColor" }} />
          <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
          <Tooltip formatter={(v: number) => [`${v} ${unit}`, "Speed"]} />
          <Line type="monotone" dataKey="y" stroke="#34ad07" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="rgba(128,128,128,.25)" vertical={false} />
          <XAxis dataKey="x" tick={{ fontSize: 11, fill: "currentColor" }} />
          <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
          <Tooltip formatter={(v: number) => [`${v} ${unit}`, metric === "focus" ? "Focus" : "Time"]} />
          <Bar dataKey="y" fill="#3e92d7" isAnimationActive={false} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

const Empty = () => (
  <div className="flex h-full items-center justify-center text-base font-medium" style={{ color: "var(--rc-text)" }}>
    Nothing just yet. Your results will appear here later <span className="ml-1.5 text-2xl" aria-hidden>🙂</span>
  </div>
);

function Card({ title, children, period, onPeriod, onRefresh }: { title: string; children: React.ReactNode; period?: string; onPeriod?: (p: string) => void; onRefresh?: () => void }): React.ReactElement {
  return (
    <section className="flex h-[230px] min-w-0 flex-col overflow-hidden rounded-[15px] p-2" style={{ background: "var(--rc-card)" }}>
      <div className="flex min-h-[38px] min-w-0 flex-wrap items-center justify-between gap-1 px-2">
        <h6 className="min-w-0 text-sm sm:text-lg">{title}</h6>
        {onPeriod && period && (
          <div className="flex items-center gap-2">
            <button type="button" aria-label={`Refresh ${title}`} onClick={onRefresh} className="flex"><Icon name="refresh" size={22} /></button>
            <Dropdown ariaLabel={`${title} period`} value={period} options={STAT_PERIODS.map((p) => ({ value: p.value, label: p.value === "6m" ? "6 months" : p.label }))} onChange={(v) => onPeriod(String(v))} buttonStyle={{ border: "none", padding: "0 0 0 8px", fontSize: 16, fontWeight: 400, color: "var(--rc-text)" }} />
          </div>
        )}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

function MetricCard({ title, metric, initial }: { title: string; metric: Metric; initial: string }): React.ReactElement {
  const [period, setPeriod] = useState(initial);
  const q = useSessions(useSince(period));
  const data = series(q.data ?? [], metric);
  return (
    <Card title={title} period={period} onPeriod={setPeriod} onRefresh={() => void q.refetch()}>
      {q.error ? <p role="alert" className="p-4 text-sm">Your saved stats could not load. Use Refresh to try again.</p> : data.length === 0 ? <Empty /> : <Chart data={data} metric={metric} />}
    </Card>
  );
}

export default function ProfilePage(): React.ReactElement {
  const prefsQuery = usePreferences();
  const prefs = prefsQuery.data ?? DEFAULT_PREFERENCES;
  const savePrefs = useSavePreferences();
  const [tab, setTab] = useState<"dashboard" | "stats">("dashboard");
  const [options, setOptions] = useState(false);
  const [dialog, setDialog] = useState<"goals" | "settings" | "profile" | "recommend" | null>(null);
  const profileQuery = useReadingProfile();
  const name = profileQuery.data ?? "Reader";
  const saveProfile = useSaveReadingProfile();
  const recent = useSessions(useSince("30d")).data ?? [];
  const currentSpeed = median(recent.slice(-5).map((s) => effectiveWpm(s.words_read, s.active_ms)));
  const optionsBtn = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="min-h-screen">
      <TopBar />
      {(prefsQuery.error || profileQuery.error) && <p role="alert" className="px-6 py-3 text-sm">Your saved profile or preferences could not load. <button type="button" className="underline" onClick={() => { void prefsQuery.refetch(); void profileQuery.refetch(); }}>Try again</button></p>}
      <div className="space-y-4 px-[26px] pb-10">
        <section className="relative flex min-h-[180px] flex-col gap-4 rounded-[15px] p-4 sm:p-0" style={{ background: "var(--rc-card)" }}>
          <div className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full bg-white text-black sm:absolute sm:left-7 sm:top-5">
            <Icon name="person" size={40} />
          </div>
          <div className="min-w-0 break-words text-lg font-bold sm:absolute sm:left-[128px] sm:top-5 sm:text-[25px]">{name}'s Reading Center</div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:absolute sm:bottom-[10px] sm:right-[30px]">
            {(["dashboard", "stats"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className="h-10 rounded-full px-3 text-sm sm:px-5" style={{ background: tab === t ? "var(--rc-nav-active-bg)" : "transparent", color: "var(--rc-text)" }}>
                {t === "dashboard" ? "Dashboard" : "Stats"}
              </button>
            ))}
            <button ref={optionsBtn} type="button" aria-haspopup="menu" aria-expanded={options} onClick={() => setOptions((o) => !o)} className="flex h-10 items-center pl-4 text-sm">
              Options <MIcon name="arrow_drop_down" />
            </button>
          </div>
        </section>

        {tab === "dashboard" ? (
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <Card title="Vital Stats">
              <div className="grid h-full grid-cols-2 items-start pt-3 text-center">
                {[["Current Speed", currentSpeed], ["Target Speed", prefs.goal_wpm]].map(([label, v]) => (
                  <div key={label as string} className="flex min-w-0 flex-col items-center gap-2 [&>svg]:max-w-full">
                    <h6 className="text-[15px] font-light">{label}</h6>
                    <SpeedGauge value={v as number} />
                  </div>
                ))}
              </div>
            </Card>
            <MetricCard title="Reading Focus" metric="focus" initial="30d" />
            <MetricCard title="Training Time" metric="time" initial="6m" />
            <MetricCard title="Reading Speed" metric="speed" initial="30d" />
          </div>
        ) : (
          <StatsTab />
        )}
      </div>

      {options && (
        <OptionsMenu
          anchor={optionsBtn.current!.getBoundingClientRect()}
          theme={prefs.theme}
          onTheme={(t) => savePrefs.mutate({ theme: t })}
          onClose={() => setOptions(false)}
          onPick={(d) => { setOptions(false); setDialog(d); }}
        />
      )}
      <GoalsDialog open={dialog === "goals"} value={prefs.goal_wpm} onClose={() => setDialog(null)} onSet={(g) => savePrefs.mutate({ goal_wpm: g })} onRecommend={() => setDialog("recommend")} />
      {dialog === "recommend" && <RecommendGoals onClose={() => setDialog(null)} onSet={(g) => { savePrefs.mutate({ goal_wpm: g }); setDialog(null); }} />}
      <PreferencesDialog open={dialog === "settings"} onClose={() => setDialog(null)} prefs={prefs} onChange={(p: Partial<Preferences>) => savePrefs.mutate(p)} name={name} settingsOnly />
      {dialog === "profile" && <EditProfile name={name} onClose={() => setDialog(null)} onSave={(n) => saveProfile.mutate(n, { onSuccess: () => setDialog(null) })} />}
    </div>
  );
}

function StatsTab(): React.ReactElement {
  const [metric, setMetric] = useState<Metric>("speed");
  const [period, setPeriod] = useState("30d");
  const statsQuery = useSessions(useSince(period));
  const data = series(statsQuery.data ?? [], metric);
  const plain = { border: "none", padding: "0 0 0 8px", fontSize: 14, fontWeight: 400, color: "var(--rc-text)" };
  return (
    <section className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-[15px] p-3" style={{ background: "var(--rc-card)" }}>
      <div className="flex items-center justify-between">
        <Dropdown ariaLabel="Metric" value={metric} options={METRICS} onChange={(v) => setMetric(v as Metric)} buttonStyle={plain} />
        <Dropdown ariaLabel="Period" value={period} options={STAT_PERIODS.map((p) => ({ value: p.value, label: p.label }))} onChange={(v) => setPeriod(String(v))} buttonStyle={plain} />
      </div>
      {statsQuery.error ? <p role="alert" className="p-6 text-sm">Your saved stats could not load. <button type="button" className="underline" onClick={() => void statsQuery.refetch()}>Try again</button></p> : data.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <div className="flex h-[150px] w-[150px] items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,.25)" }}>
            <div className="flex h-[74px] w-[74px] items-center justify-center rounded-md bg-white text-[#252525]"><Icon name="statsChart" size={44} /></div>
          </div>
          <div className="mt-4 text-[28px]">Not Enough Data</div>
          <p className="mt-2 text-sm font-medium">We don't have enough data to display your stats yet.<br />Use the app for a while and come back soon.</p>
        </div>
      ) : (
        <div className="mt-4 h-[300px]"><Chart data={data} metric={metric} /></div>
      )}
    </section>
  );
}

function OptionsMenu({ anchor, theme, onTheme, onClose, onPick }: { anchor: DOMRect; theme: ReaderTheme; onTheme: (t: ReaderTheme) => void; onClose: () => void; onPick: (d: "goals" | "settings" | "profile") => void }): React.ReactElement {
  const [sub, setSub] = useState(false);
  useEffect(() => {
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-rc-options]") && onClose();
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);
  const label = THEMES.find((t) => t.value === theme)?.label ?? "System";
  return createPortal(
    <div data-rc-options className="fixed z-50" style={{ left: anchor.left - 10, top: anchor.bottom + 4 }}>
      <div role="menu" className="rc-menu w-[150px]">
        <button type="button" className="rc-menu-item h-12 justify-between text-sm" onMouseEnter={() => setSub(true)} onClick={() => setSub((s) => !s)}>
          Theme: {label} <MIcon name="arrow_right" size={20} />
        </button>
        <button type="button" className="rc-menu-item h-12 text-sm" onClick={() => onPick("profile")}><Icon name="person" size={18} /> Edit Profile</button>
        <button type="button" className="rc-menu-item h-12 text-sm" onClick={() => onPick("goals")}><Icon name="flag" size={18} /> Goals</button>
        <button type="button" className="rc-menu-item h-12 text-sm" onClick={() => onPick("settings")}><Icon name="settings" size={18} /> Settings</button>
      </div>
      {sub && (
        <div role="menu" className="rc-menu absolute right-[150px] top-0 w-[160px]">
          {THEMES.map((t) => (
            <button key={t.value} type="button" data-active={t.value === theme} className="rc-menu-item h-12 text-sm" onClick={() => { onTheme(t.value); onClose(); }}>{t.label}</button>
          ))}
        </div>
      )}
    </div>,
    document.getElementById("reading-center-root") ?? document.body,
  );
}

function GoalsDialog({ open, value, onClose, onSet, onRecommend }: { open: boolean; value: number; onClose: () => void; onSet: (g: number) => void; onRecommend: () => void }): React.ReactElement {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (open) setLocal(value);
  }, [open, value]);
  const pct = ((local - 50) / (5000 - 50)) * 100;
  return (
    <Modal open={open} onClose={onClose} width={480} closeOnEscape labelledBy="rc-goals-title">
      <DialogHeader id="rc-goals-title" title="Goals" onClose={onClose} />
      <div className="px-4 pt-8 sm:px-12">
        <input type="range" min={50} max={5000} step={10} value={local} onChange={(e) => setLocal(Number(e.target.value))} aria-label="Reading Speed Goal (WPM)" className="rc-goal-range w-full" style={{ background: `linear-gradient(to right, #3e92d7 ${pct}%, rgba(128,128,128,.5) ${pct}%)` }} />
        <div className="mt-4 flex justify-between text-sm font-bold"><span>Reading Speed Goal (WPM):</span><span>{local}</span></div>
        <p className="mt-1 max-w-[320px] text-[13px] leading-5">Please enter your goal reading speed in words per minute (WPM). An average person reads at 200 words per minute. We recommend starting with a goal of 600 WPM.</p>
      </div>
      <div className="mt-10 flex flex-wrap justify-end gap-1.5 px-4 pb-4 sm:px-8">
        <button type="button" className="rc-outline-btn h-[38px]" style={{ borderColor: "var(--rc-outline-2)" }} onClick={onClose}>Cancel</button>
        <button type="button" className="rc-outline-btn h-[38px]" style={{ borderColor: "var(--rc-outline-2)" }} onClick={onRecommend}>Recommend</button>
        <button type="button" className="rc-green-btn w-[100px]" onClick={() => { onSet(local); onClose(); }}>Set</button>
      </div>
    </Modal>
  );
}

/** Goal Recommendation Test: read a text at your normal pace, then Spreeder's curve suggests a goal. */
function RecommendGoals({ onClose, onSet }: { onClose: () => void; onSet: (g: number) => void }): React.ReactElement {
  const passages = (usePassages().data ?? []).filter((p) => p.is_published);
  const [step, setStep] = useState<"intro" | "pick" | "read" | "result">("intro");
  const [passageId, setPassageId] = useState<string>("");
  const [startedAt, setStartedAt] = useState(0);
  const [canFinish, setCanFinish] = useState(false);
  const [speed, setSpeed] = useState(0);
  const passage = passages.find((p) => p.id === passageId) ?? passages[0];
  const words = useMemo(() => (passage ? buildTextModel(passage.body).words.length : 0), [passage]);
  const goal = recommendedGoal(speed);
  const blue = "#3e92d7";
  return (
    <Modal open onClose={onClose} fullScreen labelledBy="rc-rec-title">
      <div className="flex h-full flex-col px-[34px] pt-5" style={{ background: "var(--rc-page)" }}>
        <div className="flex items-center justify-between">
          <h2 id="rc-rec-title" className="text-xl">Goal Recommendation Test</h2>
          <button type="button" aria-label="Close" onClick={onClose}><MIcon name="close" /></button>
        </div>
        {step === "intro" && (
          <div className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
            <Icon name="flag" size={84} style={{ color: blue }} />
            <h3 className="mt-6 text-[44px] leading-tight" style={{ color: blue }}>Recommend Goals</h3>
            <p className="mt-5 text-lg font-medium">Please complete the following test and the Reading Center will recommend your ideal goals.</p>
            <button type="button" disabled={!passages.length} className="mt-8 h-[60px] w-[200px] rounded text-base font-medium text-white disabled:opacity-40" style={{ background: "#2c7a0b" }} onClick={() => setStep("pick")}>Start</button>
          </div>
        )}
        {step === "pick" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 pb-24">
            <p className="text-lg">Choose a text to read at your normal pace.</p>
            <Dropdown ariaLabel="Test text" minWidth={320} value={passage?.id ?? ""} options={passages.map((p) => ({ value: p.id, label: p.title }))} onChange={(v) => setPassageId(String(v))} />
            <button type="button" className="rc-green-btn w-[200px]" onClick={() => { setStartedAt(Date.now()); setCanFinish(false); setStep("read"); }}>Begin reading</button>
          </div>
        )}
        {step === "read" && passage && (
          <div className="flex min-h-0 flex-1 flex-col pb-5">
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[10px] p-6 text-lg leading-8" style={{ background: "var(--rc-surface)", color: "var(--rc-read)" }} onScroll={(e) => { const t = e.currentTarget; if (Math.round(t.scrollTop) >= t.scrollHeight - t.offsetHeight - 1) setCanFinish(true); }} ref={(el) => { if (el && el.scrollHeight <= el.clientHeight + 1 && !canFinish) setCanFinish(true); }}>
              {buildTextModel(passage.body).words.map((w) => w.text).join(" ")}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" disabled={!canFinish} className="rc-green-btn w-[160px]" onClick={() => { setSpeed(readingTestWpm(words, (Date.now() - startedAt) / 1000)); setStep("result"); }}>Done</button>
            </div>
          </div>
        )}
        {step === "result" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-24 text-center">
            <p className="text-2xl">Your reading speed was {speed} words per minute</p>
            <p className="text-lg">Recommended reading speed goal: <strong>{goal} WPM</strong></p>
            <button type="button" className="rc-green-btn mt-4 w-[200px]" onClick={() => onSet(goal)}>Set goals</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function EditProfile({ name, onClose, onSave }: { name: string; onClose: () => void; onSave: (n: string) => void }): React.ReactElement {
  const [v, setV] = useState(name);
  return (
    <Modal open onClose={onClose} width={420} closeOnEscape labelledBy="rc-ep-title">
      <DialogHeader id="rc-ep-title" title="Edit Profile" onClose={onClose} />
      <label className="mt-6 block px-5 text-xs" style={{ color: "var(--rc-text-2)" }}>
        First name
        <input value={v} onChange={(e) => setV(e.target.value)} className="mt-1 block w-full bg-transparent pb-1 text-base outline-none" style={{ borderBottom: "1px solid #ccc", color: "var(--rc-strong)" }} />
      </label>
      <div className="mt-8 flex justify-end gap-1.5 px-5 pb-4">
        <button type="button" className="rc-outline-btn h-[38px]" onClick={onClose}>Cancel</button>
        <button type="button" className="rc-green-btn" onClick={() => onSave(v)}>Save</button>
      </div>
    </Modal>
  );
}

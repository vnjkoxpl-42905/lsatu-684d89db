import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Preferences, ReaderTheme, ReadingMode } from "../lib/types";
import {
  DEFAULT_PREFERENCES,
  FONTS,
  FONT_SIZES,
  LINES_MAX,
  LINES_MIN,
  LINE_SPACING_MAX,
  LINE_SPACING_MIN,
  LINE_SPACING_STEP,
  READING_MODES,
  THEMES,
  WORDS_PER_LINE_MAX,
  WORDS_PER_LINE_MIN,
} from "../lib/constants";

type Change = (partial: Partial<Preferences>) => void;

function fontStack(label: string): string {
  return FONTS.find((f) => f.label === label)?.stack ?? FONTS[0].stack;
}

function LabeledSlider({
  label,
  value,
  min,
  max,
  step = 1,
  format = String,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} aria-label={label} />
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{format(value)}</span>
      </div>
    </div>
  );
}

function ModeSelect({ prefs, onChange }: { prefs: Preferences; onChange: Change }): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <Label>Reading Mode</Label>
      <Select value={prefs.reading_mode} onValueChange={(v) => onChange({ reading_mode: v as ReadingMode })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {READING_MODES.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AppearanceControls({ prefs, onChange }: { prefs: Preferences; onChange: Change }): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Theme</Label>
        <Select value={prefs.theme} onValueChange={(v) => onChange({ theme: v as ReaderTheme })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {THEMES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <div className="space-y-1.5">
          <Label>Font</Label>
          <Select value={prefs.font_family} onValueChange={(v) => onChange({ font_family: v })}>
            <SelectTrigger style={{ fontFamily: fontStack(prefs.font_family) }}><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONTS.map((f) => (
                <SelectItem key={f.label} value={f.label} style={{ fontFamily: f.stack }}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Size</Label>
          <Select value={String(prefs.font_size)} onValueChange={(v) => onChange({ font_size: Number(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Sample Text</Label>
        <div
          className="h-24 overflow-hidden rounded-md border px-3 py-2"
          style={{ fontFamily: fontStack(prefs.font_family), fontSize: `${prefs.font_size}px`, lineHeight: prefs.line_spacing }}
        >
          The quick brown fox jumps over the lazy dog.
        </div>
      </div>
    </div>
  );
}

function SwitchRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{label}</span>
        {help && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={`About ${label}`} className="text-muted-foreground">
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{help}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export function PreferencesDialog({
  open,
  onOpenChange,
  prefs,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: Preferences;
  onChange: Change;
}): React.ReactElement {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mode = prefs.reading_mode;
  const wordsPerLine = (
    <LabeledSlider
      label="Words Per Line"
      value={prefs.words_per_line}
      min={WORDS_PER_LINE_MIN}
      max={WORDS_PER_LINE_MAX}
      onChange={(v) => onChange({ words_per_line: v })}
    />
  );
  const numberOfLines = (
    <LabeledSlider
      label="Number of Lines"
      value={prefs.number_of_lines}
      min={LINES_MIN}
      max={LINES_MAX}
      onChange={(v) => onChange({ number_of_lines: v })}
    />
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preferences</DialogTitle>
          </DialogHeader>

          {mode === "ereader" ? (
            <div className="space-y-4">
              <ModeSelect prefs={prefs} onChange={onChange} />
              <AppearanceControls prefs={prefs} onChange={onChange} />
              <LabeledSlider
                label="Line Spacing"
                value={prefs.line_spacing}
                min={LINE_SPACING_MIN}
                max={LINE_SPACING_MAX}
                step={LINE_SPACING_STEP}
                format={(v) => v.toFixed(1)}
                onChange={(v) => onChange({ line_spacing: Math.round(v * 10) / 10 })}
              />
            </div>
          ) : (
            <Tabs defaultValue="spreed">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="spreed">Reading</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              <TabsContent value="spreed" className="space-y-5 pt-3">
                <ModeSelect prefs={prefs} onChange={onChange} />
                {mode === "serial" && (
                  <>
                    {numberOfLines}
                    {wordsPerLine}
                    <SwitchRow label="Center Text" checked={prefs.center_text} onChange={(v) => onChange({ center_text: v })} />
                  </>
                )}
                {(mode === "flow" || mode === "scroll") && wordsPerLine}
                {mode === "highlight" && (
                  <>
                    {wordsPerLine}
                    {numberOfLines}
                  </>
                )}
              </TabsContent>
              <TabsContent value="appearance" className="pt-3">
                <AppearanceControls prefs={prefs} onChange={onChange} />
              </TabsContent>
              <TabsContent value="advanced" className="space-y-4 pt-3">
                <SwitchRow
                  label="Punctuation Pauses"
                  help="Slight pause at the end of sentences and punctuation marks. Only works with one word at a time."
                  checked={prefs.punctuation_pauses}
                  onChange={(v) => onChange({ punctuation_pauses: v })}
                />
                <SwitchRow
                  label="Speed Variability"
                  help="Gives longer words a little more time and shorter words a little less, at the same overall speed."
                  checked={prefs.speed_variability}
                  onChange={(v) => onChange({ speed_variability: v })}
                />
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>Restore Defaults</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore all reading settings to their defaults?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onChange({ ...DEFAULT_PREFERENCES, goal_wpm: prefs.goal_wpm })}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

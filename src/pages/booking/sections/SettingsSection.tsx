import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SectionHeader } from "../BookingWorkspace";
import { durationLabel, loadDefaults, saveDefaults } from "../api";

const SESSION_LENGTHS = ["30", "45", "60", "70", "90", "120"];

// Admin-side defaults only: they prefill the New Pass dialog on this device.
export default function SettingsSection() {
  const initial = loadDefaults();
  const [credits, setCredits] = useState(String(initial.credits));
  const [sessionLen, setSessionLen] = useState(String(initial.sessionLen));
  const [expiryDays, setExpiryDays] = useState(initial.expiryDays ? String(initial.expiryDays) : "");

  function save() {
    const c = Number(credits), s = Number(sessionLen), e = expiryDays ? Number(expiryDays) : null;
    if (!c || c < 1) { toast.error("Enter a valid default credit amount"); return; }
    saveDefaults({ credits: c, sessionLen: s || 70, expiryDays: e });
    toast.success("Defaults saved");
  }

  return (
    <div>
      <SectionHeader title="Settings" subtitle="Defaults for new passes. Saved on this device; existing passes are not affected." />
      <div className="px-8 py-6">
        <div className="booking-shadow max-w-md space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <Label>Default credits per pass</Label>
            <Input type="number" min={1} max={50} value={credits} onChange={e => setCredits(e.target.value)} />
          </div>
          <div>
            <Label>Default session length</Label>
            <Select value={sessionLen} onValueChange={setSessionLen}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="booking-holo">
                {SESSION_LENGTHS.map(v => <SelectItem key={v} value={v}>{durationLabel(Number(v))}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default expiry (days after creation, blank = none)</Label>
            <Input type="number" min={1} max={365} value={expiryDays} onChange={e => setExpiryDays(e.target.value)} placeholder="e.g. 90" />
          </div>
          <Button className="holo-surface border-0" onClick={save}>Save defaults</Button>
        </div>
      </div>
    </div>
  );
}

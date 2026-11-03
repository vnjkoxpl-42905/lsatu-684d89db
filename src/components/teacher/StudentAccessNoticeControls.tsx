import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function StudentAccessNoticeControls({ studentId }: { studentId: string }) {
  const [pauseTime, setPauseTime] = useState("");
  const [showTime, setShowTime] = useState("");
  const [message, setMessage] = useState<string>();
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const current = useQuery({
    queryKey: ["student-access-notice-admin", studentId],
    queryFn: async () => {
      const result = await supabase.from("student_access_notices" as never)
        .select("pause_at,show_at,message,kind").eq("student_id", studentId).maybeSingle();
      if (result.error) throw result.error;
      return result.data as { pause_at: string | null; show_at: string; message: string; kind: string } | null;
    },
  });

  async function save(kind: "expiration" | "restored" | "announcement", showNow = false, startOneDay = false) {
    setSaving(true);
    setStatus("");
    try {
      const pause = pauseTime ? new Date(pauseTime).toISOString() : current.data?.pause_at;
      if (kind === "expiration" && !pause && !startOneDay) {
        setStatus("Choose when access should pause.");
        return;
      }
      const result = await supabase.rpc("set_student_access_notice" as never, {
        student: studentId,
        start_one_day_notice: startOneDay,
        notice_kind: kind,
        pause_time: kind === "expiration" ? pause : null,
        show_time: showNow ? new Date().toISOString() : showTime ? new Date(showTime).toISOString() : null,
        notice_message: message ?? (kind === current.data?.kind ? current.data.message : ""),
      } as never);
      if (result.error) throw result.error;
      await current.refetch();
      setPauseTime("");
      setShowTime("");
      setMessage(undefined);
      setStatus(kind === "restored" ? "Access restored. Notice saved." : "Notice saved.");
    } catch (error) {
      setStatus(typeof error === "object" && error && "message" in error
        ? String(error.message) : "Couldn’t save the notice.");
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving || !current.isSuccess;
  return (
    <section className="space-y-3 border-t border-black/10 pt-3">
      <h3 className="text-sm font-semibold">Student access and notices</h3>
      {current.isError && <p role="alert">Couldn’t load student access.</p>}
      {current.data?.pause_at && <p className="text-sm">
        Access pause time {new Date(current.data.pause_at).toLocaleString()}.
      </p>}
      <label className="block text-sm">Pause time (your local time)
        <Input type="datetime-local" value={pauseTime} onChange={(event) => setPauseTime(event.target.value)} />
      </label>
      <label className="block text-sm">Show notice at (optional)
        <Input type="datetime-local" value={showTime} onChange={(event) => setShowTime(event.target.value)} />
      </label>
      <label className="block text-sm">Custom message
        <Textarea value={message ?? current.data?.message ?? ""} maxLength={2000}
          onChange={(event) => setMessage(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={() => save("expiration")}>Schedule pause</Button>
        <Button disabled={disabled} variant="outline" onClick={() => save("expiration", true, true)}>Start 24-hour notice</Button>
        <Button disabled={disabled} variant="outline" onClick={() => save("expiration", true)}>Show expiration notice now</Button>
        {current.data?.pause_at
          ? <Button disabled={disabled} variant="outline" onClick={() => save("restored", true)}>Resume access</Button>
          : <Button disabled={disabled} variant="outline" onClick={() => save("announcement")}>Send alert</Button>}
      </div>
      {status && <p role="status" className="text-sm">{status}</p>}
    </section>
  );
}

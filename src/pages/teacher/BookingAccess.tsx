import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";

/**
 * Who can book what, and at what price.
 *
 * This is the screen that replaces making a whole new Cal.com event type every
 * time one person pays a different rate. Three things live here:
 *
 *   - the events themselves (length, buffers, window, default price)
 *   - per-person prices, keyed by email because a booker need not be signed in
 *   - per-student offers: which offers a signed-in student sees at all
 *
 * Everything writes straight to the tables under admin RLS. There is no edge
 * function in the way, so what this screen shows is what the booking page reads.
 */

type EventType = {
  slug: string;
  label: string;
  length_minutes: number;
  slot_interval_minutes: number | null;
  minimum_notice_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  window_business_days: number;
  price_cents: number;
  currency: string;
  requires_payment: boolean;
  active: boolean;
};

type PriceOverride = { email: string; event_slug: string; price_cents: number; note: string | null };

type Offer = { id: string; label: string; provider: string; url: string; credits: number; active: boolean };

type StudentOffer = { student_id: string; offer_id: string; enabled: boolean; url_override: string | null };

type Student = { class_id: string; display_name: string | null };

/**
 * booking_event_types and booking_price_overrides landed after the last types
 * generation, so the typed client does not know their names yet. Casting here
 * beats hand-editing the generated types file, which would be overwritten the
 * next time it is regenerated. Drop this once the types catch up.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseTable = any;
const db = supabase as unknown as { from: (table: string) => LooseTable };

const dollars = (cents: number) => (cents / 100).toFixed(2);
const cents = (value: string) => Math.round(Number(value || "0") * 100);

export default function BookingAccess() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [overrides, setOverrides] = useState<PriceOverride[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentOffers, setStudentOffers] = useState<StudentOffer[]>([]);
  const [picked, setPicked] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // New price override, held separately so a half-typed row never writes.
  const [newEmail, setNewEmail] = useState("");
  const [newEvent, setNewEvent] = useState("single-session");
  const [newPrice, setNewPrice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, o, off, st] = await Promise.all([
        db.from("booking_event_types").select("*").order("slug"),
        db.from("booking_price_overrides").select("*").order("email"),
        db.from("booking_offers").select("id,label,provider,url,credits,active").order("id"),
        supabase.from("profiles").select("class_id,display_name").order("display_name"),
      ]);
      if (e.error) throw e.error;
      setEvents((e.data ?? []) as EventType[]);
      setOverrides((o.data ?? []) as PriceOverride[]);
      setOffers((off.data ?? []) as Offer[]);
      setStudents((st.data ?? []) as Student[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load booking access");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // A student with no rows at all is on the default arrangement: every active
  // offer. Rows only appear once Joshua has decided something for them.
  useEffect(() => {
    if (!picked) { setStudentOffers([]); return; }
    void (async () => {
      const { data, error } = await db
        .from("student_booking_offers")
        .select("student_id,offer_id,enabled,url_override")
        .eq("student_id", picked);
      if (error) { toast.error(error.message); return; }
      setStudentOffers((data ?? []) as StudentOffer[]);
    })();
  }, [picked]);

  const saveEvent = async (event: EventType) => {
    setSaving(event.slug);
    const { error } = await db
      .from("booking_event_types")
      .update({
        price_cents: event.price_cents,
        length_minutes: event.length_minutes,
        buffer_before_minutes: event.buffer_before_minutes,
        buffer_after_minutes: event.buffer_after_minutes,
        window_business_days: event.window_business_days,
        minimum_notice_minutes: event.minimum_notice_minutes,
        active: event.active,
      } as never)
      .eq("slug", event.slug);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${event.label} saved`);
  };

  const addOverride = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !newPrice.trim()) { toast.error("Email and price are both needed"); return; }
    setSaving("override");
    const { error } = await db
      .from("booking_price_overrides")
      .upsert({ email, event_slug: newEvent, price_cents: cents(newPrice) } as never,
        { onConflict: "email,event_slug" });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    setNewEmail(""); setNewPrice("");
    toast.success(`${email} pays $${Number(newPrice).toFixed(2)}`);
    await load();
  };

  const removeOverride = async (row: PriceOverride) => {
    const { error } = await db
      .from("booking_price_overrides").delete()
      .eq("email", row.email).eq("event_slug", row.event_slug);
    if (error) { toast.error(error.message); return; }
    toast.success("Back to the default price");
    await load();
  };

  const setOfferForStudent = async (offerId: string, enabled: boolean) => {
    if (!picked) return;
    const { error } = await db
      .from("student_booking_offers")
      .upsert({ student_id: picked, offer_id: offerId, enabled } as never,
        { onConflict: "student_id,offer_id" });
    if (error) { toast.error(error.message); return; }
    setStudentOffers((rows) => {
      const next = rows.filter((row) => row.offer_id !== offerId);
      return [...next, { student_id: picked, offer_id: offerId, enabled, url_override: null }];
    });
  };

  const pickedStudent = useMemo(
    () => students.find((student) => student.class_id === picked) ?? null,
    [picked, students],
  );

  if (loading) {
    return <main className="min-h-screen p-8"><Loader2 className="h-6 w-6 animate-spin" /></main>;
  }

  return (
    <main className="min-h-screen space-y-8 p-6 sm:p-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Booking access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What each event is, what it costs, and who is allowed to book it.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Events</h2>
        {events.map((event) => (
          <Card key={event.slug} className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-40">
                <div className="font-medium">{event.label}</div>
                <div className="text-xs text-muted-foreground">{event.slug}</div>
              </div>
              <Field label="Price ($)" value={dollars(event.price_cents)} disabled={!event.requires_payment}
                onChange={(v) => setEvents((rows) => rows.map((r) => r.slug === event.slug ? { ...r, price_cents: cents(v) } : r))} />
              <Field label="Minutes" value={String(event.length_minutes)}
                onChange={(v) => setEvents((rows) => rows.map((r) => r.slug === event.slug ? { ...r, length_minutes: Number(v || 0) } : r))} />
              <Field label="Buffer before" value={String(event.buffer_before_minutes)}
                onChange={(v) => setEvents((rows) => rows.map((r) => r.slug === event.slug ? { ...r, buffer_before_minutes: Number(v || 0) } : r))} />
              <Field label="Buffer after" value={String(event.buffer_after_minutes)}
                onChange={(v) => setEvents((rows) => rows.map((r) => r.slug === event.slug ? { ...r, buffer_after_minutes: Number(v || 0) } : r))} />
              <Field label="Days ahead" value={String(event.window_business_days)}
                onChange={(v) => setEvents((rows) => rows.map((r) => r.slug === event.slug ? { ...r, window_business_days: Number(v || 0) } : r))} />
              <Button onClick={() => void saveEvent(event)} disabled={saving === event.slug}>
                {saving === event.slug ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </div>
            {!event.requires_payment ? (
              <p className="mt-3 text-xs text-muted-foreground">Free event. Price is ignored and no payment is taken.</p>
            ) : null}
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Prices for particular people</h2>
        <p className="text-sm text-muted-foreground">
          Overrides the event price for one email. This is what a reduced rate is: one row, not a new event.
        </p>
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <div className="grow">
            <Label htmlFor="override-email">Email</Label>
            <Input id="override-email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="student@example.com" />
          </div>
          <div>
            <Label htmlFor="override-event">Event</Label>
            <select id="override-event" className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={newEvent} onChange={(e) => setNewEvent(e.target.value)}>
              {events.filter((event) => event.requires_payment).map((event) => (
                <option key={event.slug} value={event.slug}>{event.label}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <Label htmlFor="override-price">Price ($)</Label>
            <Input id="override-price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="35.00" />
          </div>
          <Button onClick={() => void addOverride()} disabled={saving === "override"}>Set price</Button>
        </Card>
        {overrides.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody is on a special price. Everyone pays the event price.</p>
        ) : (
          <Card className="divide-y">
            {overrides.map((row) => (
              <div key={`${row.email}:${row.event_slug}`} className="flex items-center justify-between gap-4 p-3">
                <div className="text-sm">
                  <span className="font-medium">{row.email}</span>
                  <span className="text-muted-foreground"> · {row.event_slug} · ${dollars(row.price_cents)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void removeOverride(row)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">What one student can see</h2>
        <p className="text-sm text-muted-foreground">
          A student with nothing set here sees every active offer. Turn one off and it disappears from their booking page.
        </p>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={picked} onChange={(e) => setPicked(e.target.value)}>
          <option value="">Choose a student</option>
          {students.map((student) => (
            <option key={student.class_id} value={student.class_id}>
              {student.display_name || student.class_id}
            </option>
          ))}
        </select>
        {pickedStudent ? (
          <Card className="divide-y">
            {offers.filter((offer) => offer.active).map((offer) => {
              const row = studentOffers.find((studentOffer) => studentOffer.offer_id === offer.id);
              const on = row ? row.enabled : studentOffers.length === 0;
              return (
                <div key={offer.id} className="flex items-center justify-between gap-4 p-3">
                  <div className="text-sm">
                    <div className="font-medium">{offer.label}</div>
                    <div className="text-xs text-muted-foreground">{offer.id} · {offer.provider}</div>
                  </div>
                  <Switch checked={on} onCheckedChange={(next) => void setOfferForStudent(offer.id, next)} />
                </div>
              );
            })}
          </Card>
        ) : null}
      </section>
    </main>
  );
}

function Field({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = `field-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="w-28">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

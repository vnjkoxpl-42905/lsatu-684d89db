import { describe, expect, it, vi } from "vitest";
import { createPublicBookingApi, PublicBookingError } from "./publicBookingApi";
const start = "2026-12-11T17:00:00.000Z";
const valid = { ok: true, was_existing: false, redemption: { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", status: "booked", start_at: start, meet_url: null, calendar_status: "pending" } };
const reply = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data }) as Response;
describe("anonymous public booking adapter", () => {
  it("validates slugs without a request", () => {
    const fetcher = vi.fn();
    expect(() => createPublicBookingApi("../unsafe", fetcher)).toThrow(PublicBookingError);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("accepts a committed redemption with pending calendar and sends only anonymous credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue(reply(valid));
    await createPublicBookingApi("student-safe", fetcher).book(start, "same-key", "review");
    const init = fetcher.mock.calls[0][1];
    expect(init.headers.Authorization).toBe(`Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`);
    expect(init.headers.apikey).toBe(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    expect(JSON.parse(init.body)).toEqual({ slug: "student-safe", action: "book", start_at: start, idempotency_key: "same-key", student_note: "review" });
  });
  it.each([{}, null, { ...valid, ok: false }, { ...valid, was_existing: undefined }, { ...valid, redemption: { ...valid.redemption, id: "bad" } }, { ...valid, redemption: { ...valid.redemption, status: "cancelled" } }, { ...valid, redemption: { ...valid.redemption, start_at: "2026-12-11T18:00:00Z" } }])("keeps malformed success ambiguous: %j", async (data) => {
    await expect(createPublicBookingApi("student-safe", vi.fn().mockResolvedValue(reply(data))).book(start, "same-key")).rejects.toMatchObject({ status: 200, definitiveRefusal: false });
  });
  it.each([[409, "slot_conflict", true], [409, "redeem_failed", false], [503, "slot_conflict", false], [400, "unknown", false]])("classifies only confirmed precommit refusals", async (status, error, definitiveRefusal) => {
    await expect(createPublicBookingApi("student-safe", vi.fn().mockResolvedValue(reply({ error }, status as number))).book(start, "same-key")).rejects.toMatchObject({ status, code: error, definitiveRefusal });
  });
  it("preserves only the public student committed replay while teacher proof stays strict", async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ok:true,was_existing:true,redemption:null}));
    await expect(createPublicBookingApi("student-safe",fetcher,{allowMissingReplay:true}).book(start,"same-key")).resolves.toBeUndefined();
    await expect(createPublicBookingApi("student-safe",fetcher).book(start,"same-key")).rejects.toMatchObject({code:"invalid_booking_response"});
  });
  it("keeps network outcomes ambiguous", async () => {
    await expect(createPublicBookingApi("student-safe", vi.fn().mockRejectedValue(new Error("lost"))).book(start, "same-key")).rejects.toMatchObject({ status: 0, definitiveRefusal: false });
  });
  it("preserves info, slots, staged upload IDs and discard payload", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(reply({ pass: null, redemptions: [valid.redemption] })).mockResolvedValueOnce(reply({ slots: [{ start_at: start }], pass: null })).mockResolvedValueOnce(reply({ uploaded: 1, files: [{ client_upload_id: "upload-id" }] })).mockResolvedValueOnce(reply({ ok: true }));
    const api = createPublicBookingApi("student-safe", fetcher);
    expect((await api.loadInfo()).bookings?.[0]).toMatchObject({ source: "redemption", id: valid.redemption.id });
    expect((await api.loadSlots()).slots[0].start_at).toBe(start);
    const file = new File(["test"], "work.txt");
    expect(await api.uploadFiles!([{ file, clientUploadId: "upload-id" }], "same-key")).toEqual({ uploaded: 1, clientUploadIds: ["upload-id"] });
    const upload = fetcher.mock.calls[2][1];
    expect(upload.body.get("slug")).toBe("student-safe");
    expect(upload.body.get("idempotency_key")).toBe("same-key");
    expect(upload.body.get("client_upload_ids")).toBe("upload-id");
    expect(upload.body.get("files").name).toBe("work.txt");
    expect(upload.headers["Content-Type"]).toBeUndefined();
    await api.discardUpload!("upload-id", "same-key");
    expect(JSON.parse(fetcher.mock.calls[3][1].body)).toEqual({ action: "discard", slug: "student-safe", idempotency_key: "same-key", client_upload_id: "upload-id" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: mocks.getUser }, from: mocks.from },
}));

import { listPages, updateMyNotePage } from "./journalService";

describe("journal page account scope", () => {
  beforeEach(() => {
    mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: "student-1" } }, error: null });
    mocks.from.mockReset();
  });

  it("limits listing to the current user even when an admin can select other users' rows", async () => {
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue({ data: [], error: null });
    mocks.from.mockReturnValue(query);

    expect(await listPages()).toEqual([]);
    expect(mocks.from).toHaveBeenCalledWith("journal_pages");
    expect(query.eq).toHaveBeenCalledWith("user_id", "student-1");
    expect(query.eq).toHaveBeenCalledWith("is_archived", false);
  });

  it("scopes edits to the owner and rejects a zero-row update", async () => {
    const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.from.mockReturnValue(query);

    await expect(updateMyNotePage("note-1", "My note", { type: "doc", content: [] }))
      .rejects.toThrow("could not be saved");
    expect(query.eq).toHaveBeenCalledWith("id", "note-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "student-1");
    expect(query.eq).toHaveBeenCalledWith("type", "doc");
  });
});

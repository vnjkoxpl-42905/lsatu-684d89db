import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { JournalPanel } from "./JournalPanel";

vi.mock("@/lib/questionLoader", () => ({ questionBank: { getQuestion: () => null } }));

type Note = { id: string; qid: string; student_note: string; updated_at: string };

function Harness({ onSave }: { onSave: (resolve: () => void, text: string) => void }) {
  const [notes, setNotes] = React.useState(new Map<string, Note>());
  const marks: any = {
    notes,
    note: (q: string) => notes.get(q),
    hasDrawing: () => false,
    saveNote: (q: string, fields: any) =>
      new Promise<void>((res) =>
        onSave(() => {
          setNotes((prev) => new Map(prev).set(q, { id: "row-1", qid: q, student_note: fields.student_note, updated_at: "2026-11-12" }));
          res();
        }, fields.student_note),
      ),
  };
  return <JournalPanel qid="Q1" marks={marks} onClose={() => {}} />;
}

describe("JournalPanel first save", () => {
  it("keeps text typed while the first save of a new note is still running", async () => {
    vi.useFakeTimers();
    const pending: Array<{ resolve: () => void; text: string }> = [];
    render(<Harness onSave={(resolve, text) => pending.push({ resolve, text })} />);
    const box = screen.getByLabelText("Note") as HTMLTextAreaElement;

    fireEvent.change(box, { target: { value: "Hello" } });
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(pending.map((p) => p.text)).toEqual(["Hello"]);

    // Keep typing while the first save is in flight, then let it finish.
    fireEvent.change(box, { target: { value: "Hello world" } });
    await act(async () => { pending[0].resolve(); });

    expect(box.value).toBe("Hello world");
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(pending[1].text).toBe("Hello world");
    vi.useRealTimers();
  });
});

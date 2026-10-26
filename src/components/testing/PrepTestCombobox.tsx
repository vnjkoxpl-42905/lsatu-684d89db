/**
 * One way to pick a PrepTest, for both doors of the Testing Centre.
 *
 * The two doors used to disagree. The practice-test door had this combobox;
 * the section door had a plain Select, which meant 54 rows of scroll starting
 * from whichever end the bank happened to hand over, with no way to type "131"
 * and be done. Same decision, same room, two interaction models, and a student
 * who opened both doors in one sitting met both.
 *
 * Two things here are deliberate and were arrived at the hard way.
 *
 * The filter is substring, not cmdk's default fuzzy score. A PrepTest number is
 * an identifier, not a name being guessed at: commandScore keeps "PrepTest 130"
 * on screen for someone who typed 131, because the characters are all present
 * in order. Either the number is in the label or it is not.
 *
 * The result count is announced. Filtering is a status change with no other
 * signal: a sighted student watches 59 rows collapse to one, and a screen
 * reader student, before this, heard nothing at all. It is debounced because a
 * polite live region that fires on every keystroke queues up five
 * announcements for a three-digit number.
 */
import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type PrepTestOption = {
  pt: number;
  /** Appended after a middot, e.g. "79 questions". Omitted on the section door. */
  detail?: string;
};

/** The label a row carries, and the string the filter matches against. */
function optionLabel(option: PrepTestOption): string {
  return option.detail ? `PrepTest ${option.pt} · ${option.detail}` : `PrepTest ${option.pt}`;
}

/**
 * Substring match on the number. `value` is what cmdk holds for the row, which
 * is why every row is registered with its full label rather than its number:
 * matching on the number alone would stop "questions" from ever being typed,
 * which is fine, but it would also make the filter disagree with what is on
 * screen, which is not.
 */
function matches(option: PrepTestOption, query: string): boolean {
  return optionLabel(option).toLowerCase().includes(query);
}

export function PrepTestCombobox({
  emptyMessage = "No PrepTest by that number.",
  id,
  labelId,
  onChange,
  options,
  placeholder = "Choose a PrepTest",
  value,
}: {
  emptyMessage?: string;
  /** Also the second half of the trigger's own aria-labelledby. */
  id: string;
  labelId: string;
  onChange: (pt: number) => void;
  options: PrepTestOption[];
  placeholder?: string;
  value: number | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [announced, setAnnounced] = React.useState("");

  // Newest first. A student reaching for a PrepTest reaches for a recent one,
  // and the banks hand them over ascending.
  const ordered = React.useMemo(
    () => [...options].sort((a, b) => b.pt - a.pt),
    [options],
  );

  const query = search.trim().toLowerCase();
  const shown = React.useMemo(
    () => (query ? ordered.filter((o) => matches(o, query)) : ordered),
    [ordered, query],
  );

  const chosen = ordered.find((o) => o.pt === value) ?? null;

  // Announce the settled count, not every keystroke. Cleared when the box
  // closes so reopening it does not re-read a stale result.
  React.useEffect(() => {
    if (!open || !query) {
      setAnnounced("");
      return;
    }
    const id = window.setTimeout(() => {
      setAnnounced(
        shown.length === 1 ? "1 PrepTest" : `${shown.length} PrepTests`,
      );
    }, 350);
    return () => window.clearTimeout(id);
  }, [open, query, shown.length]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          // Radix's PopoverTrigger sets aria-haspopup="dialog". What opens here
          // is a listbox, and a screen reader that is told "dialog" and then
          // lands among options has been misdirected by one word.
          aria-haspopup="listbox"
          // Self-referencing, so the name carries both the field and its
          // current value. A <label for> does not name a <button>.
          aria-labelledby={`${labelId} ${id}`}
          className="w-full justify-between font-normal"
          id={id}
          role="combobox"
          variant="outline"
        >
          {chosen ? optionLabel(chosen) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="testing-menu w-[--radix-popover-trigger-width] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setSearch}
            placeholder="Search by number"
            value={search}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {shown.map((option) => (
              <CommandItem
                // CommandItem, unlike SelectItem, carries no target-size rule
                // of its own. This is the same pair ui/select.tsx uses: a
                // 44px row where the finger is the pointer, the tighter row
                // where the mouse is, so a list of 59 stays scannable.
                className="min-h-[44px] sm:min-h-0"
                key={option.pt}
                onSelect={() => {
                  onChange(option.pt);
                  setOpen(false);
                }}
                value={optionLabel(option)}
              >
                <Check
                  aria-hidden
                  className={
                    value === option.pt
                      ? "mr-2 h-4 w-4 opacity-100"
                      : "mr-2 h-4 w-4 opacity-0"
                  }
                />
                {optionLabel(option)}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        <span aria-live="polite" className="sr-only" role="status">
          {announced}
        </span>
      </PopoverContent>
    </Popover>
  );
}

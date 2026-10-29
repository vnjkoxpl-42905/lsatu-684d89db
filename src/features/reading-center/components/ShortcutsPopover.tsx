import React from "react";
import { Keyboard } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const SHORTCUTS: [string, string][] = [
  ["↑ / ↓ or + / −", "increase or decrease speed"],
  ["P or Space", "pause / resume"],
  ["→", "section forward"],
  ["←", "section back"],
  ["R", "restart"],
  ["S", "settings"],
];

export function ShortcutsPopover(): React.ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts">
          <Keyboard className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="mb-2 text-sm font-semibold">Keyboard Shortcuts</div>
        <table className="w-full text-sm">
          <tbody>
            {SHORTCUTS.map(([keys, label]) => (
              <tr key={keys}>
                <td className="py-1 pr-3 font-mono text-xs">{keys}</td>
                <td className="py-1 text-muted-foreground">{label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PopoverContent>
    </Popover>
  );
}

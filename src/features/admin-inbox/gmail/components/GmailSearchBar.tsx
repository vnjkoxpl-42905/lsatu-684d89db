import { useEffect, useState } from "react";
import { Info, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface GmailSearchBarProps {
  value: string;
  onChange: (next: string) => void;
}

export function GmailSearchBar({ value, onChange }: GmailSearchBarProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onChange(draft.trim()); }}
      className="relative w-full"
      role="search"
    >
      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search mail"
        className="pl-9 pr-16 h-10 text-sm bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-input"
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {draft ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setDraft(""); onChange(""); }}
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        ) : null}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                aria-label="Search operators"
              >
                <Info className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="text-xs max-w-xs">
              <p className="font-medium mb-1">Gmail search operators</p>
              <ul className="space-y-0.5 text-muted-foreground">
                <li><code className="text-foreground">from:</code>name@x.com</li>
                <li><code className="text-foreground">to:</code>name@x.com</li>
                <li><code className="text-foreground">subject:</code>"exam prep"</li>
                <li><code className="text-foreground">has:attachment</code></li>
                <li><code className="text-foreground">label:</code>important</li>
                <li><code className="text-foreground">after:</code>2026/01/01</li>
                <li><code className="text-foreground">before:</code>2026/06/01</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </form>
  );
}

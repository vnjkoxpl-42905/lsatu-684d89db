import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { GmailContact } from "../api";
import { startsWithOperator } from "../utils/operators";
import { rankContacts } from "../utils/rankContacts";
import { GmailSearchSuggestions } from "./GmailSearchSuggestions";

interface GmailSearchBarProps {
  value: string;
  onChange: (next: string) => void;
  isLoading?: boolean;
  contacts: GmailContact[];
}

const DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 5;

export function GmailSearchBar({ value, onChange, isLoading, contacts }: GmailSearchBarProps) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setDraft(value); }, [value]);

  // Reset highlight when draft changes — Enter only fires contact-select
  // if user has explicitly arrow-keyed into the list.
  useEffect(() => { setHighlightIndex(-1); }, [draft]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const isOperator = startsWithOperator(draft);
  const suggestions = useMemo(() => {
    if (isOperator || draft.trim().length === 0 || contacts.length === 0) return [];
    return rankContacts(draft, contacts, MAX_SUGGESTIONS);
  }, [draft, contacts, isOperator]);

  const dropdownOpen = focused && suggestions.length > 0;

  function clearTimer() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function handleInputChange(next: string) {
    setDraft(next);
    clearTimer();
    if (startsWithOperator(next)) return;
    debounceRef.current = setTimeout(() => {
      onChange(next.trim());
    }, DEBOUNCE_MS);
  }

  function applyContact(email: string) {
    clearTimer();
    const q = `from:${email}`;
    setDraft(q);
    onChange(q);
    setFocused(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (dropdownOpen && highlightIndex >= 0 && suggestions[highlightIndex]) {
      applyContact(suggestions[highlightIndex].email);
      return;
    }
    clearTimer();
    onChange(draft.trim());
  }

  function handleClear() {
    clearTimer();
    setDraft("");
    onChange("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setFocused(false);
      return;
    }
    if (!dropdownOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i < 0 ? 0 : (i + 1) % suggestions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full"
      role="search"
    >
      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={draft}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setTimeout(() => setFocused(false), 120); }}
        onKeyDown={handleKeyDown}
        placeholder="Search mail"
        className="pl-9 pr-24 h-10 text-sm bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-input"
        autoComplete="off"
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin mr-1" />
        ) : null}
        {draft ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleClear}
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
      <GmailSearchSuggestions
        suggestions={suggestions}
        open={dropdownOpen}
        highlightIndex={highlightIndex}
        onHighlightChange={setHighlightIndex}
        onSelect={applyContact}
      />
    </form>
  );
}

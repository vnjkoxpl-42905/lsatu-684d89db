import { useMemo, useState } from "react";
import DOMPurify, { type Config as DOMPurifyConfig } from "dompurify";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GmailMessageBodyProps {
  html: string;
  text: string;
}

/**
 * Roughly matches Gmail's "show quoted text" affordance: split off everything from
 * the first quoted-block boundary downward into a collapsible section.
 */
function splitQuoted(html: string): { primary: string; quoted: string | null } {
  if (!html) return { primary: "", quoted: null };
  // Common Gmail quote container.
  const idx = html.search(/<div[^>]*class="[^"]*gmail_quote[^"]*"/i);
  if (idx >= 0) return { primary: html.slice(0, idx), quoted: html.slice(idx) };
  // Outlook-style blockquote on its own.
  const bq = html.search(/<blockquote[^>]*type="cite"/i);
  if (bq >= 0) return { primary: html.slice(0, bq), quoted: html.slice(bq) };
  return { primary: html, quoted: null };
}

const SANITIZE_CONFIG: DOMPurifyConfig = {
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "target", "rel",
    "style", "class", "width", "height", "align", "colspan", "rowspan",
  ],
  ADD_ATTR: ["target", "rel"],
  FORBID_TAGS: ["script", "iframe", "form", "input", "button", "object", "embed", "link", "meta"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
};

function harden(html: string): string {
  const clean = DOMPurify.sanitize(html, SANITIZE_CONFIG) as unknown as string;
  // Force all anchors to open in a new tab with noopener.
  return clean.replace(/<a\s+([^>]*?)>/gi, (match, attrs: string) => {
    const cleaned = attrs
      .replace(/\s+target="[^"]*"/gi, "")
      .replace(/\s+rel="[^"]*"/gi, "");
    return `<a ${cleaned} target="_blank" rel="noopener noreferrer">`;
  });
}

export function GmailMessageBody({ html, text }: GmailMessageBodyProps) {
  const [showQuoted, setShowQuoted] = useState(false);

  const { primaryHtml, quotedHtml } = useMemo(() => {
    if (!html) return { primaryHtml: "", quotedHtml: null };
    const { primary, quoted } = splitQuoted(html);
    return {
      primaryHtml: harden(primary),
      quotedHtml: quoted ? harden(quoted) : null,
    };
  }, [html]);

  if (!html && text) {
    return (
      <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed">
        {text}
      </pre>
    );
  }

  if (!html && !text) {
    return <p className="text-sm text-muted-foreground italic">(empty message)</p>;
  }

  return (
    <div className="gmail-body text-sm leading-relaxed">
      <div
        className={cn(
          "prose prose-sm max-w-none dark:prose-invert",
          "[&_a]:text-primary [&_a:hover]:underline",
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
          "[&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
        )}
        dangerouslySetInnerHTML={{ __html: primaryHtml }}
      />
      {quotedHtml ? (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowQuoted((v) => !v)}
          >
            {showQuoted ? "Hide quoted text" : "…"}
          </Button>
          {showQuoted ? (
            <div
              className="mt-2 pl-3 border-l-2 border-border text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: quotedHtml }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

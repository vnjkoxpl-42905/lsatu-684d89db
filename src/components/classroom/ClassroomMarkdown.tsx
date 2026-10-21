import * as React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { rcAssignmentHref } from "@/lib/rcAssignmentLinks";

/**
 * The one renderer for a note or recap body stored as markdown.
 *
 * Why this exists: `classroom_items.content_markdown` was rendered as
 * `<p>{item.content_markdown}</p>`. Markdown is newline-significant and
 * `.classroom-prose p` sets no `white-space`, so every recap collapsed into a
 * single run-on paragraph carrying its own syntax: a student read
 * `- [ ] Do PT 141 S2 - [ ] Review your misses` on one line, and
 * `**1. What is a sufficient assumption?**` with the asterisks showing.
 *
 * That body is not hand-typed prose that happens to contain punctuation. It is
 * real markdown by construction: `partToMarkdown` in src/lib/sessionBundle.ts
 * emits `- [ ] `, `**n. prompt**` and `_Answer:_` from the AI TA bundle, and the
 * field it reads is named `body_markdown`.
 *
 * Deliberately narrow, matching RcMarkdown's posture:
 *
 * - Headings demote. A note body sits under the page's own `<h1
 *   class="classroom-title">`, so an authored `#` would open a second document.
 *   h1-h2 render as h2, h3-h6 as h3 — the two levels `.classroom-prose` styles.
 * - Raw HTML is skipped. HTML notes travel the `content_html` path through
 *   `sanitizeClassroomHtml`, which is what allows an authored `<style>` block.
 *   Nothing should reach the DOM from here without passing that.
 * - Task items render as a checkbox glyph rather than the literal `[ ]`.
 *   GitHub task lists need remark-gfm, which this project does not carry; the
 *   bundle emits them regardless, so the marker is translated here instead of
 *   adding a dependency for one syntax.
 * - External links open in a new tab so a note cannot navigate the student out
 *   of the classroom. In-app paths stay in place.
 */

const TASK_ITEM = /^\[([ xX])\]\s+/;

/** A task item's text arrives as the li's first child on a tight list. */
function splitTaskItem(children: React.ReactNode) {
  const kids = React.Children.toArray(children);
  const first = kids[0];
  if (typeof first !== "string") return null;
  const match = TASK_ITEM.exec(first);
  if (!match) return null;
  return {
    done: match[1].toLowerCase() === "x",
    rest: [first.slice(match[0].length), ...kids.slice(1)],
  };
}

function renderLink(href: string | undefined, children: React.ReactNode, assignmentContext = false) {
  const target = href && assignmentContext ? rcAssignmentHref(href, window.location.origin) : href;
  const external = !!target && /^https?:\/\//i.test(target);
  return <a href={target} {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}>{children}</a>;
}

const components: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  h2: ({ children }) => <h2>{children}</h2>,
  h3: ({ children }) => <h3>{children}</h3>,
  h4: ({ children }) => <h3>{children}</h3>,
  h5: ({ children }) => <h3>{children}</h3>,
  h6: ({ children }) => <h3>{children}</h3>,
  img: () => null,
  a: ({ href, children }) => renderLink(href, children),
  li: ({ children }) => {
    const task = splitTaskItem(children);
    if (!task) return <li>{children}</li>;
    return (
      <li className="classroom-prose-task" data-done={task.done ? "" : undefined}>
        <span aria-hidden="true" className="classroom-prose-task-box">
          {task.done ? "✓" : ""}
        </span>
        <span className="classroom-prose-task-text">
          <span className="sr-only">{task.done ? "Done: " : "To do: "}</span>
          {task.rest}
        </span>
      </li>
    );
  },
};

const assignmentComponents: Components = {
  ...components,
  a: ({ href, children }) => renderLink(href, children, true),
};

interface Props {
  children: string | null | undefined;
  /** The prose container class. Callers outside `.classroom-root` pass their own. */
  className?: string;
  /** Only known assigned work opts in; notes and generic practice links do not. */
  assignmentContext?: boolean;
}

export function ClassroomMarkdown({ children, className = "classroom-prose", assignmentContext = false }: Props) {
  if (!children || !children.trim()) return null;
  return (
    <article className={className}>
      <ReactMarkdown components={assignmentContext ? assignmentComponents : components} skipHtml>
        {children}
      </ReactMarkdown>
    </article>
  );
}

export default ClassroomMarkdown;

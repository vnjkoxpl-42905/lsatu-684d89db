import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

/**
 * The single markdown renderer for every piece of RC content: passage text,
 * summaries, prompts, choice text, and explanation bodies.
 *
 * Deliberately narrow: paragraphs, bold, italics, line breaks, blockquotes and
 * lists render; links, images, headings and raw HTML do not. Lists are allowed
 * because authored explanation blocks genuinely contain them, and dropping them
 * would mangle the author's content.
 */

const components: Components = {
  a: ({ children }) => <>{children}</>,
  img: () => null,
  // Authored content occasionally uses a heading where a bold line is meant;
  // render it as an ordinary paragraph rather than injecting document structure.
  h1: ({ children }) => <p>{children}</p>,
  h2: ({ children }) => <p>{children}</p>,
  h3: ({ children }) => <p>{children}</p>,
  h4: ({ children }) => <p>{children}</p>,
  h5: ({ children }) => <p>{children}</p>,
  h6: ({ children }) => <p>{children}</p>,
};

interface RcMarkdownProps {
  children: string | null | undefined;
  className?: string;
}

export function RcMarkdown({ children, className }: RcMarkdownProps) {
  if (!children) return null;
  return (
    <div className={className}>
      <ReactMarkdown components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default RcMarkdown;

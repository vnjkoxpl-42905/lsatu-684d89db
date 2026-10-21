import { BOOTCAMP_MINDMAP, type MindNode } from '../../content/bootcamp/mindmap';
import { cn } from '../../lib/utils';

/**
 * Bootcamp mindmap · static editorial layout. Five top-level branches render
 * as columns on wide screens, stacked on narrow. No JS — uses native <details>
 * for branch expansion. Depth-keyed indent + rule lines.
 */
export function Mindmap() {
  const branches = BOOTCAMP_MINDMAP.children ?? [];

  return (
    <div className="border border-rule bg-paper-bright/40">
      <header className="border-b border-rule px-5 py-3">
        <div className="protocol text-ink-mute">Module mindmap</div>
        <h3 className="display-title text-2xl text-ink">
          {BOOTCAMP_MINDMAP.name}
        </h3>
        <p className="mt-1 protocol text-xs text-ink-mute">
          Generated from the master guide · five branches · expand any node
        </p>
      </header>
      <ol className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-5">
        {branches.map((branch, i) => (
          <li
            key={branch.name}
            className="bg-paper px-5 py-5"
          >
            <div className="protocol mb-2 text-[0.65rem] text-ink-mute">
              {String(i + 1).padStart(2, '0')}
            </div>
            <div className="display-title text-base leading-tight text-ink">
              {branch.name}
            </div>
            {branch.children && (
              <Branch nodes={branch.children} depth={1} />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Branch({ nodes, depth }: { nodes: MindNode[]; depth: number }) {
  return (
    <ul
      className={cn(
        'mt-3 space-y-1.5 border-l border-rule pl-3',
        depth > 1 && 'mt-1.5 space-y-1',
      )}
    >
      {nodes.map((node) => (
        <li key={node.name}>
          {node.children ? (
            <details className="group">
              <summary
                className={cn(
                  'cursor-pointer list-none text-[0.9rem] leading-snug text-ink-soft hover:text-ink',
                  depth === 1 && 'font-medium text-ink',
                )}
              >
                <span className="protocol mr-1.5 text-[0.65rem] text-ink-mute group-open:text-verdigris-deep">
                  {/* arrow */}
                  ▸
                </span>
                {node.name}
              </summary>
              <Branch nodes={node.children} depth={depth + 1} />
            </details>
          ) : (
            <span
              className={cn(
                'block pl-[0.85rem] text-[0.85rem] leading-snug text-ink-soft',
              )}
            >
              {node.name}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

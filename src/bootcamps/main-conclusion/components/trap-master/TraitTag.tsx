/**
 * TraitTag — pill that tags a wrong answer with a trap trait + tooltip.
 * Per architecture-plan §1 + §6, NT-Trap-Master named tool.
 */

import { Link } from 'react-router-dom';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { Tooltip } from '@/bootcamps/main-conclusion/components/primitives/Tooltip';

interface Props {
  trait_id: string;
  trait_name: string;
  fingerprint?: string;
  href?: string;
}

export function TraitTag({ trait_id, trait_name, fingerprint, href }: Props) {
  const inner = (
    <Tooltip content={fingerprint ?? trait_name}>
      <Chip tone="accent">
        <span className="font-mc-mono">{trait_id}</span>
        <span className="opacity-70">· {trait_name}</span>
      </Chip>
    </Tooltip>
  );
  if (href) {
    return (
      <Link to={href} className="inline-flex hover:opacity-80">
        {inner}
      </Link>
    );
  }
  return inner;
}

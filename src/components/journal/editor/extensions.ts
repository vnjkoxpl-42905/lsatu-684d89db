/**
 * extensions — the TipTap extension set for the Journal editor.
 */
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import type { Extensions } from '@tiptap/core';
import { Callout } from './Callout';
import { SlashCommand } from './SlashCommand';

export function buildExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: { HTMLAttributes: { class: 'journal-code' } },
    }),
    TaskList.configure({ HTMLAttributes: { class: 'journal-tasklist' } }),
    TaskItem.configure({ nested: true }),
    Callout,
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') return 'Heading';
        return placeholder;
      },
      includeChildren: true,
    }),
    SlashCommand,
  ];
}

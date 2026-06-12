/**
 * SlashCommand — TipTap extension that opens the SlashMenu on "/".
 * Built on @tiptap/suggestion. Positions a ReactRenderer popup at the caret
 * (no tippy dependency — we position a fixed-coordinate element ourselves).
 */
import { Extension, type Editor, type Range } from '@tiptap/core';
import Suggestion, {
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { SlashMenu, type SlashMenuRef } from './SlashMenu';
import { filterSlashItems, type SlashItem } from './slashItems';

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashItem }) => {
          props.run(editor, range);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => filterSlashItems(query),
        render: () => {
          let component: ReactRenderer<SlashMenuRef> | null = null;
          let el: HTMLDivElement | null = null;

          const position = (rect: DOMRect | null) => {
            if (!el || !rect) return;
            el.style.position = 'fixed';
            el.style.left = `${rect.left}px`;
            el.style.top = `${rect.bottom + 6}px`;
            el.style.zIndex = '50';
            // Flip above if it would overflow the viewport bottom.
            const menuHeight = el.firstElementChild?.clientHeight ?? 0;
            if (rect.bottom + 6 + menuHeight > window.innerHeight) {
              el.style.top = `${rect.top - 6 - menuHeight}px`;
            }
          };

          return {
            onStart: (props: SuggestionProps<SlashItem>) => {
              component = new ReactRenderer(SlashMenu, {
                props: { items: props.items, command: props.command },
                editor: props.editor,
              });
              el = document.createElement('div');
              el.appendChild(component.element);
              document.body.appendChild(el);
              position(props.clientRect?.() ?? null);
            },
            onUpdate: (props: SuggestionProps<SlashItem>) => {
              component?.updateProps({ items: props.items, command: props.command });
              position(props.clientRect?.() ?? null);
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') return true;
              return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              el?.remove();
              el = null;
              component?.destroy();
              component = null;
            },
          };
        },
      }),
    ];
  },
});

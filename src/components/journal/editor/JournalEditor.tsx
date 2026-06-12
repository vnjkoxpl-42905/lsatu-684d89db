/**
 * JournalEditor — the rich block editor for a doc page.
 *
 * Owns nothing about persistence beyond calling onChange(doc) on a debounce.
 * The parent (DocPage) wires onChange to the autosave mutation and renders the
 * save status. Content is TipTap JSON (never HTML).
 */
import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { buildExtensions } from './extensions';
import type { TiptapDoc } from '@/lib/journalService';
import './journal-editor.css';

export interface JournalEditorProps {
  /** Initial document. Only read on mount / when `docKey` changes. */
  value: TiptapDoc;
  /** Stable identity of the page being edited; remounts the editor on change. */
  docKey: string;
  onChange: (doc: TiptapDoc) => void;
  placeholder?: string;
  editable?: boolean;
}

export function JournalEditor({
  value,
  docKey,
  onChange,
  placeholder = "Write, or press '/' for blocks…",
  editable = true,
}: JournalEditorProps) {
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor(
    {
      extensions: buildExtensions(placeholder),
      content: value ?? { type: 'doc', content: [] },
      editable,
      editorProps: {
        attributes: {
          class:
            'journal-prose prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60vh]',
        },
      },
      onUpdate: ({ editor }) => {
        onChangeRef.current(editor.getJSON() as TiptapDoc);
      },
    },
    [docKey],
  );

  React.useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return <EditorContent editor={editor} />;
}

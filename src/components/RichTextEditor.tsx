'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React from 'react';
import { Toolbar } from './Toolbar';

interface RichTextEditorProps {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure extensions as needed, e.g., disable some defaults
        // heading: { levels: [1, 2, 3] },
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none border border-input bg-background shadow-sm rounded-md min-h-[150px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      // Output HTML for now, can configure JSON later if preferred
      onChange(editor.getHTML());
    },
    // You can add placeholder extension if needed:
    // Placeholder.configure({ placeholder: placeholder || 'Write something...' })
  });

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}; 
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect } from 'react';
import { Toolbar } from './Toolbar';

interface EditorContentState {
  html: string;
  text: string;
}

interface RichTextEditorProps {
  content: string;
  onChange: (state: EditorContentState) => void;
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
          'prose dark:prose-invert max-w-none focus:outline-none border border-input bg-background shadow-sm rounded-md min-h-[150px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      // Send both HTML and text up
      onChange({
        html: editor.getHTML(),
        text: editor.getText(),
      });
    },
    // You can add placeholder extension if needed:
    // Placeholder.configure({ placeholder: placeholder || 'Write something...' })
  });

  // Effect to handle resetting the editor content externally
  useEffect(() => {
    // Add null check for editor
    if (!editor) {
      return;
    }
    // Check the HTML content for emptiness
    if (content === '<p></p>' || content === '') { // TipTap might return empty paragraph
      editor.commands.clearContent();
    }
  }, [content, editor]);

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}; 
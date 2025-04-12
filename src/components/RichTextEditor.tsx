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
    if (!editor) {
      return;
    }
    // Existing check for empty content
    if (content === '<p></p>' || content === '') { 
      editor.commands.clearContent();
    }
    // We don't need to explicitly set non-empty content here, see effect below
  }, [content, editor]); // Keep this effect for clearing

  // Effect to update editor content when the prop changes from outside
  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    // Get the current content of the editor instance
    const editorHtml = editor.getHTML();

    // Only update if the prop content is actually different from the editor's content
    if (content !== editorHtml) {
      // Use setContent to update the editor state based on the prop
      // Pass false to prevent firing the onUpdate callback unnecessarily
      editor.commands.setContent(content, false); 
    }
  }, [content, editor]); // Re-run when content prop or editor instance changes

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}; 
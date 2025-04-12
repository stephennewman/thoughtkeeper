'use client';

import React, { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabaseClient'; // Remove direct supabase usage
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import type { Entry } from '@/types';
// Remove service imports - store actions use them
// import { addEntryService, updateEntryContentService } from "@/lib/entryService"; 
import { useJournalStore } from '@/stores/journalStore'; // Import store

// Define EditorState used by RichTextEditor's onChange
interface EditorState {
  html: string;
  text?: string;
}

// Define props needed from parent
interface EntryEditorDialogProps {
  isOpen: boolean;
  selectedDate: string;
  initialEntry?: Entry | null;
}

export const EntryEditorDialog: React.FC<EntryEditorDialogProps> = ({
  isOpen,
  selectedDate,
  initialEntry = null,
}) => {
  // Get actions and relevant state from the store
  const {
    addEntry,
    updateEntry,
    closeEditorDialog,
    isProcessingEntry,
    // Remove unused store state/actions
    // editingEntry, 
    // currentEditorContent, 
    // updateCurrentEditorContent 
  } = useJournalStore();

  // Local state for editor content and component-specific errors
  const [editorHtml, setEditorHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!initialEntry; // Determine mode based on prop
  const isLoadingOrProcessing = isProcessingEntry;

  // Effect to load initial content for editing or reset for adding
  useEffect(() => {
    if (isOpen) {
      setError(null); // Clear error on open
      // Set local state based on the initialEntry prop
      setEditorHtml(initialEntry?.content || '');
    } 
    // No cleanup needed here, as content is reset when opened
  }, [isOpen, initialEntry]); // Depend on isOpen and initialEntry

  // Handler for RichTextEditor changes
  const handleContentChange = (state: EditorState) => {
    setEditorHtml(state.html); // Update local state
  };

  const handleSave = async () => {
    setError(null); // Clear previous errors

    try {
      // Use local editorHtml state
      if (isEditMode && initialEntry) {
        // EDIT MODE - Call store action
        await updateEntry(initialEntry.id, editorHtml);
        closeEditorDialog(); // Close dialog on success
      } else {
        // ADD MODE - Call store action
        await addEntry(editorHtml, selectedDate);
        closeEditorDialog(); // Close dialog on success
      }
    } catch (error: any) {
      console.error('Error caught in dialog save handler:', error);
      setError(`Failed to save: ${error.message}`);
    }
  };

  // Handler for Dialog's onOpenChange - calls store action
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeEditorDialog();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Entry' : `Add New Entry for ${selectedDate}`}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {/* Bind RichTextEditor to local state */}
          <RichTextEditor
            content={editorHtml}
            onChange={handleContentChange}
          />
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            // Disable based on store processing state or if content is empty
            disabled={isLoadingOrProcessing || !editorHtml.trim()}
          >
            {isLoadingOrProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoadingOrProcessing ? 'Processing...' : (isEditMode ? 'Save Changes' : 'Save Entry')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 
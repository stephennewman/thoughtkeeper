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

// Define EditorState locally
interface EditorState {
  html: string;
  text: string; // Keep text for potential future use (e.g., passing to AI)
}

// Define props needed from parent (less than before)
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
    loadingState 
  } = useJournalStore();

  // Local state for editor content and component-specific errors
  const [content, setContent] = useState<EditorState>({ html: '', text: '' });
  const [error, setError] = useState<string | null>(null);
  
  const isEditMode = !!initialEntry;
  // Determine loading based on store state
  const isLoading = loadingState === 'adding' || loadingState === 'updating';
  // Determine processing based on store state (for add mode tag gen)
  const isProcessing = loadingState === 'tagging'; 

  // Effect to load initial content for editing or reset for adding
  useEffect(() => {
    if (isOpen) {
      setError(null); // Clear error on open
      if (isEditMode && initialEntry) {
        setContent({ html: initialEntry.content, text: '' }); // TODO: Need text conversion for edit
      } else {
        setContent({ html: '', text: '' });
      }
    } 
    // Resetting content on close might clear it prematurely if dialog animation occurs
  }, [isOpen, initialEntry, isEditMode]);

  const handleSave = async () => {
    setError(null); // Clear previous errors
    
    try {
      if (isEditMode && initialEntry) {
        // EDIT MODE - Call store action
        // TODO: Check if content actually changed?
        await updateEntry(initialEntry.id, content.html);
        closeEditorDialog(); // Close dialog on success

      } else {
        // ADD MODE - Call store action
        await addEntry(content.html);
        closeEditorDialog(); // Close dialog on success (tagging happens in background)
      }
    } catch (error: any) {
      // Note: Store actions handle their own errors internally, 
      // but we might want to catch component-specific errors or display store error here.
      console.error('Error caught in dialog save handler:', error);
      setError(`Failed to save: ${error.message}`); // Display local error
      // We could also pull the error from useJournalStore().errorState here
    }
    // Loading state is handled by the store, no need for local setIsSaving
  };

  // Handler for Dialog's onOpenChange - calls store action
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeEditorDialog();
    }
    // We don't handle opening here, parent component triggers it via store action
  };

  return (
    // Use handleOpenChange for closing
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Entry' : `Add New Entry for ${selectedDate}`}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <RichTextEditor content={content.html} onChange={setContent} /> 
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
        <DialogFooter>
          <Button 
            onClick={handleSave} 
            // Disable based on store loading state or if content is empty
            disabled={isLoading || isProcessing || !content.html.trim()}
          >
            {(isLoading || isProcessing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Saving...' : isProcessing ? 'Processing...' : (isEditMode ? 'Save Changes' : 'Save Entry')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 
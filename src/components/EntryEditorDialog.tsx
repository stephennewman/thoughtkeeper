'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import type { Entry } from '@/types';
import { addEntryService, updateEntryContentService } from "@/lib/entryService"; // Import services

// Define EditorState locally
interface EditorState {
  html: string;
  text: string;
}

interface EntryEditorDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedDate: string; // Needed for new entries
  initialEntry?: Entry | null; // Entry to edit, if any
  onEntryAdded: (newEntry: Entry) => void; // Callback for new entries
  onEntryUpdated: (updatedEntry: Entry) => void; // Callback for updated entries
  onEntryTagsUpdated: (entryId: string, updatedTags: Partial<Entry>) => void; // For background tag update
  generatingTagsForId: string | null;
  setGeneratingTagsForId: (id: string | null) => void;
}

export const EntryEditorDialog: React.FC<EntryEditorDialogProps> = ({
  isOpen,
  setIsOpen,
  selectedDate,
  initialEntry = null, // Default to null (add mode)
  onEntryAdded,
  onEntryUpdated,
  onEntryTagsUpdated,
  generatingTagsForId,
  setGeneratingTagsForId,
}) => {
  const [content, setContent] = useState<EditorState>({ html: '', text: '' });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const isEditMode = !!initialEntry;

  // Effect to load initial content for editing or reset for adding
  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setContent({ html: initialEntry.content, text: '' }); // TODO: Need text conversion for edit
      } else {
        setContent({ html: '', text: '' });
      }
      setIsSaving(false);
    } else {
       // Reset content when closed regardless of mode
       setContent({ html: '', text: '' });
       setIsSaving(false);
    }
  }, [isOpen, initialEntry, isEditMode]);

  // Separate handler for saving (both add and edit)
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      if (isEditMode && initialEntry) {
        // --- EDIT MODE --- 
        // TODO: Check if content actually changed?
        const { data: updatedData, error: updateError } = await updateEntryContentService(initialEntry.id, content.html);
        
        if (updateError) {
          throw updateError;
        }
        if (!updatedData) {
          throw new Error("Failed to get updated entry data after saving.");
        }
        // Pass the successfully updated entry back up 
        onEntryUpdated(updatedData);
        setIsOpen(false); // Close dialog on successful update

        // TODO: Trigger tag re-generation if content changed significantly?

      } else {
        // --- ADD MODE --- 
        const { data: insertedData, error: insertError } = await addEntryService(selectedDate, content.html);
        
        if (insertError) {
          throw insertError;
        }
        if (!insertedData) {
          throw new Error("Failed to get inserted entry data after saving.");
        }
        
        // Optimistically add the entry with base data locally
        const entryToDisplayLocally: Entry = { ...insertedData, tags: [], meta_tag: null, intent_tag: null };
        onEntryAdded(entryToDisplayLocally);
        setIsOpen(false); // Close dialog

        // Now, trigger background AI tagging for the new entry
        if (insertedData.id) {
          setGeneratingTagsForId(insertedData.id); // Set loading state for this ID
          setIsProcessing(true); // Show dialog processing indicator
          
          // Call API routes for tagging (fire and forget for UI)
          try {
            const contentToTag = insertedData.content; // Use content from DB result
            const fetchOptions = { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: contentToTag })
            };
            
            // Call all tagging APIs concurrently
            const [metaResponse, intentResponse, tagsResponse] = await Promise.all([
              fetch('/api/classify-meta', fetchOptions),
              fetch('/api/classify-intent', fetchOptions),
              fetch('/api/tags', fetchOptions)
            ]);
            
            // Basic error check (can be enhanced)
            if (!metaResponse.ok || !intentResponse.ok || !tagsResponse.ok) {
               console.warn('One or more tagging API calls failed');
            }

            // Parse results
            const metaResult = await metaResponse.json();
            const intentResult = await intentResponse.json();
            const tagsResult = await tagsResponse.json();

            // Prepare update payload for Supabase
            const updatePayload: Partial<Entry> = {};
            if (metaResult.meta_tag) updatePayload.meta_tag = metaResult.meta_tag;
            if (intentResult.intent_tag) updatePayload.intent_tag = intentResult.intent_tag;
            if (tagsResult.tags) updatePayload.tags = tagsResult.tags;

            // Update the entry in Supabase with the generated tags
            if (Object.keys(updatePayload).length > 0) {
               const { error: updateError } = await supabase
                .from('entries')
                .update(updatePayload)
                .eq('id', insertedData.id);
                
               if (updateError) {
                  console.error('Error updating entry with tags:', updateError);
               } else {
                  // If Supabase update is successful, notify parent to update UI state
                  onEntryTagsUpdated(insertedData.id, updatePayload); 
               }
            }
            
          } catch (taggingError) {
            console.error("Error during background tagging:", taggingError);
          } finally {
             // Only clear the loader if it was set for this new entry
             if (generatingTagsForId === insertedData.id) { 
                 setGeneratingTagsForId(null);
             }
             setIsProcessing(false); // Hide dialog processing indicator
          }
        }
      }

    } catch (error: any) {
      console.error('Error saving entry:', error);
      setError(`Failed to save entry: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          {/* Dynamic Title */}
          <DialogTitle>{isEditMode ? 'Edit Entry' : `Add New Entry for ${selectedDate}`}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {/* Pass content.html to editor */}
          <RichTextEditor content={content.html} onChange={setContent} /> 
        </div>
        <DialogFooter>
          <Button 
            onClick={handleSave} 
            disabled={isProcessing || !content.html.trim()} // Disable if processing or content is empty
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : isProcessing ? 'Processing...' : (isEditMode ? 'Save Changes' : 'Save Entry')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 
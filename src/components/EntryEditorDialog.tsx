'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RichTextEditor } from './RichTextEditor'; 
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import type { Entry } from '@/app/page';

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
  
  const isEditMode = !!initialEntry;
  // Show processing indicator if saving or if tags are generating for *this* entry (or a new one)
  const isProcessing = isSaving || generatingTagsForId === (initialEntry?.id ?? 'new');

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

  const handleSave = async () => {
    const { html: editorHtml, text: editorText } = content;
    const trimmedText = editorText.trim(); 
    const trimmedHtml = editorHtml.trim(); 

    if (!trimmedHtml || isSaving || isProcessing) return;

    setIsSaving(true);
    // For edit mode, we DO NOT set generatingTagsForId unless we intend to re-gen tags
    if (!isEditMode) { 
      setGeneratingTagsForId('new'); // Only set for new entries
    }
    // For edit mode, we might re-trigger tag generation, using the actual ID
    // For add mode, use 'new' as before
    // const currentEntryId = initialEntry?.id ?? 'new';
    // setGeneratingTagsForId(currentEntryId);

    try {
      if (isEditMode) {
        // --- EDIT MODE --- 
        const updatePayload = { content: trimmedHtml }; 
        const { data: updatedData, error: updateError } = await supabase
          .from('entries')
          .update(updatePayload)
          .eq('id', initialEntry.id)
          .select()
          .single();

        if (updateError) throw updateError;
        if (!updatedData) throw new Error("Failed to get updated entry data.");

        const updatedEntry = { ...updatedData } as Entry;
        onEntryUpdated(updatedEntry); // Update parent state
        setIsOpen(false); // Close dialog

        // --- Optional: Re-generate tags on edit --- 
        // console.log("Skipping tag re-generation on edit for now.");
        // Clear loader immediately as we didn't start one
        // if (generatingTagsForId === initialEntry.id) {
        //     setGeneratingTagsForId(null); 
        // }
        // --- End Edit Mode Save ---

      } else {
        // --- ADD MODE --- 
        const newEntryData = { date: selectedDate, content: trimmedHtml };
        const { data: insertedData, error: insertError } = await supabase
          .from('entries')
          .insert(newEntryData)
          .select()
          .single();

        if (insertError) throw insertError;
        if (!insertedData) throw new Error("Failed to get inserted entry data.");

        const newEntryId = insertedData.id;
        const entryToDisplayLocally = { ...insertedData, tags: [], meta_tag: null, intent_tag: null } as Entry;

        onEntryAdded(entryToDisplayLocally);
        setContent({ html: '', text: '' });
        setIsOpen(false);

        // --- Background AI Tag Generation --- 
        (async () => {
          try {
            const results = await Promise.allSettled([
              fetch('/api/classify-meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: trimmedText }) }),
              fetch('/api/classify-intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: trimmedText }) }),
              fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: trimmedText }) })
            ]);

            let metaTag: string | null = null;
            let intentTag: string | null = null;
            let rawTags: string[] | null = null;

            if (results[0].status === 'fulfilled' && results[0].value.ok) metaTag = (await results[0].value.json()).metaTag;
            if (results[1].status === 'fulfilled' && results[1].value.ok) intentTag = (await results[1].value.json()).intentTag;
            if (results[2].status === 'fulfilled' && results[2].value.ok) rawTags = (await results[2].value.json()).tags;

            // Convert content tags to lowercase
            const lowerCaseTags = rawTags?.map(tag => tag.toLowerCase()) ?? [];

            if (metaTag || intentTag || (lowerCaseTags && lowerCaseTags.length > 0)) {
              const updatePayload: Partial<Entry> = {};
              if (metaTag) updatePayload.meta_tag = metaTag; // Keep original case for Meta/Intent
              if (intentTag) updatePayload.intent_tag = intentTag;
              updatePayload.tags = lowerCaseTags; // Save lowercase tags
              
              const { error: updateError } = await supabase
                .from('entries')
                .update(updatePayload)
                .eq('id', newEntryId);

              if (!updateError) {
                  onEntryTagsUpdated(newEntryId, updatePayload);
              } else {
                  console.error('Error saving generated tags:', updateError);
              }
            }
          } catch (tagError: any) {
            console.error('Error during background AI tag generation process:', tagError);
          } finally {
            // Only clear the loader if it was set for this new entry
            if (generatingTagsForId === 'new') { 
                 setGeneratingTagsForId(null); 
            }
          }
        })();
        // --- End Add Mode --- 
      }
    } catch (error: any) {
      console.error('Error saving entry:', error);
      alert(`Failed to save entry: ${error.message}`);
      // Clear loading state on any save error
      setGeneratingTagsForId(null);
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
'use client'; // Needs to be a client component to use hooks

import React, { useState, useEffect, useRef } from 'react'; // Import useState, useEffect, useRef
import { format, parseISO } from 'date-fns';
import { MoreHorizontal, Loader2, Mic, FileText, CheckSquare, Square, List, X, PlusCircle, Pencil, Check, ChevronsUpDown, Tag } from 'lucide-react'; // Added ChevronsUpDown, Tag
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { Label } from "@/components/ui/label"; // Import Label
import { Input } from "@/components/ui/input"; // Import Input
// ** Removed Combobox imports from here - they are in MetaTagEditor **
import type { Entry, TagType, ActionItem } from '@/types'; // Modified: Moved ActionItem import here
import { updateEntryActionsService, updateEntrySummaryService } from '@/lib/entryService'; // Modified: Removed ActionItem import
import { useJournalStore } from '@/stores/journalStore'; // IMPORT THE STORE
import { toast } from 'sonner'; // Import toast
import clsx from 'clsx';
import { MetaTagEditor } from './MetaTagEditor'; // Import the new component

// Define props for the component
interface JournalEntryProps {
  entry: Entry; // Expect a single entry object
  highlightedTagColors: { [lowerCaseTag: string]: { base: string; hover: string } }; // Pass colors down
  onDeleteEntry: (id: string) => Promise<void>;
  onEditClick: (entry: Entry) => void;
  // Add setFilters to handle tag clicks directly
  setFilters: (filters: Partial<{
    searchQuery: string;
    activeMetaTag: string | null;
    activeIntentTag: string | null;
    activeContentTags: Set<string>;
  }>) => void;
  // Consider passing isProcessing state if needed for the spinner
  // isProcessingEntry?: boolean;
}

export function JournalEntry({
  entry,
  highlightedTagColors,
  onDeleteEntry,
  onEditClick,
  setFilters // Destructure setFilters
}: JournalEntryProps) {
  // Get relevant state and actions from the store individually
  const activeMetaTag = useJournalStore((state) => state.activeMetaTag);
  const activeIntentTag = useJournalStore((state) => state.activeIntentTag);
  const activeContentTags = useJournalStore((state) => state.activeContentTags);
  const updateEntryTagsInStore = useJournalStore((state) => state.updateEntryTags);
  const uniqueMetaTags = useJournalStore((state) => state.uniqueMetaTags);
  const updateEntryMetaTag = useJournalStore((state) => state.updateEntryMetaTag);

  // === State for Actions Checklist ===
  const [localActions, setLocalActions] = useState<ActionItem[]>(entry.extracted_actions || []);
  // === State for Adding New Action ===
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newActionText, setNewActionText] = useState('');
  // === State for dynamic content height ===
  const [contentMinHeight, setContentMinHeight] = useState<number | string>('auto'); 

  // === State for Action Item Editing ===
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);
  const [editedActionText, setEditedActionText] = useState('');

  // === State for Add Action Position ===
  const [addActionAfterIndex, setAddActionAfterIndex] = useState<number | null>(null); 

  // === State for Summary Editing ===
  const [localSummary, setLocalSummary] = useState<string[]>(entry.extracted_summary || []);
  const [editingSummaryIndex, setEditingSummaryIndex] = useState<number | null>(null);
  const [editedSummaryText, setEditedSummaryText] = useState('');

  // === State for Adding Summary Point ===
  const [isAddingSummary, setIsAddingSummary] = useState(false);
  const [addSummaryAfterIndex, setAddSummaryAfterIndex] = useState<number | null>(null);
  const [newSummaryText, setNewSummaryText] = useState('');

  // === Refs for content measurement ===
  const originalContentRef = useRef<HTMLDivElement>(null);
  const summaryContentRef = useRef<HTMLUListElement>(null);
  const actionsContentRef = useRef<HTMLDivElement>(null);

  // === Refs for inline editing ===
  const editableActionLabelRef = useRef<HTMLLabelElement | null>(null);
  const editableSummarySpanRef = useRef<HTMLSpanElement | null>(null);

  // ** Removed Meta Tag Combobox State - moved to MetaTagEditor **
  // const [isMetaPopoverOpen, setIsMetaPopoverOpen] = useState(false);
  // const [metaSearchValue, setMetaSearchValue] = useState(''); 

  // ** Removed handleMetaTagSelect callback - moved to MetaTagEditor **
  // const handleMetaTagSelect = React.useCallback((selectedValue: string | null) => { ... }, [...]);

  // Update local actions if the prop changes (e.g., after initial fetch or AI update)
  useEffect(() => {
    setLocalActions(entry.extracted_actions || []);
  }, [entry.extracted_actions]);

  // Update local summary if the prop changes, but NOT if we are currently editing
  useEffect(() => {
    if (editingSummaryIndex === null) { // Only update if not editing
      setLocalSummary(entry.extracted_summary || []);
    }
  }, [entry.extracted_summary, editingSummaryIndex]); // Rerun if prop changes or editing stops

  // === Effect to calculate max content height ===
  useEffect(() => {
    let maxHeight = 0;
    // Measure heights only after refs are attached
    const originalHeight = originalContentRef.current?.scrollHeight || 0;
    const summaryHeight = summaryContentRef.current?.scrollHeight || 0;
    const actionsHeight = actionsContentRef.current?.scrollHeight || 0;

    maxHeight = Math.max(originalHeight, summaryHeight, actionsHeight);

    // Add some padding if height is calculated (e.g., 16px for pb-4)
    // Only set if maxHeight is reasonably positive, otherwise keep 'auto'
    if (maxHeight > 10) { // Avoid setting small heights
        setContentMinHeight(maxHeight + 16); // Add buffer matching pb-4 
    } else {
        setContentMinHeight('auto'); // Fallback if calculation is weird
    }
    // Rerun when the content that determines height changes
  }, [entry.content, entry.extracted_summary, localActions]); 
  // Log the calculated minHeight whenever it changes
  useEffect(() => {
    console.log(`[JournalEntry ${entry.id}] Calculated minHeight:`, contentMinHeight);
  }, [contentMinHeight, entry.id]);
  // === End Effect ===

  // Simplified check for tag generation spinner (can be refined)
  // Assumes tags are missing only during initial processing after creation
  const isGenerating = !entry.meta_tag && !entry.intent_tag && !entry.tags && entry.content; // Check content exists

  // Determine entry type and icon
  const isVoiceNote = entry.entry_type === 'voice';
  const EntryIcon = isVoiceNote ? Mic : FileText;
  const entryTypeText = isVoiceNote ? 'Voice Note' : 'Text Note';

  // Format creation time
  const creationTime = entry.created_at ? format(parseISO(entry.created_at), 'h:mm a') : '';

  // Handle tag clicks by calling setFilters from props - UPDATED LOGIC
  const handleTagClick = (tag: string, type: TagType) => {
    let newMetaTag = activeMetaTag;
    let newIntentTag = activeIntentTag;
    let newContentTags = new Set(activeContentTags);

    if (type === 'meta') {
      newMetaTag = activeMetaTag === tag ? null : tag; // Toggle
    } else if (type === 'intent') {
      newIntentTag = activeIntentTag === tag ? null : tag; // Toggle
    } else { // type === 'content'
      if (newContentTags.has(tag)) {
        newContentTags.delete(tag); // Toggle off
      } else {
        newContentTags.add(tag); // Toggle on - Allow multiple content tags
      }
    }
    
    // Call store action with updated filters, preserving others
    setFilters({
      searchQuery: '', // Always clear search on tag click
      activeMetaTag: newMetaTag,
      activeIntentTag: newIntentTag,
      activeContentTags: newContentTags
    });
  };

  const handleStartEdit = () => {
    onEditClick(entry);
  };

  const handleDelete = async () => {
    // Confirmation logic should ideally live where the action is dispatched (page.tsx)
    // For now, assume confirmation happened before calling onDeleteEntry prop.
    await onDeleteEntry(entry.id);
  };

  // === Handler for Action Toggle ===
  const handleActionToggle = async (indexToToggle: number) => {
    const updatedActions = localActions.map((action, index) => 
      index === indexToToggle ? { ...action, completed: !action.completed } : action
    );

    setLocalActions(updatedActions); // Optimistic UI update

    try {
      // Persist changes to the database
      const { data: updatedData, error } = await updateEntryActionsService(entry.id, updatedActions);
      if (error) {
        console.error("Failed to update action status in DB:", error);
        setLocalActions(localActions); // Revert
        toast.error("Failed to update action status.");
      } else if (updatedData) {
        // Update the entry in the global Zustand store to reflect the saved state
        const updatedEntryForStore = { ...entry, extracted_actions: updatedData.extracted_actions };
        updateEntryTagsInStore(entry.id, updatedEntryForStore); 
      } else {
        console.warn("updateEntryActionsService returned no data or error");
        const updatedEntryForStore = { ...entry, extracted_actions: updatedActions };
        updateEntryTagsInStore(entry.id, updatedEntryForStore); 
      }
    } catch (error) {
      console.error("Error calling updateEntryActionsService:", error);
      setLocalActions(localActions); // Revert
      toast.error("An error occurred while updating action status.");
    }
  };
  // === End Handler ===

  // === Handler for Action Delete ===
  const handleDeleteAction = async (indexToDelete: number) => {
    const updatedActions = localActions.filter((_, index) => index !== indexToDelete);

    // Optimistic UI update first
    const originalActions = [...localActions]; // Store original state for potential revert
    setLocalActions(updatedActions); 

    try {
      // Persist changes to the database
      const { data: updatedData, error } = await updateEntryActionsService(entry.id, updatedActions);
      if (error) {
        console.error("Failed to delete action item in DB:", error);
        setLocalActions(originalActions); 
        toast.error("Failed to delete action item.");
      } else if (updatedData) {
        // Update the entry in the global Zustand store
        const updatedEntryForStore = { ...entry, extracted_actions: updatedData.extracted_actions };
        updateEntryTagsInStore(entry.id, updatedEntryForStore); 
        toast.success("Action item deleted.");
      } else {
         // If no error but no data, still update store optimistically based on local state
         console.warn("updateEntryActionsService (delete) returned no data or error");
         const updatedEntryForStore = { ...entry, extracted_actions: updatedActions };
         updateEntryTagsInStore(entry.id, updatedEntryForStore);
         toast.success("Action item deleted (no confirmation).");
      }
    } catch (error) {
      console.error("Error calling updateEntryActionsService for delete:", error);
      setLocalActions(originalActions); 
      toast.error("An error occurred while deleting action item.");
    }
  };
  // === End Handler ===

  // === Handlers for Action Item Editing ===

  const handleStartEditAction = (index: number) => {
    setEditingActionIndex(index);
    setEditedActionText(localActions[index].task);
    setIsAddingAction(false); // Ensure add form is hidden when editing
  };

  const handleCancelEditAction = () => {
    setEditingActionIndex(null);
    setEditedActionText('');
  };

  const handleSaveActionEdit = async () => {
    if (editingActionIndex === null) return;

    // Get text directly from the editable element
    const trimmedText = editableActionLabelRef.current?.innerText.trim() ?? '';

    if (!trimmedText) {
      // If empty, maybe delete? For now, just cancel edit.
      handleCancelEditAction();
      return;
    }

    const updatedActions = localActions.map((action, index) =>
      index === editingActionIndex ? { ...action, task: trimmedText } : action
    );

    const originalActions = [...localActions]; // Store original for revert
    setLocalActions(updatedActions); // Optimistic UI update
    handleCancelEditAction(); // Clear editing state

    try {
      const { data: updatedData, error } = await updateEntryActionsService(entry.id, updatedActions);
      if (error) {
        console.error("Failed to update action item text in DB:", error);
        setLocalActions(originalActions); // Revert UI
        toast.error("Failed to save action item.");
      } else {
        // Update the entry in the global Zustand store (if updatedData exists or optimistically)
        const updatedEntryForStore = { ...entry, extracted_actions: updatedData?.extracted_actions || updatedActions };
        updateEntryTagsInStore(entry.id, updatedEntryForStore);
        toast.success("Action item saved.");
      }
    } catch (error) {
      console.error("Error calling updateEntryActionsService for edit:", error);
      setLocalActions(originalActions); // Revert UI
      toast.error("An error occurred while saving action item.");
    }
  };

  // === Handler for Adding New Action ===
  const handleAddNewAction = async () => {
    const trimmedText = newActionText.trim();
    if (!trimmedText) return; // Don't add empty actions

    const newAction: ActionItem = { task: trimmedText, completed: false }; // Removed priorityScore: null
    // Insert the new action at the correct position
    const insertAtIndex = addActionAfterIndex === null || addActionAfterIndex === -1 
                          ? 0 
                          : addActionAfterIndex + 1;
    const updatedActions = [
      ...localActions.slice(0, insertAtIndex),
      newAction,
      ...localActions.slice(insertAtIndex)
    ];

    // Optimistic UI update first
    const originalActions = [...localActions]; // Store original state for potential revert
    setLocalActions(updatedActions); 
    setNewActionText(''); // Clear input
    setIsAddingAction(false); // Hide input form
    setAddActionAfterIndex(null); // Reset insertion index

    try {
      // Persist changes to the database
      const { data: updatedData, error } = await updateEntryActionsService(entry.id, updatedActions);
      if (error) {
        console.error("Failed to add action item in DB:", error);
        setLocalActions(originalActions); 
        setIsAddingAction(true); 
        setAddActionAfterIndex(addActionAfterIndex);
        setNewActionText(trimmedText);
        toast.error("Failed to add action item.");
      } else {
        // Update the entry in the global Zustand store (if updatedData exists or optimistically)
        const finalActions = updatedData?.extracted_actions || updatedActions;
        const updatedEntryForStore = { ...entry, extracted_actions: finalActions };
        updateEntryTagsInStore(entry.id, updatedEntryForStore); 
        toast.success("Action item added.");
      }
    } catch (error) {
      console.error("Error calling updateEntryActionsService for add:", error);
      setLocalActions(originalActions); 
      setIsAddingAction(true); 
      setAddActionAfterIndex(addActionAfterIndex);
      setNewActionText(trimmedText);
      toast.error("An error occurred while adding action item.");
    }
  };
  // === End Handler ===

  // === Handlers for Summary Editing ===

  const handleStartEditSummary = (index: number) => {
    setEditingSummaryIndex(index);
    setEditedSummaryText(localSummary[index]);
  };

  const handleCancelEditSummary = () => {
    setEditingSummaryIndex(null);
    setEditedSummaryText('');
  };

  const handleSaveSummaryEdit = async () => {
    if (editingSummaryIndex === null) return;
    
    // Get text directly from the editable element
    const trimmedText = editableSummarySpanRef.current?.innerText.trim() ?? '';

    if (!trimmedText) {
      // Maybe delete if empty? For now, just cancel.
      handleCancelEditSummary();
      return;
    }

    const updatedSummary = [...localSummary];
    updatedSummary[editingSummaryIndex] = trimmedText;

    const originalSummary = [...localSummary]; // Store original for revert
    setLocalSummary(updatedSummary); // Optimistic UI update
    handleCancelEditSummary(); // Clear editing state

    try {
      // Persist changes to the database
      const { data: updatedData, error } = await updateEntrySummaryService(entry.id, updatedSummary);

      if (error) {
        console.error("Failed to update summary item in DB:", error);
        setLocalSummary(originalSummary); // Revert UI
        toast.error("Failed to save summary point.");
      } else if (updatedData) {
        // Update the entry in the global Zustand store
        const updatedEntryForStore = { ...entry, extracted_summary: updatedData.extracted_summary };
        updateEntryTagsInStore(entry.id, updatedEntryForStore);
        toast.success("Summary point saved.");
      } else {
        console.warn("updateEntrySummaryService returned no data or error");
        const updatedEntryForStore = { ...entry, extracted_summary: updatedSummary };
        updateEntryTagsInStore(entry.id, updatedEntryForStore); // Update store optimistically
        toast.success("Summary point saved (no confirmation).");
      }
    } catch (error) {
      console.error("Error calling updateEntrySummaryService:", error);
      setLocalSummary(originalSummary); // Revert UI
      toast.error("An error occurred while saving summary point.");
    }
  };

  const handleDeleteSummary = async (indexToDelete: number) => {
    const updatedSummary = localSummary.filter((_, index) => index !== indexToDelete);

    const originalSummary = [...localSummary]; // Store original for revert
    setLocalSummary(updatedSummary); // Optimistic UI update

    try {
      // Persist changes to the database
      const { data: updatedData, error } = await updateEntrySummaryService(entry.id, updatedSummary);

      if (error) {
        console.error("Failed to delete summary item in DB:", error);
        setLocalSummary(originalSummary); // Revert UI
        toast.error("Failed to delete summary point.");
      } else if (updatedData) {
        // Update the entry in the global Zustand store
        const updatedEntryForStore = { ...entry, extracted_summary: updatedData.extracted_summary };
        updateEntryTagsInStore(entry.id, updatedEntryForStore);
        toast.success("Summary point deleted.");
      } else {
        console.warn("updateEntrySummaryService (delete) returned no data or error");
        const updatedEntryForStore = { ...entry, extracted_summary: updatedSummary };
        updateEntryTagsInStore(entry.id, updatedEntryForStore); // Update store optimistically
        toast.success("Summary point deleted (no confirmation).");
      }
    } catch (error) {
      console.error("Error calling updateEntrySummaryService for delete:", error);
      setLocalSummary(originalSummary); // Revert UI
      toast.error("An error occurred while deleting summary point.");
    }
  };
  // === End Summary Handlers ===

  // === Handlers for Adding New Summary Point ===
  const handleCancelAddSummary = () => {
    setIsAddingSummary(false);
    setAddSummaryAfterIndex(null);
    setNewSummaryText('');
  };

  const handleAddNewSummary = async () => {
    const trimmedText = newSummaryText.trim();
    if (!trimmedText) return;

    // Calculate insertion index
    const insertAtIndex = addSummaryAfterIndex === null || addSummaryAfterIndex === -1 
                          ? 0 
                          : addSummaryAfterIndex + 1;
    const updatedSummary = [
      ...localSummary.slice(0, insertAtIndex),
      trimmedText, // Add the new point
      ...localSummary.slice(insertAtIndex)
    ];

    const originalSummary = [...localSummary]; // Store original for revert
    setLocalSummary(updatedSummary); // Optimistic UI update
    handleCancelAddSummary(); // Reset add state

    try {
      // Persist changes to the database
      const { data: updatedData, error } = await updateEntrySummaryService(entry.id, updatedSummary);

      if (error) {
        console.error("Failed to add summary item in DB:", error);
        setLocalSummary(originalSummary); // Revert UI
        toast.error("Failed to add summary point.");
      } else if (updatedData) {
        // Update the entry in the global Zustand store
        const updatedEntryForStore = { ...entry, extracted_summary: updatedData.extracted_summary };
        updateEntryTagsInStore(entry.id, updatedEntryForStore);
        toast.success("Summary point added.");
      } else {
        console.warn("updateEntrySummaryService (add) returned no data or error");
        const updatedEntryForStore = { ...entry, extracted_summary: updatedSummary };
        updateEntryTagsInStore(entry.id, updatedEntryForStore); // Update store optimistically
        toast.success("Summary point added (no confirmation).");
      }
    } catch (error) {
      console.error("Error calling updateEntrySummaryService for add:", error);
      setLocalSummary(originalSummary); // Revert UI
      toast.error("An error occurred while adding summary point.");
    }
  };
  // === End Add Summary Handlers ===

  // Use highlightedTagColors passed via props
  const getTagClasses = (tag: string, type: TagType): string => {
    const lowerCaseTag = tag.toLowerCase();
    const isClickable = true;
    const colorInfo = highlightedTagColors[lowerCaseTag];
    const baseClasses = "inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
    let colorClasses = 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    let hoverClasses = isClickable ? 'hover:opacity-80' : '';

    if (colorInfo) {
      colorClasses = colorInfo.base;
      hoverClasses = isClickable ? colorInfo.hover : '';
    }

    return clsx(baseClasses, colorClasses, isClickable && 'cursor-pointer', hoverClasses);
  };

  // Consolidated Footer Separator Component (Optional but cleaner)
  const FooterSeparator = () => <span className="mx-1.5 text-muted-foreground/60">•</span>;

  // Determine if any tags exist for separator logic
  const hasTags = entry.meta_tag || entry.intent_tag || (entry.tags && entry.tags.length > 0);

  // --- Re-adding useEffect for Action item edit start --- 
  useEffect(() => {
    if (editingActionIndex !== null && editableActionLabelRef.current) {
      const initialText = localActions[editingActionIndex].task;
      editableActionLabelRef.current.innerText = initialText;
      editableActionLabelRef.current.focus();

      // Place cursor at the end
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editableActionLabelRef.current);
        range.collapse(false); 
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch (e) {
        console.error("Error setting cursor position:", e);
        editableActionLabelRef.current.focus();
      }
    }
  }, [editingActionIndex, localActions]);

  // Focus and set initial text when starting to edit a summary point
  useEffect(() => {
    if (editingSummaryIndex !== null && editableSummarySpanRef.current) {
      const initialText = localSummary[editingSummaryIndex];
      editableSummarySpanRef.current.innerText = initialText;
      editableSummarySpanRef.current.focus();

      // Place cursor at the end
      try { 
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editableSummarySpanRef.current);
        range.collapse(false); 
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch (e) {
        console.error("Error setting cursor position:", e);
        editableSummarySpanRef.current.focus(); // Fallback focus
      }
    }
  }, [editingSummaryIndex, localSummary]);

  // Render a single entry
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border border-border dark:border-border">
      {/* Use relative positioning for the options menu */}
      <CardContent className="p-4 relative">
        {/* Options Menu (Top Right) */}
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleStartEdit}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDelete} className="text-red-600">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* === Tabbed Content Area === */}
        <Tabs defaultValue="original" className={clsx(
          "w-full"
        )}>
          <TabsList className="mb-4 inline-flex h-9 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground w-auto">
            {/* Original Tab Trigger - Now First */}
            <TabsTrigger value="original" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex gap-1.5">
              <FileText className="h-4 w-4 flex-shrink-0"/>
              Original
            </TabsTrigger>
            {/* Summary Tab Trigger - Now Second */}
            <TabsTrigger value="summary" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex gap-1.5">
              <List className="h-4 w-4 flex-shrink-0"/>
              Summary
            </TabsTrigger>
            {/* Actions Tab Trigger - Now Third */}
            <TabsTrigger value="actions" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex gap-1.5">
              <CheckSquare className="h-4 w-4 flex-shrink-0"/>
              {/* Display count, handles 0 correctly */}
              Actions ({localActions?.length || 0}) 
            </TabsTrigger>
          </TabsList>

          {/* Apply calculated minHeight to each content panel */}
          <TabsContent 
            value="summary" 
            style={{ minHeight: contentMinHeight }}
            className="focus-visible:ring-0 focus-visible:ring-offset-0 mt-0 pb-4">
            {/* Attach ref to the actual content container */}
            <ul ref={summaryContentRef} className="list-disc space-y-1 pl-5 text-sm">
              {localSummary.map((point, index) => (
                <div key={`summary-item-${entry.id}-${index}`}> {/* Outer div for key */} 
                  <li className="group">
                    {editingSummaryIndex === index ? (
                      // === Edit Mode ===
                      <div className="flex items-center space-x-2 w-full"> {/* Wrapper for layout */}
                        <span 
                          ref={editableSummarySpanRef}
                          contentEditable="true"
                          suppressContentEditableWarning={true}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveSummaryEdit();
                            if (e.key === 'Escape') handleCancelEditSummary();
                          }}
                          onBlur={() => setTimeout(handleSaveSummaryEdit, 100)}
                          className="min-w-0 break-words outline-none focus:outline focus:outline-1 focus:outline-offset-1 focus:outline-blue-500 focus:bg-muted/50 rounded px-1"
                        ></span>
                        <div className="flex items-center flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600 hover:text-green-700"
                            onClick={handleSaveSummaryEdit}
                            aria-label="Save summary point"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={handleCancelEditSummary}
                            aria-label="Cancel edit summary point"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // === Display Mode ===
                      <div 
                        className="flex items-center space-x-2 w-full cursor-pointer" 
                        onClick={() => handleStartEditSummary(index)}
                      >
                        <span className="min-w-0 break-words">{point}</span>
                        <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              console.log(`[+] Sum Click: Set addSumAfterIdx=${index}`); // Log click
                              setIsAddingSummary(true);
                              setAddSummaryAfterIndex(index);
                            }}
                            aria-label="Add summary point below"
                            title="Add summary point below"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); handleStartEditSummary(index); }}
                            aria-label="Edit summary point"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSummary(index); }}
                            aria-label="Delete summary point"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                  {/* Conditionally Render Add Form Below This Item */} 
                  {isAddingSummary && addSummaryAfterIndex === index && (
                    <div className="flex items-center space-x-2 pt-2 pl-0 ml-[-0.75rem]"> {/* Adjusted negative margin */}
                      <Input 
                        type="text" 
                        placeholder="New summary point..."
                        value={newSummaryText} 
                        onChange={(e) => setNewSummaryText(e.target.value)}
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter') handleAddNewSummary(); 
                          if (e.key === 'Escape') handleCancelAddSummary();
                        }} 
                        className="h-8 flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                        autoFocus
                      />
                      <Button size="sm" onClick={handleAddNewSummary} className="h-8">Save</Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelAddSummary} className="h-8">Cancel</Button>
                    </div>
                  )}
                </div>
              ))}
              {/* Render Add Button or Form when list is empty */} 
              {(!localSummary || localSummary.length === 0) && (
                <div className="pl-5 pt-2"> {/* Match list indentation */} 
                  {!isAddingSummary ? (
                      <Button
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground justify-start pl-1 h-8"
                      onClick={() => { setIsAddingSummary(true); setAddSummaryAfterIndex(-1); }}
                      >
                      <PlusCircle className="h-4 w-4 mr-2"/>
                      Add Summary Point
                      </Button>
                  ) : (
                      /* Conditionally Render Add Form when list is empty */
                      isAddingSummary && addSummaryAfterIndex === -1 && (
                          <div className="flex items-center space-x-2"> 
                          <Input 
                              type="text" 
                              placeholder="New summary point..."
                              value={newSummaryText} 
                              onChange={(e) => setNewSummaryText(e.target.value)}
                              onKeyDown={(e) => { 
                              if (e.key === 'Enter') handleAddNewSummary(); 
                              if (e.key === 'Escape') handleCancelAddSummary();
                              }} 
                              className="h-8 flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                              autoFocus
                          />
                          <Button size="sm" onClick={handleAddNewSummary} className="h-8">Save</Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelAddSummary} className="h-8">Cancel</Button>
                          </div>
                      )
                  )}
                </div>
              )}
            </ul>
          </TabsContent>

          <TabsContent 
            value="original" 
            style={{ minHeight: contentMinHeight }}
            className="prose prose-sm dark:prose-invert max-w-none focus-visible:ring-0 focus-visible:ring-offset-0 mt-0 pb-4">
            {/* Attach ref to the actual content container */}
            <div ref={originalContentRef} 
              dangerouslySetInnerHTML={{ __html: entry.content || '' }} 
            />
          </TabsContent>

          <TabsContent 
            value="actions" 
            style={{ minHeight: contentMinHeight }}
            className="focus-visible:ring-0 focus-visible:ring-offset-0 mt-0">
            {/* Attach ref to the actual content container - Reworked structure */}
            <div ref={actionsContentRef} className="space-y-3 pb-4">
              {/* Conditionally render the list of actions */}
              {localActions && localActions.length > 0 && (
                localActions.map((action, index) => (
                  <div key={`action-item-${entry.id}-${index}`}> {/* Outer div for map key */}
                    <div className="flex items-center space-x-2 group"> {/* Inner div for flex layout */} 
                      {editingActionIndex === index ? (
                         // === Edit Mode ===
                         <div className="flex items-center space-x-2 w-full"> {/* Wrapper for layout */}
                           <Checkbox 
                             id={`action-edit-${entry.id}-${index}`}
                             checked={localActions[index].completed}
                             aria-hidden="true"
                             disabled
                             className="flex-shrink-0 invisible pointer-events-none"
                           />
                           <span
                             ref={editableActionLabelRef}
                             contentEditable="true"
                             suppressContentEditableWarning={true}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') handleSaveActionEdit();
                               if (e.key === 'Escape') handleCancelEditAction();
                             }}
                             onBlur={() => setTimeout(handleSaveActionEdit, 100)}
                             className={clsx("font-normal cursor-text text-sm outline-none focus:outline focus:outline-1 focus:outline-offset-1 focus:outline-blue-500 focus:bg-muted/50 rounded px-1",
                                          action.completed ? 'text-muted-foreground line-through italic' : 'text-foreground')}
                           ></span>
                           <div className="flex items-center flex-shrink-0">
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-6 w-6 text-green-600 hover:text-green-700"
                               onClick={handleSaveActionEdit}
                               aria-label="Save action item"
                             >
                               <Check className="h-4 w-4" />
                             </Button>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-6 w-6 text-muted-foreground hover:text-destructive"
                               onClick={handleCancelEditAction}
                               aria-label="Cancel edit action item"
                             >
                               <X className="h-4 w-4" />
                             </Button>
                           </div>
                         </div>
                       ) : (
                         // === Display Mode ===
                         <>
                           {/* Checkbox and Label part */}
                           <div className="flex items-center space-x-2 min-w-0">
                             <Checkbox 
                               id={`action-${entry.id}-${index}`} 
                               checked={action.completed} 
                               onCheckedChange={() => handleActionToggle(index)} 
                               aria-label={action.task}
                               className="flex-shrink-0"
                             />
                             <Label 
                               htmlFor={`action-${entry.id}-${index}`} 
                               className={clsx("font-normal text-sm cursor-pointer transition-colors duration-200 ease-in-out truncate",
                                           action.completed ? 'text-muted-foreground line-through italic' : 'text-foreground')}
                             >
                               {action.task}
                             </Label>
                           </div>
                           {/* Hover Buttons Container */}
                           <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-6 w-6 text-muted-foreground hover:text-foreground"
                               onClick={(e) => { 
                                 e.stopPropagation(); // Prevent row click if applicable
                                 setIsAddingAction(true);
                                 setAddActionAfterIndex(index);
                               }}
                               aria-label="Add action below"
                               title="Add action below"
                             >
                               <PlusCircle className="h-4 w-4" />
                             </Button>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-6 w-6 text-muted-foreground hover:text-foreground"
                               onClick={(e) => { e.stopPropagation(); handleStartEditAction(index); }}
                               aria-label="Edit action item"
                             >
                               <Pencil className="h-4 w-4" />
                             </Button>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                               onClick={() => handleDeleteAction(index)} 
                               aria-label="Delete action item"
                             >
                               <X className="h-4 w-4" />
                             </Button>
                           </div>
                         </>
                       )}
                    </div>
                    {/* Conditionally Render Add Form Below This Item */} 
                    {isAddingAction && addActionAfterIndex === index && (
                       <div className="flex items-center space-x-2 pt-2 pl-3"> {/* Final indent adjustment */}
                         <Input 
                           type="text" 
                           placeholder="New action item..."
                           value={newActionText} 
                           onChange={(e) => setNewActionText(e.target.value)}
                           onKeyDown={(e) => { 
                             if (e.key === 'Enter') handleAddNewAction(); 
                             if (e.key === 'Escape') { setIsAddingAction(false); setNewActionText(''); setAddActionAfterIndex(null); } // Esc to cancel
                           }} 
                           className="h-8 flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0" // Remove border and focus ring for cleaner look
                           autoFocus
                         />
                         <Button size="sm" onClick={handleAddNewAction} className="h-8">Save</Button>
                         <Button variant="ghost" size="sm" onClick={() => { setIsAddingAction(false); setNewActionText(''); setAddActionAfterIndex(null); }} className="h-8">Cancel</Button>
                       </div>
                    )}
                  </div>
                ))
              )}
              
              {/* Conditionally render the "No items" message */}
              {(!localActions || localActions.length === 0) && !isAddingAction && (
                 <p className="text-sm text-muted-foreground pt-1">No actionable items found. Add one below.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        {/* === End Tabbed Content Area === */}

        {/* Footer Area (Consolidated Metadata) - MOVED BELOW TABS */}
        <div className="flex flex-wrap gap-x-2 gap-y-1 items-center text-xs text-muted-foreground border-t border-border pt-2"> 
          {/* Entry Type */}
          <span className="inline-flex items-center gap-1">
            <EntryIcon className="h-3.5 w-3.5" />
            <span>{entryTypeText}</span>
          </span>

          {/* Time */}
          <FooterSeparator />
          <span>{creationTime}</span>

          {/* Separator only if tags exist */}
          {hasTags && <FooterSeparator />}

          {/* Tag Spinner */}
          {isGenerating && !entry.meta_tag && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}

          {/* Meta Tag - Use the new component */}
          <MetaTagEditor
            entryId={entry.id}
            currentTag={entry.meta_tag ?? null}
            uniqueTags={uniqueMetaTags}
            onUpdateTag={updateEntryMetaTag}
          />

          {/* Intent Tag */}
          {entry.intent_tag && (
            <Badge
              key={`intent-${entry.intent_tag}`}
              variant="outline"
              className={getTagClasses(entry.intent_tag, 'intent')}
              onClick={(e) => { e.stopPropagation(); handleTagClick(entry.intent_tag!, 'intent'); }}
            >
              {entry.intent_tag}
            </Badge>
          )}
          {/* Content Tags */}
          {entry.tags && entry.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={getTagClasses(tag, 'content')}
              onClick={(e) => { e.stopPropagation(); handleTagClick(tag, 'content'); }}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
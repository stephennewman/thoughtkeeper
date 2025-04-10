'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, parseISO, startOfDay } from 'date-fns';
import { JournalSidebar, JournalEntry, EntryEditorDialog, StaticAnalysisColumn } from '@/components';
import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import debounce from 'lodash.debounce';
import { X, Loader2, Plus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Define a type matching the Supabase table structure
// Assuming tags will be stored as string[] in jsonb
export interface SupabaseEntry {
  id: string;         // uuid
  created_at: string; // timestamptz
  date: string;         // date (YYYY-MM-DD)
  content: string;      // text
  summary?: string | null; // text
  tags?: string[] | null; // jsonb
  meta_tag?: string | null; // Add meta_tag
  intent_tag?: string | null; // Add intent_tag
}

// Keep the existing Entry type for simplicity or merge later if needed
export interface Entry extends SupabaseEntry {}

export interface MacroSummary {
  mood: string;
  moodEmoji: string;
  focusAreas: {
    category: string;
    icon: string;
    highlight: string;
  }[];
  keyTakeaway: string;
}

// Define tag types
export type TagType = 'meta' | 'intent' | 'content';

// --- Define Color Palettes (Example - choose colors you like) ---
// Structure: { base: 'bg-... text-... dark:...', hover: 'hover:bg-... dark:hover:bg-...' } - adjust dark modes as needed
const metaTagColors = [
  { base: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300', hover: 'hover:bg-purple-200 dark:hover:bg-purple-800/70' },
  { base: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300', hover: 'hover:bg-pink-200 dark:hover:bg-pink-800/70' },
  { base: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', hover: 'hover:bg-red-200 dark:hover:bg-red-800/70' },
  { base: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300', hover: 'hover:bg-rose-200 dark:hover:bg-rose-800/70' },
  { base: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-300', hover: 'hover:bg-fuchsia-200 dark:hover:bg-fuchsia-800/70' },
];
const intentTagColors = [
  { base: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', hover: 'hover:bg-green-200 dark:hover:bg-green-800/70' },
  { base: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-300', hover: 'hover:bg-lime-200 dark:hover:bg-lime-800/70' },
  { base: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300', hover: 'hover:bg-teal-200 dark:hover:bg-teal-800/70' },
  { base: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300', hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-800/70' },
  { base: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300', hover: 'hover:bg-cyan-200 dark:hover:bg-cyan-800/70' },
];
const contentTagColors = [
  { base: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', hover: 'hover:bg-blue-200 dark:hover:bg-blue-800/70' },
  { base: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300', hover: 'hover:bg-indigo-200 dark:hover:bg-indigo-800/70' },
  { base: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300', hover: 'hover:bg-sky-200 dark:hover:bg-sky-800/70' },
  { base: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300', hover: 'hover:bg-violet-200 dark:hover:bg-violet-800/70' },
  // Add more unique colors if needed
];

// Define the structure for color assignments
interface TagColorMap {
  [lowerCaseTag: string]: { base: string; hover: string };
}
// --- End Color Definitions ---

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [errorLoadingEntries, setErrorLoadingEntries] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM-dd');
  });
  const [generatingTagsForId, setGeneratingTagsForId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMetaTag, setActiveMetaTag] = useState<string | null>(null);
  const [activeIntentTag, setActiveIntentTag] = useState<string | null>(null);
  const [activeContentTags, setActiveContentTags] = useState<Set<string>>(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // State for the editor dialog
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null); // null for add mode

  // Ref for the scrollable main content area
  const mainContentScrollRef = useRef<HTMLDivElement>(null);

  // Combined calculation for counts and highlight colors
  const { tagCounts, highlightedTagColors } = useMemo(() => {
    const counts: { [key: string]: number } = {};
    const colors: TagColorMap = {};
    let metaColorIndex = 0;
    let intentColorIndex = 0;
    let contentColorIndex = 0;
    const assignedMetaColors: { [key: string]: boolean } = {};
    const assignedIntentColors: { [key: string]: boolean } = {};
    const assignedContentColors: { [key: string]: boolean } = {};

    // Calculate counts based on ALL entries for JournalEntry highlighting
    allEntries.forEach(entry => {
      // Count and assign color for Meta Tag
      if (entry.meta_tag) {
        const lowerTag = entry.meta_tag.toLowerCase();
        counts[lowerTag] = (counts[lowerTag] || 0) + 1;
        if (counts[lowerTag] >= 2 && !assignedMetaColors[lowerTag]) {
           colors[lowerTag] = metaTagColors[metaColorIndex % metaTagColors.length];
           assignedMetaColors[lowerTag] = true;
           metaColorIndex++;
        }
      }
      // Count and assign color for Intent Tag
      if (entry.intent_tag) {
        const lowerTag = entry.intent_tag.toLowerCase();
        counts[lowerTag] = (counts[lowerTag] || 0) + 1;
         if (counts[lowerTag] >= 2 && !assignedIntentColors[lowerTag]) {
           colors[lowerTag] = intentTagColors[intentColorIndex % intentTagColors.length];
           assignedIntentColors[lowerTag] = true;
           intentColorIndex++;
        }
      }
      // Count and assign color for Content Tags
      entry.tags?.forEach(tag => {
        const lowerTag = tag.toLowerCase(); // Ensure lowercase for safety
        counts[lowerTag] = (counts[lowerTag] || 0) + 1;
         if (counts[lowerTag] >= 2 && !assignedContentColors[lowerTag]) {
           colors[lowerTag] = contentTagColors[contentColorIndex % contentTagColors.length];
           assignedContentColors[lowerTag] = true;
           contentColorIndex++;
        }
      });
    });
    return { tagCounts: counts, highlightedTagColors: colors };
  }, [allEntries]);

  // REVISED Fetch entries: Handle single meta/intent (AND) + multi content (OR within content, AND with meta/intent)
  const fetchEntries = useCallback(async (
    query: string, 
    metaTag: string | null,     // Single
    intentTag: string | null,   // Single
    contentTags: Set<string> 
  ) => {
    setErrorLoadingEntries(null);
    try {
      let supabaseQuery = supabase
        .from('entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      const trimmedQuery = query.trim();

      // Apply filters
      if (trimmedQuery) {
        // Search overrides tag filters 
        supabaseQuery = supabaseQuery.textSearch('search_vector', trimmedQuery, {
          type: 'websearch',
          config: 'english'
        });
      } else {
        // Apply tag filters (AND logic across types)
        if (metaTag) {
          supabaseQuery = supabaseQuery.eq('meta_tag', metaTag);
        }
        if (intentTag) {
          supabaseQuery = supabaseQuery.eq('intent_tag', intentTag);
        }
        if (contentTags.size > 0) {
          // Use overlaps for content tags (entry must have AT LEAST ONE of the selected tags - OR logic)
          const tagsArray = Array.from(contentTags);
          supabaseQuery = supabaseQuery.overlaps('tags', tagsArray);
        }
      }

      const { data, error } = await supabaseQuery;

      if (error) {
         throw error;
      } 
      setEntries((data as Entry[]) || []);
      
    } catch (error: any) {
       console.error('Error loading entries:', error);
       setErrorLoadingEntries(`Failed to load entries: ${error.message}`);
       setEntries([]);
    } 
  }, []);

  // Debounced version - Pass revised state
  const debouncedFetchEntries = useMemo(() => {
    const debouncedFn = debounce((currentQuery: string, currentMeta: string | null, currentIntent: string | null, currentContent: Set<string>) => {
       fetchEntries(currentQuery, currentMeta, currentIntent, currentContent);
    }, 300);
    return debouncedFn;
  }, [fetchEntries]);

  // Initial Load Effect - Use new Set() for all
  useEffect(() => {
    const initialFetch = async () => {
        setIsInitialLoading(true);
        setErrorLoadingEntries(null);
        try {
          // Fetch all entries initially
          const { data, error } = await supabase
            .from('entries')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });
            
          if (error) throw error;

          const fetchedEntries = (data as Entry[]) || [];
          setAllEntries(fetchedEntries);
          setEntries(fetchedEntries);

        } catch(error: any) {
          console.error('Initial error loading entries:', error);
          setErrorLoadingEntries(`Failed to load entries: ${error.message}`);
          setAllEntries([]);
          setEntries([]);
        } finally {
          setIsInitialLoading(false);
        }
    }
    initialFetch();
    // Run only once on mount - Supabase client assumed stable
  }, []); // Empty dependency array for initial fetch

  // Effect for search/filter changes - Pass revised state
  useEffect(() => {
    debouncedFetchEntries(searchQuery, activeMetaTag, activeIntentTag, activeContentTags);
    return () => {
      debouncedFetchEntries.cancel();
    };
  }, [searchQuery, activeMetaTag, activeIntentTag, activeContentTags, debouncedFetchEntries]); // Update dependencies

  // REVISED handleTagClick: Single toggle meta/intent, multi toggle content
  const handleTagClick = useCallback((tag: string, type: TagType) => {
    setSearchQuery(''); // Clear search on tag click

    if (type === 'meta') {
      setActiveMetaTag(prev => (prev === tag ? null : tag)); // Toggle
      setActiveIntentTag(null);                       // Clear other single-select
      // DO NOT clear content tags
    } else if (type === 'intent') {
      setActiveIntentTag(prev => (prev === tag ? null : tag)); // Toggle
      setActiveMetaTag(null);                         // Clear other single-select
      // DO NOT clear content tags
    } else { // type === 'content'
      setActiveContentTags(prev => {
        const newSet = new Set(prev);
        if (newSet.has(tag)) {
          newSet.delete(tag); // Toggle off
        } else {
          newSet.add(tag); // Toggle on
        }
        return newSet;
      });
      // DO NOT clear meta/intent tags
    }

    // Scroll main content to top
    mainContentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  }, []); // Dependencies remain empty

  // Define callback for when AddEntryDialog adds a new entry (optimistic update)
  const handleEntryAdded = useCallback((newEntry: Entry) => {
    setEntries(prevEntries => [newEntry, ...prevEntries]);
    // Set loading state for this specific new entry ID
    setGeneratingTagsForId(newEntry.id); 
  }, []);

  // Define callback for when background AI tagging completes and updates Supabase
  const handleEntryTagsUpdated = useCallback((entryId: string, updatedTags: Partial<Entry>) => {
    setEntries(prevEntries =>
      prevEntries.map(entry =>
        entry.id === entryId ? { ...entry, ...updatedTags } : entry
      )
    );
    // Clear loading state when tags for this ID are done
    setGeneratingTagsForId(null); 
  }, []);

  const handleUpdateEntry = async (id: string, content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    // Consider adding an isUpdating state here
    // Indicate update in progress for this specific entry?
    // setGeneratingTagsForId(id); // Re-use state? Or new state?
    
    try {
      // *** TODO: Implement AI tag re-generation on update? ***
      // If content changes significantly, tags might need updating.
      // This adds complexity (API calls, state management).
      // For now, only update content.

      const { data, error } = await supabase
        .from('entries')
        .update({ content: trimmedContent }) // Only update content for now
        .eq('id', id)
        .select() 
        .single(); 

      if (error) {
        throw error;
      }

      if (data) {
        setEntries(prevEntries =>
          prevEntries.map(entry => (entry.id === id ? (data as Entry) : entry))
        );
      }
    } catch (error: any) {
      console.error('Error updating entry:', error);
      alert(`Failed to update entry: ${error.message}`);
    } finally {
        // Clear update indicator if used
        // if (generatingTagsForId === id) setGeneratingTagsForId(null); 
    }
  };

  const handleDeleteEntry = async (id: string) => {
    // Consider adding an isDeleting state here
    const originalEntries = [...entries];
    setEntries(prevEntries => prevEntries.filter(entry => entry.id !== id));

    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id);

      if (error) {
        // Revert UI update if delete fails
        setEntries(originalEntries);
        throw error;
      }
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      alert(`Failed to delete entry: ${error.message}`);
      setEntries(originalEntries);
    }
  };

  // --- Dialog Handling Callbacks ---
  const handleAddClick = () => {
      setEditingEntry(null); // Ensure edit mode is off
      setIsEditorOpen(true);
  };

  const handleEditClick = (entry: Entry) => {
      setEditingEntry(entry); // Set entry to edit
      setIsEditorOpen(true);
  };

  // --- Entry CRUD Callbacks (passed to dialog/entry component) ---
  const handleEntryUpdated = useCallback((updatedEntry: Entry) => {
    setEntries(prevEntries =>
      prevEntries.map(entry =>
        entry.id === updatedEntry.id ? updatedEntry : entry
      )
    );
    // Optionally clear generating state if edit triggered it
    if (generatingTagsForId === updatedEntry.id) {
      setGeneratingTagsForId(null);
    }
  }, [generatingTagsForId]);

  // Update debug logs
  console.log('[Debug] activeMetaTag state:', activeMetaTag);
  console.log('[Debug] activeIntentTag state:', activeIntentTag);
  console.log('[Debug] activeContentTags state:', activeContentTags);

  return (
    <div className="flex flex-col min-h-screen">
      {/* The Header component below will be removed */}
      {/* 
      <Header 
        entries={entries}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        macroSummary={macroSummary}
        isGeneratingMacroSummary={isGeneratingMacroSummary}
        onGenerateMacroSummary={handleGenerateMacroSummary}
      /> 
      */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar - Hidden on smaller than lg screens, add right border */}
        <div className="hidden lg:block border-r">
          <JournalSidebar
            entries={allEntries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
        {/* Main Content Area - Use equal horizontal padding */}
        <div className="flex-1 flex flex-col overflow-y-hidden p-4 gap-2"> {/* Reverted back to p-4 */}
          {/* Combined Controls Row - Adjust spacing */} 
          {/* Use gap-4 between main sections, items-center for vertical alignment */} 
          <div className="flex justify-between items-center mb-2 flex-shrink-0 gap-4"> 
              {/* Left side: Filter/Status Indicators */}
              <div className="flex items-center gap-2 h-8 flex-shrink-0">
                {/* Error Message */}
                {errorLoadingEntries && 
                    <p className="text-red-600 text-sm">Error: {errorLoadingEntries}</p>
                }
                {/* Initial Loader Placeholder */}
                 {isInitialLoading && !errorLoadingEntries && (
                     <div className="flex items-center justify-start h-8"> 
                         <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                     </div>
                 )}
              </div>

             {/* Right side: Search Input and Add Button - Use gap-2 within this group */}
             <div className="flex items-center gap-2"> 
                 <Input
                    type="search"
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full max-w-xs"
                  />
                 <Button 
                    onClick={handleAddClick} 
                    size="sm" 
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity flex-shrink-0"
                 > 
                    <Plus className="mr-2 h-4 w-4" /> Add Entry
                 </Button>
             </div>
          </div>

          {/* Entries List - No horizontal padding needed here */}
          <div ref={mainContentScrollRef} className="flex-grow overflow-y-auto pr-2"> {/* Add ref and padding-right for scrollbar */}
            {isInitialLoading && (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}
            {!isInitialLoading && !errorLoadingEntries && (
                entries.length === 0 && (searchQuery || activeMetaTag || activeIntentTag || activeContentTags.size > 0) ? (
                    <p className="pt-4 text-center text-gray-500">No entries found matching filters.</p>
                ) : entries.length === 0 ? (
                    <p className="pt-4 text-center text-gray-500">No entries yet. Click the '+' button to add one!</p>
                ) : (
                    <JournalEntry
                        selectedDate={selectedDate}
                        entries={entries}
                        onUpdateEntry={(id, content) => { /* Now handled by dialog */ }}
                        onDeleteEntry={handleDeleteEntry}
                        generatingTagsForId={generatingTagsForId}
                        onTagClick={handleTagClick}
                        tagCounts={tagCounts}
                        highlightedTagColors={highlightedTagColors}
                        onEditClick={handleEditClick}
                    />
                )
            )}
          </div>
        </div>

        {/* Right Analysis Column - Pass revised state */}
        <StaticAnalysisColumn
          entries={entries} // Pass filtered entries
          onTagClick={handleTagClick} // Pass updated handler
          activeMetaTag={activeMetaTag} // Pass single string | null
          activeIntentTag={activeIntentTag} // Pass single string | null
          activeContentTags={activeContentTags} // Pass Set
        />

      </main>
      {/* Render the Dialog */}
      <EntryEditorDialog 
        isOpen={isEditorOpen}
        setIsOpen={setIsEditorOpen}
        selectedDate={selectedDate} // For add mode title
        initialEntry={editingEntry} // Pass entry being edited (or null)
        onEntryAdded={handleEntryAdded}
        onEntryUpdated={handleEntryUpdated} // Pass the update handler
        onEntryTagsUpdated={handleEntryTagsUpdated}
        generatingTagsForId={generatingTagsForId}
        setGeneratingTagsForId={setGeneratingTagsForId} // Pass setter
      />
    </div>
  );
} 
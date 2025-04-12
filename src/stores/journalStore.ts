import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Entry } from '@/types';
import {
  fetchEntriesPaginatedService,
  addEntryService,
  updateEntryContentService,
  deleteEntryService,
} from '@/lib/entryService';
import { format } from 'date-fns';
import debounce from 'lodash.debounce';
import { supabase } from '@/lib/supabaseClient';

// Define PAGE_SIZE constant
const PAGE_SIZE = 20;

// Define the state structure
interface JournalState {
  // Filters
  searchQuery: string;
  activeMetaTag: string | null;
  activeIntentTag: string | null;
  activeContentTags: Set<string>;

  // Data & Pagination
  loadedEntries: Entry[]; // All chronologically loaded entries
  displayEntries: Entry[]; // Entries filtered client-side from loadedEntries
  currentPage: number;
  hasMoreEntries: boolean;

  // Loading & Error States
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  isProcessingEntry: boolean; // For Add/Update/Delete/Tagging spinner
  errorState: string | null;

  // UI State
  isEditorOpen: boolean;
  editingEntry: Entry | null;
  highlightedTagColors: { [lowerCaseTag: string]: { base: string; hover: string } };
}

// Define the actions
interface JournalActions {
  loadInitialEntries: () => Promise<void>;
  loadMoreEntries: () => Promise<void>;
  setFilters: (filters: Partial<{
    searchQuery: string;
    activeMetaTag: string | null;
    activeIntentTag: string | null;
    activeContentTags: Set<string>;
  }>) => void;
  addEntry: (content: string, date: string) => Promise<void>;
  updateEntryTags: (entryId: string, entryUpdate: Partial<Entry> | Entry) => void;
  updateEntry: (entryId: string, content: string) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  openEditorDialog: (entryToEdit?: Entry | null) => void;
  closeEditorDialog: () => void;
}

// Define the initial state separately for resetting
const initialState: JournalState = {
  // Filters
  searchQuery: '',
  activeMetaTag: null,
  activeIntentTag: null,
  activeContentTags: new Set(),
  // Data & Pagination
  loadedEntries: [],
  displayEntries: [],
  currentPage: 0,
  hasMoreEntries: true,
  // Loading & Error States
  isLoadingInitial: false,
  isLoadingMore: false,
  isProcessingEntry: false,
  errorState: null,
  // UI State
  isEditorOpen: false,
  editingEntry: null,
  highlightedTagColors: {},
};

// --- Define Color Palettes (Move from JournalEntry.tsx) ---
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
];
// --- End Color Palettes ---

// --- Helper function to calculate tag colors (Move from JournalEntry.tsx) ---
const calculateHighlightedTagColors = (entries: Entry[]): { [lowerCaseTag: string]: { base: string; hover: string } } => {
    const counts: { [key: string]: number } = {};
    const colors: { [lowerCaseTag: string]: { base: string; hover: string } } = {};
    let metaColorIndex = 0;
    let intentColorIndex = 0;
    let contentColorIndex = 0;
    const assignedMetaColors: { [key: string]: boolean } = {};
    const assignedIntentColors: { [key: string]: boolean } = {};
    const assignedContentColors: { [key: string]: boolean } = {};

    entries.forEach(entry => {
      if (entry.meta_tag) {
        const lowerTag = entry.meta_tag.toLowerCase();
        counts[lowerTag] = (counts[lowerTag] || 0) + 1;
        if (counts[lowerTag] >= 2 && !assignedMetaColors[lowerTag]) {
           colors[lowerTag] = metaTagColors[metaColorIndex % metaTagColors.length];
           assignedMetaColors[lowerTag] = true;
           metaColorIndex++;
        }
      }
      if (entry.intent_tag) {
        const lowerTag = entry.intent_tag.toLowerCase();
        counts[lowerTag] = (counts[lowerTag] || 0) + 1;
         if (counts[lowerTag] >= 2 && !assignedIntentColors[lowerTag]) {
           colors[lowerTag] = intentTagColors[intentColorIndex % intentTagColors.length];
           assignedIntentColors[lowerTag] = true;
           intentColorIndex++;
        }
      }
      entry.tags?.forEach(tag => {
        const lowerTag = tag.toLowerCase();
        counts[lowerTag] = (counts[lowerTag] || 0) + 1;
         if (counts[lowerTag] >= 2 && !assignedContentColors[lowerTag]) {
           colors[lowerTag] = contentTagColors[contentColorIndex % contentTagColors.length];
           assignedContentColors[lowerTag] = true;
           contentColorIndex++;
        }
      });
    });
    return colors;
};
// --- End helper function ---

// --- Client-side Filtering Logic ---
// (Adapted from previous applyFilters)
const filterLoadedEntries = (
  entriesToFilter: Entry[],
  filters: Pick<JournalState, 'searchQuery' | 'activeMetaTag' | 'activeIntentTag' | 'activeContentTags'>
): Entry[] => {
  const { searchQuery, activeMetaTag, activeIntentTag, activeContentTags } = filters;
  const lowerSearchQuery = searchQuery.toLowerCase().trim();

  if (!lowerSearchQuery && !activeMetaTag && !activeIntentTag && activeContentTags.size === 0) {
    // No filters active, return all loaded entries
    return entriesToFilter;
  }

  return entriesToFilter.filter(entry => {
    // Filter by active tags (AND logic for meta/intent, OR for content)
    if (activeMetaTag && entry.meta_tag !== activeMetaTag) {
      return false;
    }
    if (activeIntentTag && entry.intent_tag !== activeIntentTag) {
      return false;
    }
    if (activeContentTags.size > 0) {
        // Entry must have at least one of the active content tags
        if (!Array.from(activeContentTags).some(filterTag => entry.tags?.includes(filterTag))) {
            return false;
        }
    }

    // Filter by search query (if any) - searches content and ALL tags
    if (lowerSearchQuery) {
      const searchableContent = [
        entry.content?.toLowerCase(),
        entry.meta_tag?.toLowerCase(),
        entry.intent_tag?.toLowerCase(),
        ...(entry.tags || []).map(t => t.toLowerCase()),
      ].filter(Boolean).join(' ');
      if (!searchableContent.includes(lowerSearchQuery)) {
        return false;
      }
    }

    return true;
  });
};
// --- End Client-side Filtering ---

// Create the store with devtools middleware
export const useJournalStore = create<JournalState & JournalActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      loadInitialEntries: async () => {
        if (get().isLoadingInitial) return; // Prevent concurrent initial loads
        set({
          isLoadingInitial: true,
          isLoadingMore: false, // Ensure not interfering
          errorState: null,
          currentPage: 0,
          loadedEntries: [],
          displayEntries: [],
          hasMoreEntries: true, // Assume more initially
        });
        try {
          const { data, error } = await fetchEntriesPaginatedService(0, PAGE_SIZE);
          if (error) throw error;

          const fetchedEntries = data || [];
          const newHighlightedTagColors = calculateHighlightedTagColors(fetchedEntries);
          const newDisplayEntries = filterLoadedEntries(fetchedEntries, get()); // Filter initial batch

          set({
            loadedEntries: fetchedEntries,
            displayEntries: newDisplayEntries,
            highlightedTagColors: newHighlightedTagColors,
            currentPage: 1, // First page loaded
            hasMoreEntries: fetchedEntries.length === PAGE_SIZE,
          });
        } catch (error: any) {
          console.error("Failed to load initial entries:", error);
          set({ errorState: `Failed to load entries: ${error.message}`, hasMoreEntries: false });
        } finally {
          set({ isLoadingInitial: false });
        }
      },

      loadMoreEntries: async () => {
        const { isLoadingInitial, isLoadingMore, hasMoreEntries, currentPage, loadedEntries } = get();
        if (isLoadingInitial || isLoadingMore || !hasMoreEntries) {
          return;
        }

        set({ isLoadingMore: true, errorState: null });
        try {
          const offset = currentPage * PAGE_SIZE;
          const { data, error } = await fetchEntriesPaginatedService(offset, PAGE_SIZE);
          if (error) throw error;

          const fetchedEntries = data || [];
          const combinedEntries = [...loadedEntries, ...fetchedEntries];
          const newHighlightedTagColors = calculateHighlightedTagColors(combinedEntries); // Recalculate on combined
          const newDisplayEntries = filterLoadedEntries(combinedEntries, get()); // Filter combined batch

          set({
            loadedEntries: combinedEntries,
            displayEntries: newDisplayEntries,
            highlightedTagColors: newHighlightedTagColors,
            currentPage: currentPage + 1,
            hasMoreEntries: fetchedEntries.length === PAGE_SIZE,
          });
        } catch (error: any) {
          console.error("Failed to load more entries:", error);
          set({ errorState: `Failed to load more entries: ${error.message}`, hasMoreEntries: false }); // Stop trying if load more fails
        } finally {
          set({ isLoadingMore: false });
        }
      },

      setFilters: (newFilters) => {
        // 1. Update filter state
        set(state => ({
            searchQuery: newFilters.searchQuery !== undefined ? newFilters.searchQuery : state.searchQuery,
            activeMetaTag: newFilters.activeMetaTag !== undefined ? newFilters.activeMetaTag : state.activeMetaTag,
            activeIntentTag: newFilters.activeIntentTag !== undefined ? newFilters.activeIntentTag : state.activeIntentTag,
            activeContentTags: newFilters.activeContentTags !== undefined ? newFilters.activeContentTags : state.activeContentTags,
        }));
        // 2. Re-apply client-side filters to *currently loaded* entries
        set(state => ({
            displayEntries: filterLoadedEntries(state.loadedEntries, state)
        }));
      },

      addEntry: async (content, date) => {
        set({ isProcessingEntry: true, errorState: null });
        try {
          // 1. Add the basic entry via service
          const { data: insertedData, error: insertError } = await addEntryService(date, content);
          if (insertError) throw insertError;
          if (!insertedData) throw new Error("Service returned no data on add.");

          // 2. Refresh the list from the start to ensure consistency (Simplest approach)
          // This implicitly handles tag colors and filtering.
          // Don't await this, let it run, but reset processing state immediately after triggering
          get().loadInitialEntries();

          // 3. Trigger background tagging (can run independently after refresh starts)
          (async () => {
            try {
              const contentToTag = insertedData.content;
              const fetchOptions = {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: contentToTag })
              };
              const [metaResponse, intentResponse, tagsResponse] = await Promise.all([
                 fetch('/api/classify-meta', fetchOptions),
                 fetch('/api/classify-intent', fetchOptions),
                 fetch('/api/tags', fetchOptions)
              ]);

              // Consider more robust error checking here
              if (!metaResponse.ok) console.warn('Meta tag API failed');
              if (!intentResponse.ok) console.warn('Intent tag API failed');
              if (!tagsResponse.ok) console.warn('Content tag API failed');

              const metaResult = metaResponse.ok ? await metaResponse.json() : {};
              const intentResult = intentResponse.ok ? await intentResponse.json() : {};
              const tagsResult = tagsResponse.ok ? await tagsResponse.json() : {};

              const updatePayload: Partial<Entry> = {};
                if (metaResult.metaTag) { updatePayload.meta_tag = metaResult.metaTag; }
                if (intentResult.intentTag) { updatePayload.intent_tag = intentResult.intentTag; }
                if (tagsResult.tags) { updatePayload.tags = tagsResult.tags; }

              if (Object.keys(updatePayload).length > 0) {
                 const { error: updateError } = await supabase
                  .from('entries')
                  .update(updatePayload)
                  .eq('id', insertedData.id);

                 if (updateError) {
                    console.error('Error updating entry with tags in DB:', updateError);
                 }
                 // Re-enable this call to update the UI after tagging completes:
                 // Instead of just passing payload, fetch the full updated entry
                 const { data: updatedEntryData, error: fetchError } = await supabase
                   .from('entries')
                   .select('*')
                   .eq('id', insertedData.id)
                   .single();

                 if (fetchError) {
                   console.error('Error fetching updated entry after tagging:', fetchError);
                 } else if (updatedEntryData) {
                   // Call updateEntryTags with the full, updated entry
                   get().updateEntryTags(insertedData.id, updatedEntryData as Entry);
                 }
              }
            } catch (taggingError) {
              console.error("Error during background tagging process:", taggingError);
            }
          })();

        } catch (error: any) {
          console.error("Failed to add entry:", error);
          set({ errorState: `Failed to add entry: ${error.message}` });
        } finally {
           set({ isProcessingEntry: false }); // Reset processing indicator immediately
        }
      },

      // Action specifically for updating tags in the state after background process
      // Modified to accept full Entry or Partial<Entry>
       updateEntryTags: (entryId, entryUpdate: Partial<Entry> | Entry) => {
           set(state => {
              let entryUpdated = false;
              const newLoadedEntries = state.loadedEntries.map(entry => {
                 if (entry.id === entryId) {
                    entryUpdated = true;
                    // Merge partial update or replace with full entry
                    return { ...entry, ...entryUpdate }; 
                 }
                 return entry;
              });

              if (!entryUpdated) return {}; // Entry not found in loaded list

              const newHighlightedTagColors = calculateHighlightedTagColors(newLoadedEntries);
              const newDisplayEntries = filterLoadedEntries(newLoadedEntries, state); // Re-filter

              return {
                  loadedEntries: newLoadedEntries,
                  displayEntries: newDisplayEntries,
                  highlightedTagColors: newHighlightedTagColors,
              };
           });
        },

      updateEntry: async (entryId, content) => {
        set({ isProcessingEntry: true, errorState: null });
        try {
          // 1. Update via service
          const { data: updatedData, error: updateError } = await updateEntryContentService(entryId, content);
          if (updateError) throw updateError;
          if (!updatedData) throw new Error("Service returned no data on update.");

          // 2. Refresh list from start
          // Don't await this
          get().loadInitialEntries();

          // TODO: Add tag re-generation logic here if needed in the future

        } catch (error: any) {
          console.error("Failed to update entry:", error);
          set({ errorState: `Failed to update entry: ${error.message}` });
        } finally {
           set({ isProcessingEntry: false }); // Reset immediately
        }
      },

      deleteEntry: async (entryId) => {
        set({ isProcessingEntry: true, errorState: null });
        // No optimistic removal in this simple flow

        try {
           const { error } = await deleteEntryService(entryId);
           if (error) throw error;

           // Refresh list from start on success
           // Don't await this
           get().loadInitialEntries();

        } catch (error: any) {
           console.error("Failed to delete entry:", error);
           set({ errorState: `Failed to delete entry: ${error.message}` });
        } finally {
            set({ isProcessingEntry: false }); // Reset immediately
        }
      },

      // Dialog actions remain largely the same
      openEditorDialog: (entryToEdit = null) => {
        set({
          isEditorOpen: true,
          editingEntry: entryToEdit,
          errorState: null
        });
      },

      closeEditorDialog: () => {
        set({
          isEditorOpen: false,
          editingEntry: null
        });
      },

    }),
    { name: 'JournalStore' } // Name for Redux DevTools
  )
); 
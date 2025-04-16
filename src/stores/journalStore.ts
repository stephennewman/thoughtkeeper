import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Entry, ActionItem } from '@/types';
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

// Define EditorState structure (used for editor content)
interface EditorState {
  html: string;
  text?: string; // Optional text representation
}

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
  editingEntry: Entry | null; // Stores the *original* entry being edited (or null for new)
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
  addEntry: (content: string, date: string, entryType?: 'text' | 'voice') => Promise<void>;
  updateEntryTags: (entryId: string, entryUpdate: Partial<Entry> | Entry) => void;
  updateEntry: (entryId: string, content: string) => Promise<void>; // Content arg might change to EditorState
  deleteEntry: (entryId: string) => Promise<void>;
  openEditorDialog: (entryToEdit?: Entry | null) => void;
  closeEditorDialog: () => void;
  addEntryWithTranscription: (transcription: string) => Promise<void>;
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

// --- Define Stronger Color Palettes with Dark Mode --- 
const metaTagColors = [
  { base: 'bg-purple-600 dark:bg-purple-500 text-white', hover: 'hover:bg-purple-700 dark:hover:bg-purple-600' },
  { base: 'bg-pink-600 dark:bg-pink-500 text-white', hover: 'hover:bg-pink-700 dark:hover:bg-pink-600' },
  { base: 'bg-red-600 dark:bg-red-500 text-white', hover: 'hover:bg-red-700 dark:hover:bg-red-600' },
  { base: 'bg-orange-600 dark:bg-orange-500 text-white', hover: 'hover:bg-orange-700 dark:hover:bg-orange-600' },
  { base: 'bg-fuchsia-600 dark:bg-fuchsia-500 text-white', hover: 'hover:bg-fuchsia-700 dark:hover:bg-fuchsia-600' },
];
const intentTagColors = [
  { base: 'bg-green-600 dark:bg-green-500 text-white', hover: 'hover:bg-green-700 dark:hover:bg-green-600' },
  { base: 'bg-teal-600 dark:bg-teal-500 text-white', hover: 'hover:bg-teal-700 dark:hover:bg-teal-600' },
  { base: 'bg-cyan-600 dark:bg-cyan-500 text-white', hover: 'hover:bg-cyan-700 dark:hover:bg-cyan-600' },
  { base: 'bg-lime-600 dark:bg-lime-500 text-white', hover: 'hover:bg-lime-700 dark:hover:bg-lime-600' }, 
  { base: 'bg-emerald-600 dark:bg-emerald-500 text-white', hover: 'hover:bg-emerald-700 dark:hover:bg-emerald-600' },
];
const contentTagColors = [
  { base: 'bg-blue-600 dark:bg-blue-500 text-white', hover: 'hover:bg-blue-700 dark:hover:bg-blue-600' },
  { base: 'bg-indigo-600 dark:bg-indigo-500 text-white', hover: 'hover:bg-indigo-700 dark:hover:bg-indigo-600' },
  { base: 'bg-sky-600 dark:bg-sky-500 text-white', hover: 'hover:bg-sky-700 dark:hover:bg-sky-600' },
  { base: 'bg-violet-600 dark:bg-violet-500 text-white', hover: 'hover:bg-violet-700 dark:hover:bg-violet-600' },
  { base: 'bg-yellow-500 dark:bg-yellow-400 text-gray-900', hover: 'hover:bg-yellow-600 dark:hover:bg-yellow-500' }, // Adjusted yellow slightly, kept dark text
];
// --- End Color Palettes ---

// --- Helper function to calculate tag colors (Simplified: No frequency threshold) ---
const calculateHighlightedTagColors = (entries: Entry[]): { [lowerCaseTag: string]: { base: string; hover: string } } => {
    const colors: { [lowerCaseTag: string]: { base: string; hover: string } } = {};
    let metaColorIndex = 0;
    let intentColorIndex = 0;
    let contentColorIndex = 0;
    const assignedTags: Set<string> = new Set(); // Track assigned tags (lowercase)

    entries.forEach(entry => {
      // Meta Tag Processing
      if (entry.meta_tag) {
        const lowerTag = entry.meta_tag.toLowerCase();
        if (!assignedTags.has(lowerTag)) { // Assign color only once
           colors[lowerTag] = metaTagColors[metaColorIndex % metaTagColors.length];
           assignedTags.add(lowerTag);
           metaColorIndex++;
        }
      }
      // Intent Tag Processing
      if (entry.intent_tag) {
        const lowerTag = entry.intent_tag.toLowerCase();
         if (!assignedTags.has(lowerTag)) { // Assign color only once
           colors[lowerTag] = intentTagColors[intentColorIndex % intentTagColors.length];
           assignedTags.add(lowerTag);
           intentColorIndex++;
        }
      }
      // Content Tags Processing
      entry.tags?.forEach(tag => {
        const lowerTag = tag.toLowerCase();
         if (!assignedTags.has(lowerTag)) { // Assign color only once
           colors[lowerTag] = contentTagColors[contentColorIndex % contentTagColors.length];
           assignedTags.add(lowerTag);
           contentColorIndex++;
        }
      });
    });
    return colors;
};
// --- End helper function ---

// --- Client-side Filtering Logic ---
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
        console.log("loadInitialEntries triggered");
        // Get current filters *before* setting loading state
        const { searchQuery, activeMetaTag, activeIntentTag, activeContentTags } = get();

        set({
          isLoadingInitial: true,
          isLoadingMore: false, 
          errorState: null,
          currentPage: 0, // Reset page number
          loadedEntries: [], // Clear existing entries
          displayEntries: [], // Clear display entries
          hasMoreEntries: true, 
        });
        try {
          // Pass current filters to the service
          const { data, error } = await fetchEntriesPaginatedService(
            0, // offset for first page
            PAGE_SIZE,
            searchQuery,
            activeMetaTag,
            activeIntentTag,
            activeContentTags
          );
          if (error) throw error;

          const fetchedEntries = data || [];
          console.log(`Initial fetch successful, received ${fetchedEntries.length} entries.`);
          const newHighlightedTagColors = calculateHighlightedTagColors(fetchedEntries);
          // NO MORE CLIENT-SIDE FILTERING HERE - displayEntries == loadedEntries initially
          // const newDisplayEntries = filterLoadedEntries(fetchedEntries, get());

          set({
            loadedEntries: fetchedEntries,
            displayEntries: fetchedEntries, // Display exactly what was fetched
            highlightedTagColors: newHighlightedTagColors,
            currentPage: 1, // First page loaded
            hasMoreEntries: fetchedEntries.length === PAGE_SIZE,
          });
        } catch (error: any) {
          console.error("Failed to load initial entries:", error);
          set({ errorState: `Failed to load entries: ${error.message}`, hasMoreEntries: false });
        } finally {
          console.log("loadInitialEntries finished");
          set({ isLoadingInitial: false });
        }
      },

      loadMoreEntries: async () => {
        const { 
            isLoadingInitial, 
            isLoadingMore, 
            hasMoreEntries, 
            currentPage, 
            loadedEntries, 
            // Get current filters for the next page load
            searchQuery, 
            activeMetaTag, 
            activeIntentTag, 
            activeContentTags 
        } = get();

        if (isLoadingInitial || isLoadingMore || !hasMoreEntries) {
          return;
        }
        console.log(`loadMoreEntries triggered for page ${currentPage + 1}`);

        set({ isLoadingMore: true, errorState: null });
        try {
          const offset = currentPage * PAGE_SIZE;
          // Pass current filters to the service for subsequent pages
          const { data, error } = await fetchEntriesPaginatedService(
            offset,
            PAGE_SIZE,
            searchQuery,
            activeMetaTag,
            activeIntentTag,
            activeContentTags
          );
          if (error) throw error;

          const fetchedEntries = data || [];
          console.log(`More entries fetch successful, received ${fetchedEntries.length} entries.`);
          
          // Prevent duplicates (optional, but good practice if server might re-send)
          const existingIds = new Set(loadedEntries.map(entry => entry.id));
          const uniqueFetchedEntries = fetchedEntries.filter(entry => !existingIds.has(entry.id));
          if (uniqueFetchedEntries.length < fetchedEntries.length) {
            console.warn("Duplicate entries detected and filtered during loadMore.");
          }

          const combinedEntries = [...loadedEntries, ...uniqueFetchedEntries]; 
          const newHighlightedTagColors = calculateHighlightedTagColors(combinedEntries);
          // NO MORE CLIENT-SIDE FILTERING HERE - displayEntries == loadedEntries
          // const newDisplayEntries = filterLoadedEntries(combinedEntries, get());

          set({
            loadedEntries: combinedEntries,
            displayEntries: combinedEntries, // Display exactly what was fetched/combined
            highlightedTagColors: newHighlightedTagColors,
            currentPage: currentPage + 1,
            hasMoreEntries: fetchedEntries.length === PAGE_SIZE, // Check original fetched length
          });
        } catch (error: any) {
          console.error("Failed to load more entries:", error);
          set({ errorState: `Failed to load more entries: ${error.message}` }); 
        } finally {
          console.log("loadMoreEntries finished");
          set({ isLoadingMore: false });
        }
      },

      setFilters: (filters) => {
        const currentFilters = {
          searchQuery: get().searchQuery,
          activeMetaTag: get().activeMetaTag,
          activeIntentTag: get().activeIntentTag,
          activeContentTags: get().activeContentTags,
        };
        
        const newFilters = { ...currentFilters, ...filters };
        // Use a reliable way to check for deep equality change, especially for Sets
        const hasChanged = 
            newFilters.searchQuery !== currentFilters.searchQuery ||
            newFilters.activeMetaTag !== currentFilters.activeMetaTag ||
            newFilters.activeIntentTag !== currentFilters.activeIntentTag ||
            (newFilters.activeContentTags.size !== currentFilters.activeContentTags.size || 
             !Array.from(newFilters.activeContentTags).every(tag => currentFilters.activeContentTags.has(tag)));

        if (hasChanged) {
             console.log('setFilters triggered with changes:', filters);
             // Apply the filtering *after* setting the new filter state
             set((state) => {
                const updatedFilters = { ...state, ...newFilters }; // Apply filter state updates
                const newDisplayEntries = filterLoadedEntries(state.loadedEntries, updatedFilters); // Filter using updated state
                return { ...updatedFilters, displayEntries: newDisplayEntries }; // Return combined state update
             });
        } else {
             console.log('setFilters called but no change detected.');
        }
      },

      addEntry: async (content: string, date: string, entryType: 'text' | 'voice' = 'text') => {
        set({ isProcessingEntry: true, errorState: null });
        try {
          // Pass the explicitly typed entryType to the service
          const { data: newEntry, error: serviceError } = await addEntryService(date, content, entryType);
          if (serviceError) throw serviceError;
          if (!newEntry) throw new Error("Service returned no data on add.");

          const updatedLoadedEntries = [newEntry, ...get().loadedEntries];
          const currentFilters = {
            searchQuery: get().searchQuery,
            activeMetaTag: get().activeMetaTag,
            activeIntentTag: get().activeIntentTag,
            activeContentTags: get().activeContentTags,
          };
          const newDisplayEntries = filterLoadedEntries(updatedLoadedEntries, currentFilters);
          const newHighlightedTagColors = calculateHighlightedTagColors(updatedLoadedEntries);

          set({
            loadedEntries: updatedLoadedEntries,
            displayEntries: newDisplayEntries,
            highlightedTagColors: newHighlightedTagColors,
            isProcessingEntry: false 
          });

          // Trigger background tagging
          if (newEntry.id && newEntry.content) {
            // Use Promise.allSettled to avoid crashing on single fetch failure
             Promise.allSettled([
                fetch('/api/classify-meta', { method: 'POST', body: JSON.stringify({ entryId: newEntry.id, content: newEntry.content }) }).then(res => res.ok ? res.json() : Promise.reject('Meta API failed')),
                fetch('/api/classify-intent', { method: 'POST', body: JSON.stringify({ entryId: newEntry.id, content: newEntry.content }) }).then(res => res.ok ? res.json() : Promise.reject('Intent API failed')),
                fetch('/api/tags', { method: 'POST', body: JSON.stringify({ entryId: newEntry.id, content: newEntry.content }) }).then(res => res.ok ? res.json() : Promise.reject('Tags API failed'))
             ]).then(results => {
                console.log('Background tagging settled:', results.map(r => r.status));
                // Note: Updates from tagging arrive via Supabase Realtime / updateEntryTags
             }).catch(err => {
                // Catch potential errors in Promise.allSettled itself (unlikely)
                 console.error('Error initiating background tagging:', err);
             });
          }

        } catch (error: any) {
          console.error("Failed to add entry:", error);
          set({ errorState: `Failed to add entry: ${error.message}`, isProcessingEntry: false });
          throw error;
        }
      },

      updateEntryTags: (entryId, entryUpdate) => {
        const currentEntries = get().loadedEntries;
        let entryFound = false;
        const updatedEntries = currentEntries.map(entry => {
          if (entry.id === entryId) {
            entryFound = true;
            return { ...entry, ...entryUpdate };
          }
          return entry;
        });

        if (entryFound) {
            const currentFilters = {
              searchQuery: get().searchQuery,
              activeMetaTag: get().activeMetaTag,
              activeIntentTag: get().activeIntentTag,
              activeContentTags: get().activeContentTags,
            };
            const newDisplayEntries = filterLoadedEntries(updatedEntries, currentFilters);
            const newHighlightedTagColors = calculateHighlightedTagColors(updatedEntries);
            set({ 
                loadedEntries: updatedEntries, 
                displayEntries: newDisplayEntries, // Use refiltered display entries
                highlightedTagColors: newHighlightedTagColors // Recalculate colors
            });
        } else {
            console.warn(`updateEntryTags called for unknown entryId: ${entryId}`);
            // *** ADDED: Skip color recalculation if entry not found ***
            // No state update needed if entry wasn't found
        }
      },

      updateEntry: async (entryId: string, content: string) => {
        set({ isProcessingEntry: true, errorState: null });
        try {
           // Destructure the response from the service
          const { data: updatedEntry, error: serviceError } = await updateEntryContentService(entryId, content);
          
          // Check for service error first
          if (serviceError) throw serviceError;
          if (!updatedEntry) throw new Error("Service returned no data on update."); // Should not happen if error is null
          
          // Update in loaded and display arrays
          const updateFn = (entry: Entry): Entry => (entry.id === entryId ? updatedEntry : entry);
          const updatedLoaded = get().loadedEntries.map(updateFn);
          const updatedDisplay = get().displayEntries.map(updateFn);
          const newHighlightedTagColors = calculateHighlightedTagColors(updatedLoaded);

          set({
            loadedEntries: updatedLoaded,
            displayEntries: updatedDisplay,
            highlightedTagColors: newHighlightedTagColors,
            isProcessingEntry: false,
          });

        } catch (error: any) {
          console.error("Failed to update entry:", error);
          set({ errorState: `Failed to update entry: ${error.message}`, isProcessingEntry: false });
          throw error; // Re-throw to be caught in UI if needed
        }
      },

      deleteEntry: async (entryId: string) => {
        set({ isProcessingEntry: true, errorState: null });
        const originalLoadedEntries = get().loadedEntries;
        const originalDisplayEntries = get().displayEntries; // Store original display entries
        const originalHighlightedTagColors = get().highlightedTagColors; // Store original colors

        // Optimistically remove from UI
        const updatedLoaded = originalLoadedEntries.filter(e => e.id !== entryId);
        const currentFilters = {
          searchQuery: get().searchQuery,
          activeMetaTag: get().activeMetaTag,
          activeIntentTag: get().activeIntentTag,
          activeContentTags: get().activeContentTags,
        };
        const newDisplayEntries = filterLoadedEntries(updatedLoaded, currentFilters);
        const newHighlightedTagColors = calculateHighlightedTagColors(updatedLoaded);
        set({ 
            loadedEntries: updatedLoaded, 
            displayEntries: newDisplayEntries, 
            highlightedTagColors: newHighlightedTagColors 
        });

        try {
          await deleteEntryService(entryId);
          set({ isProcessingEntry: false }); // Only processing state changes on success
        } catch (error: any) {
          console.error("Failed to delete entry:", error);
          // Revert optimistic removal on failure
          set({ 
              isProcessingEntry: false, 
              errorState: `Failed to delete entry: ${error.message}`,
              loadedEntries: originalLoadedEntries, // Revert loaded entries
              displayEntries: originalDisplayEntries, // Revert display entries
              highlightedTagColors: originalHighlightedTagColors // Revert colors
          });
        }
      },

      openEditorDialog: (entryToEdit = null) => {
        set({
          isEditorOpen: true,
          editingEntry: entryToEdit,
          errorState: null,
        });
      },

      closeEditorDialog: () => {
        set({
          isEditorOpen: false,
          editingEntry: null,
        });
      },

      addEntryWithTranscription: async (transcription: string) => {
          // Keep isProcessingEntry/errorState handling here as it's specific to the transcription flow initiation.
          set({ isProcessingEntry: true, errorState: null });
          const entryDate = format(new Date(), 'yyyy-MM-dd');

          try {
             // *** FIX: Call the store's addEntry action ***
             await get().addEntry(transcription, entryDate, 'voice');
             // The called addEntry action will handle setting isProcessingEntry back to false on success.
             
             // Note: The original background tagging logic is now handled within the called addEntry action.
             // Remove duplicate state updates and background tagging calls from here.

          } catch (error: any) {
             // Keep specific error handling for transcription failure
             console.error("Failed to add transcription entry:", error);
             set({ errorState: `Failed to add transcription: ${error.message}`, isProcessingEntry: false }); 
             // Do not re-throw here, as the UI handles errors via audioError state in page.tsx
          }
      },

    }),
    { name: 'journal-store' } // Optional name for devtools
  )
); 
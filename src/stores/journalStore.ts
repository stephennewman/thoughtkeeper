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
  addEntry: (content: string, date: string) => Promise<void>; // Content arg might change to EditorState
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
          
          // --- Prevent Duplicates --- 
          const existingIds = new Set(loadedEntries.map(entry => entry.id));
          const uniqueFetchedEntries = fetchedEntries.filter(entry => !existingIds.has(entry.id));
          // --- End Prevent Duplicates ---

          // const combinedEntries = [...loadedEntries, ...fetchedEntries]; // Original
          const combinedEntries = [...loadedEntries, ...uniqueFetchedEntries]; // Use unique entries
          const newHighlightedTagColors = calculateHighlightedTagColors(combinedEntries);
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

      setFilters: (filters) => {
        const currentState = get();
        const updatedFilters = {
          searchQuery: filters.searchQuery !== undefined ? filters.searchQuery : currentState.searchQuery,
          activeMetaTag: filters.activeMetaTag !== undefined ? filters.activeMetaTag : currentState.activeMetaTag,
          activeIntentTag: filters.activeIntentTag !== undefined ? filters.activeIntentTag : currentState.activeIntentTag,
          activeContentTags: filters.activeContentTags !== undefined ? filters.activeContentTags : currentState.activeContentTags,
        };
        const newDisplayEntries = filterLoadedEntries(currentState.loadedEntries, updatedFilters);
        set({ ...updatedFilters, displayEntries: newDisplayEntries });
      },

      addEntry: async (contentHtml: string, date: string) => {
        set({ isProcessingEntry: true, errorState: null });
        try {
          const { data: newEntry, error: serviceError } = await addEntryService(date, contentHtml);
          if (serviceError) throw serviceError;
          if (!newEntry) throw new Error("Service returned no data on add.");

          const updatedLoadedEntries = [newEntry, ...get().loadedEntries];
          const newHighlightedTagColors = calculateHighlightedTagColors(updatedLoadedEntries);
          const newDisplayEntries = filterLoadedEntries(updatedLoadedEntries, get());

          set({
            loadedEntries: updatedLoadedEntries,
            displayEntries: newDisplayEntries,
            highlightedTagColors: newHighlightedTagColors,
          });

          // Trigger background tagging for manually added entries too
          (async () => {
            try {
              const contentToTag = newEntry.content; // Use content from the newly created entry
              if (!contentToTag) return;

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
                  .eq('id', newEntry.id);

                 if (updateError) {
                    console.error('Error updating entry with tags in DB:', updateError);
                 } else {
                    // Fetch the full updated entry to update the store state
                    const { data: updatedEntryData, error: fetchError } = await supabase
                      .from('entries')
                      .select('*')
                      .eq('id', newEntry.id)
                      .single();

                    if (fetchError) {
                      console.error('Error fetching updated entry after tagging:', fetchError);
                    } else if (updatedEntryData) {
                      // Call updateEntryTags with the full, updated entry
                      get().updateEntryTags(newEntry.id, updatedEntryData as Entry);
                      console.log("Background tagging update applied to store for entry:", newEntry.id);
                    }
                 }
              }
            } catch (taggingError) {
              console.error("Error during background tagging process for manual entry:", taggingError);
            } finally {
                set({ isProcessingEntry: false }); // Set processing false *after* tagging attempt
            }
          })(); // End background tagging async IIFE

        } catch (error: any) {
          console.error("Failed to add entry:", error);
          set({ errorState: `Failed to add entry: ${error.message}`, isProcessingEntry: false });
          throw error;
        }
      },

      updateEntryTags: (entryId, entryUpdate) => {
        const updateFn = (entry: Entry): Entry => (entry.id === entryId ? { ...entry, ...entryUpdate } : entry);
        const updatedLoaded = get().loadedEntries.map(updateFn);
        const updatedDisplay = get().displayEntries.map(updateFn);
        const newHighlightedTagColors = calculateHighlightedTagColors(updatedLoaded);
        set({ loadedEntries: updatedLoaded, displayEntries: updatedDisplay, highlightedTagColors: newHighlightedTagColors });
      },

      updateEntry: async (entryId: string, contentHtml: string) => {
        set({ isProcessingEntry: true, errorState: null });
        try {
           // Destructure the response from the service
          const { data: updatedEntry, error: serviceError } = await updateEntryContentService(entryId, contentHtml);
          
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
        const originalEntries = get().loadedEntries;
        // Optimistically remove from UI
        const updatedLoaded = originalEntries.filter(e => e.id !== entryId);
        const updatedDisplay = filterLoadedEntries(updatedLoaded, get());
        const newHighlightedTagColors = calculateHighlightedTagColors(updatedLoaded);
        set({ 
            loadedEntries: updatedLoaded, 
            displayEntries: updatedDisplay, 
            highlightedTagColors: newHighlightedTagColors 
        });

        try {
          await deleteEntryService(entryId);
          set({ isProcessingEntry: false });
        } catch (error: any) {
          console.error("Failed to delete entry:", error);
          // Revert UI on error
          const revertedDisplay = filterLoadedEntries(originalEntries, get());
          const revertedColors = calculateHighlightedTagColors(originalEntries);
          set({
            loadedEntries: originalEntries,
            displayEntries: revertedDisplay,
            highlightedTagColors: revertedColors,
            errorState: `Failed to delete entry: ${error.message}`, 
            isProcessingEntry: false 
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
         set({ isProcessingEntry: true, errorState: null });
         const entryDate = format(new Date(), 'yyyy-MM-dd'); // Use today's date

         try {
            // 1. Add the basic entry via service using the transcription as content
            const { data: newEntry, error: serviceError } = await addEntryService(entryDate, transcription);
            if (serviceError) throw serviceError;
            if (!newEntry) throw new Error("Service returned no data on transcription add.");

            // 2. Optimistically add to state
            const updatedLoadedEntries = [newEntry, ...get().loadedEntries];
            const newHighlightedTagColors = calculateHighlightedTagColors(updatedLoadedEntries);
            const newDisplayEntries = filterLoadedEntries(updatedLoadedEntries, get());

            set({
               loadedEntries: updatedLoadedEntries,
               displayEntries: newDisplayEntries,
               highlightedTagColors: newHighlightedTagColors,
            });

            // 3. Trigger background tagging (similar to manual addEntry)
            (async () => {
              try {
                const contentToTag = newEntry.content; // Use content from the newly created entry
                if (!contentToTag) return;

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

                // ... (Handle API responses and build updatePayload) ...
                const metaResult = metaResponse.ok ? await metaResponse.json() : {};
                const intentResult = intentResponse.ok ? await intentResponse.json() : {};
                const tagsResult = tagsResponse.ok ? await tagsResponse.json() : {};

                const updatePayload: Partial<Entry> = {};
                if (metaResult.metaTag) { updatePayload.meta_tag = metaResult.metaTag; }
                if (intentResult.intentTag) { updatePayload.intent_tag = intentResult.intentTag; }
                if (tagsResult.tags) { updatePayload.tags = tagsResult.tags; }


                if (Object.keys(updatePayload).length > 0) {
                   const { error: updateError } = await supabase.from('entries').update(updatePayload).eq('id', newEntry.id);

                   if (updateError) {
                      console.error('Error updating voice entry with tags in DB:', updateError);
                   } else {
                      // Fetch the full updated entry to update the store state
                      const { data: updatedEntryData, error: fetchError } = await supabase.from('entries').select('*').eq('id', newEntry.id).single();

                      if (fetchError) {
                        console.error('Error fetching updated voice entry after tagging:', fetchError);
                      } else if (updatedEntryData) {
                        get().updateEntryTags(newEntry.id, updatedEntryData as Entry);
                        console.log("Background tagging update applied to store for voice entry:", newEntry.id);
                      }
                   }
                }
              } catch (taggingError) {
                console.error("Error during background tagging process for voice entry:", taggingError);
              } finally {
                  set({ isProcessingEntry: false }); // Set processing false *after* tagging attempt
              }
            })(); // End background tagging async IIFE


         } catch (error: any) {
            console.error("Failed to add transcription entry:", error);
            set({ errorState: `Failed to add entry: ${error.message}`, isProcessingEntry: false });
            // Do not re-throw here, as the UI handles errors via audioError state
         }
      },

    }),
    {
      name: 'journal-storage', // name of the item in the storage (must be unique)
    }
  )
); 
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

// --- Define Gradient Color Palettes ---
const metaTagColors = [
  // { base: '!bg-gradient-to-r !from-purple-500 !to-pink-500 text-white', hover: 'hover:brightness-110' },
  // { base: '!bg-gradient-to-br !from-red-500 !to-orange-500 text-white', hover: 'hover:brightness-110' },
  // { base: '!bg-gradient-to-l !from-fuchsia-600 !to-purple-600 text-white', hover: 'hover:brightness-110' },
  // { base: '!bg-gradient-to-r !from-rose-400 !to-red-500 text-white', hover: 'hover:brightness-110' },
  // { base: '!bg-gradient-to-b !from-pink-400 !to-purple-500 text-white', hover: 'hover:brightness-110' },
  { base: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300', hover: 'hover:bg-purple-200 dark:hover:bg-purple-800/70' },
  { base: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300', hover: 'hover:bg-pink-200 dark:hover:bg-pink-800/70' },
  { base: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', hover: 'hover:bg-red-200 dark:hover:bg-red-800/70' },
  { base: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300', hover: 'hover:bg-rose-200 dark:hover:bg-rose-800/70' },
  { base: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-300', hover: 'hover:bg-fuchsia-200 dark:hover:bg-fuchsia-800/70' },
];
const intentTagColors = [
  // { base: '!bg-gradient-to-r !from-green-500 !to-teal-500 text-white', hover: 'hover:brightness-110' },
  // { base: '!bg-gradient-to-br !from-lime-500 !to-emerald-600 text-white', hover: 'hover:brightness-110' },
  // { base: '!bg-gradient-to-l !from-cyan-500 !to-green-500 text-white', hover: 'hover:brightness-110' },
  // { base: '!bg-gradient-to-r !from-teal-400 !to-cyan-600 text-white', hover: 'hover:brightness-110' },
  // { base: '!bg-gradient-to-b !from-emerald-400 !to-lime-500 text-white', hover: 'hover:brightness-110' },
  { base: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', hover: 'hover:bg-green-200 dark:hover:bg-green-800/70' },
  { base: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-300', hover: 'hover:bg-lime-200 dark:hover:bg-lime-800/70' },
  { base: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300', hover: 'hover:bg-teal-200 dark:hover:bg-teal-800/70' },
  { base: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300', hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-800/70' },
  { base: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300', hover: 'hover:bg-cyan-200 dark:hover:bg-cyan-800/70' },
];
const contentTagColors = [
  // { base: '!bg-gradient-to-r !from-blue-500 !to-indigo-500 text-white', hover: 'hover:brightness-110' },
  // { base: '!bg-gradient-to-br !from-sky-500 !to-violet-600 text-white', hover: 'hover:brightness-110' },
  // { base: '!bg-gradient-to-l !from-indigo-500 !to-blue-600 text-white', hover: 'hover:brightness-110' },
  // // Adding a contrasting one
  // { base: '!bg-gradient-to-r !from-yellow-300 !via-orange-400 !to-red-500 text-white', hover: 'hover:brightness-110' },
  // { base: '!bg-gradient-to-b !from-violet-400 !to-sky-500 text-white', hover: 'hover:brightness-110' },
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
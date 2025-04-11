import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Entry, TagType } from '@/types';
import { 
  fetchAllEntriesService,
  fetchEntriesService,
  addEntryService,
  updateEntryContentService,
  deleteEntryService,
} from '@/lib/entryService';
import { format } from 'date-fns';
import debounce from 'lodash.debounce';
import { supabase } from '@/lib/supabaseClient';

// Define the state structure
interface JournalState {
  allEntries: Entry[];
  filteredEntries: Entry[];
  selectedDate: string;
  activeMetaTag: string | null;
  activeIntentTag: string | null;
  activeContentTags: Set<string>;
  searchQuery: string;
  loadingState: 'idle' | 'initial' | 'filtered' | 'adding' | 'tagging' | 'updating' | 'deleting';
  errorState: string | null;
  isEditorOpen: boolean;
  editingEntry: Entry | null;
  highlightedTagColors: { [lowerCaseTag: string]: { base: string; hover: string } };
}

// Define the actions
interface JournalActions {
  fetchInitialEntries: () => Promise<void>;
  setFiltersAndFetch: (filters: Partial<{
    searchQuery: string;
    activeMetaTag: string | null;
    activeIntentTag: string | null;
    activeContentTags: Set<string>;
  }>) => void;
  addEntry: (content: string) => Promise<void>;
  updateEntryTags: (entryId: string, tags: Partial<Entry>) => void;
  updateEntry: (entryId: string, content: string) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  openEditorDialog: (entryToEdit?: Entry | null) => void;
  closeEditorDialog: () => void;
  setSelectedDate: (date: string) => void;
  // TODO: Add other actions
}

// Define the initial state separately for resetting
const initialState: JournalState = {
  allEntries: [],
  filteredEntries: [],
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  activeMetaTag: null,
  activeIntentTag: null,
  activeContentTags: new Set(),
  searchQuery: '',
  loadingState: 'idle',
  errorState: null,
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

// Create the store with devtools middleware
export const useJournalStore = create<JournalState & JournalActions>()(
  devtools(
    (set, get) => {
      // --- Client-side Filtering Logic ---
      const applyFilters = (state: JournalState): Entry[] => {
        const { allEntries, selectedDate, searchQuery, activeMetaTag, activeIntentTag, activeContentTags } = state;
        const lowerSearchQuery = searchQuery.toLowerCase().trim();

        return allEntries.filter(entry => {
          // 1. Filter by selected date
          if (entry.date !== selectedDate) {
            return false;
          }

          // 2. Filter by active tags (AND logic)
          if (activeMetaTag && entry.meta_tag !== activeMetaTag) {
            return false;
          }
          if (activeIntentTag && entry.intent_tag !== activeIntentTag) {
            return false;
          }
          if (activeContentTags.size > 0) {
            // Match ANY active content tag
            if (!Array.from(activeContentTags).some(filterTag => entry.tags?.includes(filterTag))) {
                return false;
            }
          }
          
          // 3. Filter by search query (if any)
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

      // Debounced fetch for TAG filters (search is client-side)
      const debouncedFetch = debounce(async () => {
        const { activeMetaTag, activeIntentTag, activeContentTags } = get();
        set({ loadingState: 'filtered', errorState: null });
        try {
          const { data, error } = await fetchEntriesService(
            activeMetaTag,
            activeIntentTag,
            activeContentTags
          );
          if (error) throw error;
          // IMPORTANT: When backend fetches based on tags, update allEntries
          // and then immediately re-apply client-side filters
          // This seems wrong - backend fetch should only fetch filtered data?
          // Let's reconsider. fetchEntriesService should fetch ONLY based on tags.
          // The result should be placed in a temporary state or directly used?
          // Simpler: Fetch ALL initially, then filter purely client-side.
          // Let's modify fetchInitialEntries and remove debouncedFetch for now.
          
          // -- REVISED APPROACH: Fetch all, filter client side --
          // set({ filteredEntries: data || [], loadingState: 'idle' }); 
        } catch (error: any) {
          // ... error handling ...
        }
      }, 300); // 300ms debounce (KEEP DEBOUNCE? No, remove fetch on filter change)

      return {
        ...initialState,

        fetchInitialEntries: async () => {
          set({ loadingState: 'initial', errorState: null });
          try {
            // Fetch ALL entries
            const { data, error } = await fetchAllEntriesService();
            if (error) throw error;
            const fetchedEntries = data || [];
            const newHighlightedTagColors = calculateHighlightedTagColors(fetchedEntries);
            
            // Apply initial filters (current date, empty search/tags)
            const initialFiltered = applyFilters({ 
              ...initialState, // Use initial filters
              allEntries: fetchedEntries, 
              highlightedTagColors: newHighlightedTagColors 
            });
            
            set({
              allEntries: fetchedEntries,
              filteredEntries: initialFiltered, // Set filtered based on initial state
              highlightedTagColors: newHighlightedTagColors,
              loadingState: 'idle',
              errorState: null, 
            });
          } catch (error: any) {
            // ... error handling ...
          }
        },

        setFiltersAndFetch: (newFilters) => {
          // 1. Update the filter state
          set(state => ({ ...state, ...newFilters }));
          // 2. Re-apply client-side filters with the *new* state
          set(state => ({ filteredEntries: applyFilters(state) }));
          // 3. No backend fetch needed here
        },

        addEntry: async (content) => {
          const { selectedDate } = get();
          set({ loadingState: 'adding', errorState: null });

          try {
            // 1. Add the basic entry via service
            const { data: insertedData, error: insertError } = await addEntryService(selectedDate, content);
            if (insertError) throw insertError;
            if (!insertedData) throw new Error("Service returned no data on add.");

            // 2. Optimistic UI update
            const entryForUi: Entry = { ...insertedData, tags: [], meta_tag: null, intent_tag: null };
            set(state => {
              const newAllEntries = [entryForUi, ...state.allEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              const newHighlightedTagColors = calculateHighlightedTagColors(newAllEntries);
              // Get potentially updated state for filtering
              const tempState = { ...state, allEntries: newAllEntries, highlightedTagColors: newHighlightedTagColors }; 
              return {
                allEntries: newAllEntries,
                filteredEntries: applyFilters(tempState), // Re-apply filters
                highlightedTagColors: newHighlightedTagColors,
                loadingState: 'tagging'
              };
            });

            // 3. Trigger background tagging (no await needed for UI)
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
                if (metaResult.metaTag) { // Use metaTag (camelCase)
                    updatePayload.meta_tag = metaResult.metaTag; // Assign TO meta_tag (snake_case)
                }
                if (intentResult.intentTag) { // Use intentTag (camelCase)
                    updatePayload.intent_tag = intentResult.intentTag; // Assign TO intent_tag (snake_case)
                }
                if (tagsResult.tags) {
                    updatePayload.tags = tagsResult.tags;
                }

                if (Object.keys(updatePayload).length > 0) {
                    // Update the backend DB (using Supabase client directly for simplicity here,
                    // ideally could be another service call)
                   const { error: updateError } = await supabase
                    .from('entries')
                    .update(updatePayload)
                    .eq('id', insertedData.id);
                    
                   if (updateError) {
                      console.error('Error updating entry with tags in DB:', updateError);
                      // Optionally set an error state specific to tagging
                   } else {
                      // Update the state via a dedicated action
                      get().updateEntryTags(insertedData.id, updatePayload);
                   }
                }
              } catch (taggingError) {
                console.error("Error during background tagging process:", taggingError);
                // Optionally set an error state specific to tagging
              } finally {
                // Reset loading state regardless of tagging success/failure
                set(state => state.loadingState === 'tagging' ? { loadingState: 'idle' } : {});
              }
            })();

          } catch (error: any) {
            console.error("Failed to add entry:", error);
            set({ errorState: `Failed to add entry: ${error.message}`, loadingState: 'idle' });
          }
        },

        // Action specifically for updating tags in the state after background process
        updateEntryTags: (entryId, tags) => {
           set(state => {
              const newAllEntries = state.allEntries.map(entry => 
                 entry.id === entryId ? { ...entry, ...tags } : entry
              );
              const newHighlightedTagColors = calculateHighlightedTagColors(newAllEntries);
              const tempState = { ...state, allEntries: newAllEntries, highlightedTagColors: newHighlightedTagColors };
              return {
                  allEntries: newAllEntries,
                  filteredEntries: applyFilters(tempState), // Re-apply filters
                  highlightedTagColors: newHighlightedTagColors,
              };
           });
        },

        updateEntry: async (entryId, content) => {
          set({ loadingState: 'updating', errorState: null });
          try {
            // 1. Update via service
            const { data: updatedData, error: updateError } = await updateEntryContentService(entryId, content);
            if (updateError) throw updateError;
            if (!updatedData) throw new Error("Service returned no data on update.");

            // 2. Update state
            set(state => {
              const newAllEntries = state.allEntries.map(entry => 
                 entry.id === entryId ? updatedData : entry
              );
              // Need to recalculate colors if content changes? No, tags aren't changing here yet.
              const tempState = { ...state, allEntries: newAllEntries };
              return {
                allEntries: newAllEntries,
                filteredEntries: applyFilters(tempState), // Re-apply filters
                loadingState: 'idle',
              };
            });

            // TODO: Add tag re-generation logic here if needed in the future

          } catch (error: any) {
            console.error("Failed to update entry:", error);
            set({ errorState: `Failed to update entry: ${error.message}`, loadingState: 'idle' });
          }
        },

        deleteEntry: async (entryId) => {
          // Optimistic removal
          const originalAllEntries = get().allEntries;
          const originalFilteredEntries = get().filteredEntries;
          const newAllEntries = get().allEntries.filter(entry => entry.id !== entryId);
          const newHighlightedTagColors = calculateHighlightedTagColors(newAllEntries);
          const tempState = { ...get(), allEntries: newAllEntries, highlightedTagColors: newHighlightedTagColors }; // Use get() for current filters
          set({
             allEntries: newAllEntries,
             filteredEntries: applyFilters(tempState), // Re-apply filters
             highlightedTagColors: newHighlightedTagColors,
             loadingState: 'deleting',
             errorState: null,
          });

          try {
             const { error } = await deleteEntryService(entryId);
             if (error) throw error;
             // Success, reset loading state
             set({ loadingState: 'idle' });
          } catch (error: any) {
             console.error("Failed to delete entry:", error);
             // Revert state and re-filter
             const revertedState = { ...get(), allEntries: originalAllEntries, highlightedTagColors: calculateHighlightedTagColors(originalAllEntries) };
             set({
                errorState: `Failed to delete entry: ${error.message}`,
                loadingState: 'idle',
                allEntries: originalAllEntries,
                filteredEntries: applyFilters(revertedState), // Re-apply filters on revert
                highlightedTagColors: revertedState.highlightedTagColors,
             });
          }
        },

        openEditorDialog: (entryToEdit = null) => {
          set({ 
            isEditorOpen: true,
            editingEntry: entryToEdit, // Set to null for Add mode, or entry for Edit mode
            errorState: null // Clear any previous errors when opening dialog
          });
        },

        closeEditorDialog: () => {
          set({ 
            isEditorOpen: false, 
            editingEntry: null 
          });
        },

        setSelectedDate: (date) => {
          set({ selectedDate: date });
          // Re-apply filters when date changes
          set(state => ({ filteredEntries: applyFilters(state) }));
        },

        // TODO: Implement other actions (add, update, delete, dialog toggle)
      };
    },
    { name: 'JournalStore' } // Name for Redux DevTools
  )
); 
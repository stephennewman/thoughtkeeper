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
};

// Create the store with devtools middleware
export const useJournalStore = create<JournalState & JournalActions>()(
  devtools(
    (set, get) => {
      // Debounced fetch function specific to the store instance
      const debouncedFetch = debounce(async () => {
        const { searchQuery, activeMetaTag, activeIntentTag, activeContentTags } = get();
        set({ loadingState: 'filtered', errorState: null });
        try {
          const { data, error } = await fetchEntriesService(
            searchQuery,
            activeMetaTag,
            activeIntentTag,
            activeContentTags
          );
          if (error) throw error;
          set({ filteredEntries: data || [], loadingState: 'idle' });
        } catch (error: any) {
          console.error("Failed to fetch filtered entries:", error);
          set({
            errorState: `Failed to load filtered entries: ${error.message}`,
            loadingState: 'idle',
            filteredEntries: [], // Clear entries on filter error?
          });
        }
      }, 300); // 300ms debounce

      return {
        ...initialState, // Spread the initial state here

        // Actions
        fetchInitialEntries: async () => {
          set({ loadingState: 'initial', errorState: null });
          try {
            const { data, error } = await fetchAllEntriesService();
            if (error) throw error;

            const fetchedEntries = data || [];
            const currentDate = get().selectedDate;
            
            const initialDisplayEntries = fetchedEntries.filter(entry => entry.date === currentDate);
            
            set({
              allEntries: fetchedEntries,
              filteredEntries: initialDisplayEntries,
              loadingState: 'idle',
              errorState: null, 
            });
          } catch (error: any) {
            console.error("Failed to fetch initial entries:", error);
            set({
              errorState: `Failed to load entries: ${error.message}`,
              loadingState: 'idle',
              allEntries: [],
              filteredEntries: [],
            });
          }
        },

        setFiltersAndFetch: (newFilters) => {
          // Update the state immediately with the new filter values
          set(state => ({ ...state, ...newFilters }));
          // Trigger the debounced fetch
          debouncedFetch();
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
            set(state => ({
              allEntries: [entryForUi, ...state.allEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), // Keep sorted
              filteredEntries: entryForUi.date === state.selectedDate ? [entryForUi, ...state.filteredEntries] : state.filteredEntries, // Add to filtered if date matches
              loadingState: 'tagging' // Switch to tagging state
            }));

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
                if (metaResult.meta_tag) updatePayload.meta_tag = metaResult.meta_tag;
                if (intentResult.intent_tag) updatePayload.intent_tag = intentResult.intent_tag;
                if (tagsResult.tags) updatePayload.tags = tagsResult.tags; // Assume API returns lowercase tags

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
           set(state => ({
              allEntries: state.allEntries.map(entry => 
                 entry.id === entryId ? { ...entry, ...tags } : entry
              ),
              filteredEntries: state.filteredEntries.map(entry =>
                 entry.id === entryId ? { ...entry, ...tags } : entry
              ),
           }));
        },

        updateEntry: async (entryId, content) => {
          set({ loadingState: 'updating', errorState: null });
          try {
            // 1. Update via service
            const { data: updatedData, error: updateError } = await updateEntryContentService(entryId, content);
            if (updateError) throw updateError;
            if (!updatedData) throw new Error("Service returned no data on update.");

            // 2. Update state
            set(state => ({
              allEntries: state.allEntries.map(entry => 
                 entry.id === entryId ? updatedData : entry
              ),
              filteredEntries: state.filteredEntries.map(entry =>
                 entry.id === entryId ? updatedData : entry
              ),
              loadingState: 'idle',
            }));

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
          set(state => ({
             allEntries: state.allEntries.filter(entry => entry.id !== entryId),
             filteredEntries: state.filteredEntries.filter(entry => entry.id !== entryId),
             loadingState: 'deleting',
             errorState: null,
          }));

          try {
             const { error } = await deleteEntryService(entryId);
             if (error) throw error;
             // Success, reset loading state
             set({ loadingState: 'idle' });
          } catch (error: any) {
             console.error("Failed to delete entry:", error);
             // Revert optimistic update on failure
             set({
                errorState: `Failed to delete entry: ${error.message}`,
                loadingState: 'idle',
                allEntries: originalAllEntries,
                filteredEntries: originalFilteredEntries,
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
          // Optionally trigger fetch immediately, or rely on component logic
          // get().setFiltersAndFetch({}); // Re-trigger fetch if needed
        },

        // TODO: Implement other actions (add, update, delete, dialog toggle)
      };
    },
    { name: 'JournalStore' } // Name for Redux DevTools
  )
); 
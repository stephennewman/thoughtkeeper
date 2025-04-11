import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Entry } from '@/types';

// Define the state structure
interface JournalState {
  allEntries: Entry[];
  filteredEntries: Entry[];
  activeMetaTag: string | null;
  activeIntentTag: string | null;
  activeContentTags: Set<string>;
  searchQuery: string;
  loadingState: 'idle' | 'initial' | 'filtered' | 'adding' | 'tagging' | 'updating' | 'deleting';
  errorState: string | null;
  isEditorOpen: boolean;
  editingEntry: Entry | null;
}

// Define the actions (initially empty, to be filled in Milestone 2)
interface JournalActions {
  // TODO: Define actions like fetchInitialEntries, setFilters, addEntry, etc.
}

// Create the store with devtools middleware
export const useJournalStore = create<JournalState & JournalActions>()(
  devtools(
    (set, get) => ({
      // Initial State
      allEntries: [],
      filteredEntries: [],
      activeMetaTag: null,
      activeIntentTag: null,
      activeContentTags: new Set(),
      searchQuery: '',
      loadingState: 'idle',
      errorState: null,
      isEditorOpen: false,
      editingEntry: null,

      // Actions (implementations will go here)
      // Example structure:
      // setFilters: (filters) => set({ ... }),
      // fetchInitialEntries: async () => { ... },

    }),
    { name: 'JournalStore' } // Name for Redux DevTools
  )
); 
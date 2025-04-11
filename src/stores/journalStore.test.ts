import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useJournalStore } from './journalStore'; 
import * as entryService from '@/lib/entryService';
import { supabase } from '@/lib/supabaseClient'; // Import supabase for mocking tag update
import type { Entry } from '@/types';
import type { PostgrestSingleResponse } from '@supabase/supabase-js'; // Import Supabase type
// import { format } from 'date-fns'; // No longer needed here due to mocking

// Mock dependencies
vi.mock('@/lib/entryService');
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      error: null,
      data: null, // Or mock data if needed, null is fine here
      count: null,
      status: 200,
      statusText: 'OK'
    } as PostgrestSingleResponse<null>),
  },
}));

// Mock date-fns, defining constants *inside* the factory
vi.mock('date-fns', async (importOriginal) => {
  // Define constants within the factory scope
  const MOCK_TODAY_DATE_INTERNAL = '2024-07-18'; 
  
  const actual = await importOriginal<typeof import('date-fns')>();
  return {
    ...actual,
    format: (date: Date | number | string, formatString: string) => {
       if (formatString === 'yyyy-MM-dd') {
           return MOCK_TODAY_DATE_INTERNAL; // Use internally defined constant
       }
       return actual.format(date, formatString);
    }
  }
});

// Define constants also at module scope for use within tests
const MOCK_TODAY_DATE = '2024-07-18';
const MOCK_YESTERDAY_DATE = '2024-07-17';

// Helper to reset store to its initial state before each test
const resetStore = () => {
  // Use Zustand's built-in way to get initial state
  useJournalStore.setState(useJournalStore.getInitialState(), true);
};

describe('journalStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    // Use fake timers for debounce testing
    vi.useFakeTimers(); 
  });

  afterEach(() => {
    // Restore real timers after each test
    vi.useRealTimers();
  });

  describe('fetchInitialEntries', () => {
    it('should fetch entries, filter for today, and update state on success', async () => {
      // Arrange: Mock data
      const mockEntries: Entry[] = [
        { id: '1', date: MOCK_TODAY_DATE, content: 'Today entry 1', created_at: '2024-07-18T10:00:00Z' },
        { id: '2', date: MOCK_YESTERDAY_DATE, content: 'Yesterday entry', created_at: '2024-07-17T11:00:00Z' },
        { id: '3', date: MOCK_TODAY_DATE, content: 'Today entry 2', created_at: '2024-07-18T09:00:00Z' },
      ];
      const fetchAllEntriesServiceMock = vi.spyOn(entryService, 'fetchAllEntriesService').mockResolvedValue({ data: mockEntries, error: null });

      // Act: Call the action
      await useJournalStore.getState().fetchInitialEntries();

      // Assert: Check state updates
      const state = useJournalStore.getState();
      expect(fetchAllEntriesServiceMock).toHaveBeenCalledTimes(1);
      expect(state.loadingState).toBe('idle');
      expect(state.errorState).toBeNull();
      expect(state.allEntries).toEqual(mockEntries); // Should contain all entries
      expect(state.filteredEntries).toEqual([ // Should contain only today's entries
        mockEntries[0], 
        mockEntries[2],
      ]);
      expect(state.selectedDate).toBe(MOCK_TODAY_DATE); // Ensure selected date is correct
    });

    it('should set error state and clear entries on fetch failure', async () => {
      // Arrange: Mock service failure
      const mockError = new Error('Fetch failed!');
      const fetchAllEntriesServiceMock = vi.spyOn(entryService, 'fetchAllEntriesService').mockResolvedValue({ data: null, error: mockError });

      // Act: Call the action
      await useJournalStore.getState().fetchInitialEntries();

      // Assert: Check state updates
      const state = useJournalStore.getState();
      expect(fetchAllEntriesServiceMock).toHaveBeenCalledTimes(1);
      expect(state.loadingState).toBe('idle');
      expect(state.errorState).toBe(`Failed to load entries: ${mockError.message}`);
      expect(state.allEntries).toEqual([]);
      expect(state.filteredEntries).toEqual([]);
    });

     it('should correctly set loading state during fetch', async () => {
      // Arrange
      let resolveFetch: (value: { data: Entry[] | null; error: Error | null }) => void;
      const promise = new Promise<{ data: Entry[] | null; error: Error | null }>(resolve => {
        resolveFetch = resolve;
      });
      const fetchAllEntriesServiceMock = vi.spyOn(entryService, 'fetchAllEntriesService').mockReturnValue(promise);
      
      // Act: Start the action, but don't await completion yet
      const actionPromise = useJournalStore.getState().fetchInitialEntries();

      // Assert: Check loading state immediately after call
      expect(useJournalStore.getState().loadingState).toBe('initial');

      // Arrange: Resolve the promise
      resolveFetch!({ data: [], error: null }); 
      await actionPromise; // Wait for the action to complete

      // Assert: Check final loading state
      expect(useJournalStore.getState().loadingState).toBe('idle');
    });
  });

  describe('setFiltersAndFetch', () => {
    let fetchEntriesServiceMock: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Explicitly cast to any to avoid complex signature mismatch errors
        fetchEntriesServiceMock = vi.spyOn(entryService as any, 'fetchEntriesService')
            .mockResolvedValue({ data: [], error: null }); 
    });

    it('should update searchQuery state immediately and trigger debounced fetch', async () => {
        // Arrange
        const newQuery = 'test query';

        // Act
        useJournalStore.getState().setFiltersAndFetch({ searchQuery: newQuery });

        // Assert: State updated immediately
        expect(useJournalStore.getState().searchQuery).toBe(newQuery);
        expect(fetchEntriesServiceMock).not.toHaveBeenCalled(); // Fetch not called yet

        // Act: Advance timer past debounce threshold (300ms)
        vi.advanceTimersByTime(350);

        // Assert: Fetch called after debounce
        expect(fetchEntriesServiceMock).toHaveBeenCalledTimes(1);
        expect(fetchEntriesServiceMock).toHaveBeenCalledWith(newQuery, null, null, new Set());
    });

    it('should update activeMetaTag state immediately and trigger debounced fetch', async () => {
        // Arrange
        const newMetaTag = 'Work';

        // Act
        useJournalStore.getState().setFiltersAndFetch({ activeMetaTag: newMetaTag });

        // Assert: State updated immediately
        expect(useJournalStore.getState().activeMetaTag).toBe(newMetaTag);
        expect(fetchEntriesServiceMock).not.toHaveBeenCalled();

        // Act: Advance timer
        vi.advanceTimersByTime(350);

        // Assert: Fetch called after debounce
        expect(fetchEntriesServiceMock).toHaveBeenCalledTimes(1);
        expect(fetchEntriesServiceMock).toHaveBeenCalledWith('', newMetaTag, null, new Set());
    });
    
    it('should update activeContentTags state immediately and trigger debounced fetch', async () => {
        // Arrange
        const newContentTags = new Set(['react', 'typescript']);

        // Act
        useJournalStore.getState().setFiltersAndFetch({ activeContentTags: newContentTags });

        // Assert: State updated immediately
        expect(useJournalStore.getState().activeContentTags).toEqual(newContentTags);
        expect(fetchEntriesServiceMock).not.toHaveBeenCalled();

        // Act: Advance timer
        vi.advanceTimersByTime(350);

        // Assert: Fetch called after debounce
        expect(fetchEntriesServiceMock).toHaveBeenCalledTimes(1);
        expect(fetchEntriesServiceMock).toHaveBeenCalledWith('', null, null, newContentTags);
    });

    it('should only call fetch once if filters change rapidly within debounce time', async () => {
        // Act
        useJournalStore.getState().setFiltersAndFetch({ searchQuery: 'first' });
        expect(useJournalStore.getState().searchQuery).toBe('first');
        vi.advanceTimersByTime(100); // Advance less than debounce time
        useJournalStore.getState().setFiltersAndFetch({ searchQuery: 'second' });
        expect(useJournalStore.getState().searchQuery).toBe('second');
        vi.advanceTimersByTime(100);
        useJournalStore.getState().setFiltersAndFetch({ activeMetaTag: 'Project' });
        expect(useJournalStore.getState().activeMetaTag).toBe('Project');

        // Assert: Fetch still not called
        expect(fetchEntriesServiceMock).not.toHaveBeenCalled();

        // Act: Advance timer past original debounce threshold
        vi.advanceTimersByTime(350);

        // Assert: Fetch called only once with the *latest* state
        expect(fetchEntriesServiceMock).toHaveBeenCalledTimes(1);
        expect(fetchEntriesServiceMock).toHaveBeenCalledWith('second', 'Project', null, new Set());
    });

    it('should update filteredEntries and loadingState on successful fetch', async () => {
        // Arrange
        const mockFilteredEntries: Entry[] = [
          { id: 'f1', date: MOCK_TODAY_DATE, content: 'Filtered 1', created_at: '2024-07-18T11:00:00Z' },
        ];
        fetchEntriesServiceMock.mockResolvedValue({ data: mockFilteredEntries, error: null });

        // Act: Set filter and advance timer
        useJournalStore.getState().setFiltersAndFetch({ activeIntentTag: 'Log' });
        vi.advanceTimersByTime(350);
        
        // Need to wait for the async fetch promise within debounce to resolve
        await vi.runAllTicks(); // Process microtasks

        // Assert: State updated after fetch
        const state = useJournalStore.getState();
        expect(state.loadingState).toBe('idle');
        expect(state.errorState).toBeNull();
        expect(state.filteredEntries).toEqual(mockFilteredEntries);
    });

    it('should set error state on fetch failure', async () => {
        // Arrange
        const mockError = new Error('Filter fetch failed!');
        fetchEntriesServiceMock.mockResolvedValue({ data: null, error: mockError });

        // Act: Set filter and advance timer
        useJournalStore.getState().setFiltersAndFetch({ searchQuery: 'error test' });
        vi.advanceTimersByTime(350);
        await vi.runAllTicks(); // Process microtasks

        // Assert: State updated after fetch failure
        const state = useJournalStore.getState();
        expect(state.loadingState).toBe('idle');
        expect(state.errorState).toBe(`Failed to load filtered entries: ${mockError.message}`);
        expect(state.filteredEntries).toEqual([]); // Entries cleared on error
    });

    it('should set loadingState correctly during fetch', async () => {
      // Arrange
      let resolveFetch: (value: { data: Entry[] | null; error: Error | null }) => void;
      const promise = new Promise<{ data: Entry[] | null; error: Error | null }>(resolve => {
        resolveFetch = resolve;
      });
      fetchEntriesServiceMock.mockReturnValue(promise);
      
      // Act: Set filter and advance timer
      useJournalStore.getState().setFiltersAndFetch({ searchQuery: 'loading test' });
      vi.advanceTimersByTime(350);

      // Assert: Check loading state after debounce starts fetch
      expect(useJournalStore.getState().loadingState).toBe('filtered');

      // Arrange: Resolve the promise
      resolveFetch!({ data: [], error: null }); 
      await vi.runAllTicks(); // Process microtasks

      // Assert: Check final loading state
      expect(useJournalStore.getState().loadingState).toBe('idle');
    });

  });

  describe('addEntry', () => {
    let addEntryServiceMock: ReturnType<typeof vi.spyOn>;
    const newContent = 'New entry content';
    const mockNewEntry: Entry = {
      id: 'new-id', date: MOCK_TODAY_DATE, content: newContent, created_at: new Date().toISOString(),
      tags: [], meta_tag: null, intent_tag: null // Initial state before tags
    };

    beforeEach(() => {
      addEntryServiceMock = vi.spyOn(entryService as any, 'addEntryService').mockResolvedValue({ data: mockNewEntry, error: null });
      // Mock global fetch for tagging APIs
      global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) as any;
      // Reset supabase mock calls
      vi.clearAllMocks(); 
    });

    it('should call addEntryService, optimistically update state, and trigger tagging', async () => {
      // Act
      await useJournalStore.getState().addEntry(newContent);

      // Assert Service Call
      expect(addEntryServiceMock).toHaveBeenCalledTimes(1);
      expect(addEntryServiceMock).toHaveBeenCalledWith(MOCK_TODAY_DATE, newContent);

      // Assert Optimistic State Update
      const state = useJournalStore.getState();
      expect(state.loadingState).toBe('tagging'); // Should be in tagging state
      expect(state.allEntries[0]).toMatchObject({ id: 'new-id', content: newContent });
      expect(state.filteredEntries[0]).toMatchObject({ id: 'new-id', content: newContent });

      // Assert Background Tagging Triggered (fetch calls)
      expect(global.fetch).toHaveBeenCalledTimes(3); 
      expect(global.fetch).toHaveBeenCalledWith('/api/classify-meta', expect.any(Object));
      expect(global.fetch).toHaveBeenCalledWith('/api/classify-intent', expect.any(Object));
      expect(global.fetch).toHaveBeenCalledWith('/api/tags', expect.any(Object));
    });

    it('should update entry tags in state after successful background tagging', async () => {
      // Arrange: Mock successful tag API responses and Supabase update
      const mockTags = { meta_tag: 'TestMeta', intent_tag: 'TestIntent', tags: ['tag1', 'tag2'] };
      global.fetch = vi.fn((url) => {
        if (url === '/api/classify-meta') return Promise.resolve({ ok: true, json: () => Promise.resolve({ meta_tag: mockTags.meta_tag }) });
        if (url === '/api/classify-intent') return Promise.resolve({ ok: true, json: () => Promise.resolve({ intent_tag: mockTags.intent_tag }) });
        if (url === '/api/tags') return Promise.resolve({ ok: true, json: () => Promise.resolve({ tags: mockTags.tags }) });
        return Promise.resolve({ ok: false });
      }) as any;
      const supabaseUpdateMock = vi.spyOn(supabase.from('entries'), 'update').mockReturnThis();
      const supabaseEqMock = vi.spyOn(supabase.from('entries').update({}), 'eq').mockResolvedValue({ error: null });
      
      // Act: Add entry and wait for all async operations (including tagging)
      await useJournalStore.getState().addEntry(newContent);
      // Wait for microtasks (Promise resolutions in tagging) to complete
      await vi.runAllTicks(); 

      // Assert: State updated with tags
      const state = useJournalStore.getState();
      expect(state.loadingState).toBe('idle'); // Should be idle after tagging finishes
      expect(supabaseUpdateMock).toHaveBeenCalledWith(mockTags); // Check payload sent to Supabase
      expect(supabaseEqMock).toHaveBeenCalledWith('id', mockNewEntry.id);
      expect(state.allEntries[0]).toMatchObject(mockTags);
      expect(state.filteredEntries[0]).toMatchObject(mockTags);
    });

    it('should set error state if addEntryService fails', async () => {
      // Arrange
      const mockError = new Error('Add failed!');
      addEntryServiceMock.mockResolvedValue({ data: null, error: mockError });

      // Act
      await useJournalStore.getState().addEntry(newContent);

      // Assert
      const state = useJournalStore.getState();
      expect(state.loadingState).toBe('idle');
      expect(state.errorState).toBe(`Failed to add entry: ${mockError.message}`);
      expect(state.allEntries).toEqual([]); // Assuming store starts empty
      expect(global.fetch).not.toHaveBeenCalled(); // Tagging shouldn't start
    });

    it('should reset loading state even if background tagging fails', async () => {
       // Arrange: Mock failing fetch
       global.fetch = vi.fn(() => Promise.reject('Tagging API error')) as any;

       // Act
       await useJournalStore.getState().addEntry(newContent);
       await vi.runAllTicks();

       // Assert
       expect(useJournalStore.getState().loadingState).toBe('idle');
       // Optional: check console.error was called
    });
  });

  describe('updateEntry', () => {
    let updateEntryContentServiceMock: ReturnType<typeof vi.spyOn>;
    const entryId = 'existing-id';
    const initialEntry: Entry = { id: entryId, date: MOCK_TODAY_DATE, content: 'Initial', created_at: '...' };
    const updatedContent = 'Updated content';
    const updatedEntry: Entry = { ...initialEntry, content: updatedContent };

    beforeEach(() => {
      // Set initial state with an entry using the reset helper + merge
      resetStore(); // Start with initial state
      useJournalStore.setState({ allEntries: [initialEntry], filteredEntries: [initialEntry] }); // Merge initial entry
      updateEntryContentServiceMock = vi.spyOn(entryService as any, 'updateEntryContentService').mockResolvedValue({ data: updatedEntry, error: null });
    });

    it('should call update service and update state on success', async () => {
      // Act
      await useJournalStore.getState().updateEntry(entryId, updatedContent);

      // Assert
      expect(updateEntryContentServiceMock).toHaveBeenCalledTimes(1);
      expect(updateEntryContentServiceMock).toHaveBeenCalledWith(entryId, updatedContent);
      const state = useJournalStore.getState();
      expect(state.loadingState).toBe('idle');
      expect(state.errorState).toBeNull();
      expect(state.allEntries[0].content).toBe(updatedContent);
      expect(state.filteredEntries[0].content).toBe(updatedContent);
    });

    it('should set error state if update service fails', async () => {
      // Arrange
      const mockError = new Error('Update failed!');
      updateEntryContentServiceMock.mockResolvedValue({ data: null, error: mockError });

      // Act
      await useJournalStore.getState().updateEntry(entryId, updatedContent);

      // Assert
      const state = useJournalStore.getState();
      expect(state.loadingState).toBe('idle');
      expect(state.errorState).toBe(`Failed to update entry: ${mockError.message}`);
      expect(state.allEntries[0].content).toBe('Initial'); // State should not have changed
    });
  });

  describe('deleteEntry', () => {
    let deleteEntryServiceMock: ReturnType<typeof vi.spyOn>;
    const entryIdToDelete = 'id-to-delete';
    const initialEntry: Entry = { id: entryIdToDelete, date: MOCK_TODAY_DATE, content: 'Delete me', created_at: '...' };
    const otherEntry: Entry = { id: 'other-id', date: MOCK_TODAY_DATE, content: 'Keep me', created_at: '...' };

    beforeEach(() => {
      // Set initial state with entries using the reset helper + merge
      resetStore(); // Start with initial state
      useJournalStore.setState({ allEntries: [otherEntry, initialEntry], filteredEntries: [otherEntry, initialEntry] }); // Merge initial entries
      deleteEntryServiceMock = vi.spyOn(entryService as any, 'deleteEntryService')
        .mockResolvedValue({ error: null });
    });

    it('should optimistically remove entry and call delete service', async () => {
      // Act
      await useJournalStore.getState().deleteEntry(entryIdToDelete);

      // Assert
      expect(deleteEntryServiceMock).toHaveBeenCalledTimes(1);
      expect(deleteEntryServiceMock).toHaveBeenCalledWith(entryIdToDelete);
      const state = useJournalStore.getState();
      expect(state.loadingState).toBe('idle');
      expect(state.errorState).toBeNull();
      expect(state.allEntries).toEqual([otherEntry]);
      expect(state.filteredEntries).toEqual([otherEntry]);
    });

    it('should revert optimistic removal and set error state if service fails', async () => {
      // Arrange
      const mockError = new Error('Delete failed!');
      deleteEntryServiceMock.mockResolvedValue({ error: mockError });

      // Act
      await useJournalStore.getState().deleteEntry(entryIdToDelete);

      // Assert
      const state = useJournalStore.getState();
      expect(state.loadingState).toBe('idle');
      expect(state.errorState).toBe(`Failed to delete entry: ${mockError.message}`);
      expect(state.allEntries).toEqual([otherEntry, initialEntry]); // State reverted
      expect(state.filteredEntries).toEqual([otherEntry, initialEntry]); // State reverted
    });
  });

  describe('Dialog Actions', () => {
    it('openEditorDialog should set state for Add mode', () => {
      // Act
      useJournalStore.getState().openEditorDialog();

      // Assert
      const state = useJournalStore.getState();
      expect(state.isEditorOpen).toBe(true);
      expect(state.editingEntry).toBeNull();
    });

    it('openEditorDialog should set state for Edit mode', () => {
      // Arrange
      const entryToEdit: Entry = { id: 'edit-id', date: MOCK_TODAY_DATE, content: 'Edit me', created_at: '...' };

      // Act
      useJournalStore.getState().openEditorDialog(entryToEdit);

      // Assert
      const state = useJournalStore.getState();
      expect(state.isEditorOpen).toBe(true);
      expect(state.editingEntry).toEqual(entryToEdit);
    });

    it('closeEditorDialog should reset dialog state', () => {
      // Arrange: Open dialog first
      useJournalStore.setState({ isEditorOpen: true, editingEntry: {} as Entry });

      // Act
      useJournalStore.getState().closeEditorDialog();

      // Assert
      const state = useJournalStore.getState();
      expect(state.isEditorOpen).toBe(false);
      expect(state.editingEntry).toBeNull();
    });
  });
}); 
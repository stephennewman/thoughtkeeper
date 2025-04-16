/**
 * 🧠 What this file is doing (Explain Like I'm 5):
 * 
 * This file is testing a piece of your app called the "journal store".
 * The journal store keeps track of a user's journal entries — like notes, tags, filters, and more.
 * 
 * This test file checks to make sure all the features work as expected:
 * - Loading the first set of entries when the app opens
 * - Loading more entries as the user scrolls
 * - Filtering entries by tags or keywords
 * - Adding, editing, or deleting an entry
 * - Updating an entry's tags, summaries, or actions
 * - Using voice-to-text to add an entry
 * - Opening and closing the entry editor
 * 
 * It uses fake/mock data and services so it doesn't hit the real database.
 * If anything breaks in these features, the tests will help catch it early.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { useJournalStore } from './journalStore'; 
import * as entryService from '@/lib/entryService';
import { supabase } from '@/lib/supabaseClient'; // Import supabase for mocking tag update
import type { Entry } from '@/types';
import type { PostgrestSingleResponse } from '@supabase/supabase-js'; // Import Supabase type
// import { format } from 'date-fns'; // No longer needed here due to mocking

// Define PAGE_SIZE constant matching the store
const PAGE_SIZE = 100;

// Mock dependencies
vi.mock('@/lib/entryService');
// --- Updated entryService Mocks ---
const mockFetchEntriesPaginated = vi.mocked(entryService.fetchEntriesPaginatedService);
const mockAddEntry = vi.mocked(entryService.addEntryService);
const mockUpdateEntryContent = vi.mocked(entryService.updateEntryContentService);
const mockDeleteEntry = vi.mocked(entryService.deleteEntryService);
// Add mock for fetchTotalEntryCountService
const mockFetchTotalEntryCount = vi.mocked(entryService.fetchTotalEntryCountService);
// Add mocks for summary/action updates if needed later
// const mockUpdateEntrySummary = vi.mocked(entryService.updateEntrySummaryService);
// const mockUpdateEntryActions = vi.mocked(entryService.updateEntryActionsService);

// Remove date-fns mocking as it's not directly used by the store actions anymore
// vi.mock('date-fns', ...);

// Define constants for test data
const MOCK_TODAY_DATE = '2025-04-16'; // Updated date
const MOCK_YESTERDAY_DATE = '2025-04-15'; // Updated date

// Helper to reset store to its initial state before each test
const resetStore = () => {
  useJournalStore.setState(useJournalStore.getInitialState(), true); // Reset the store state
};

describe('journalStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    // Add default mock for total count service
    mockFetchTotalEntryCount.mockResolvedValue({ data: 500, error: null }); // Default success
    vi.useFakeTimers(); 
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Updated Tests for loadInitialEntries ---
  describe('loadInitialEntries', () => {
    it('should fetch first page, update state, and calculate colors on success', async () => {
      // Arrange: Mock data (exactly PAGE_SIZE to indicate more might exist)
      const mockEntries: Entry[] = Array.from({ length: PAGE_SIZE }, (_, i) => ({
        id: `${i + 1}`,
        user_id: 'mock-user-id', // Added mock user_id
        date: MOCK_TODAY_DATE,
        content: `Entry ${i + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), // Added mock updated_at
        // Add tags for color calculation testing
        meta_tag: i % 2 === 0 ? 'Work' : 'Personal',
        intent_tag: i % 3 === 0 ? 'Plan' : 'Reflect',
        tags: [`tag${i}`],
        extracted_actions: null, // Added default value
        extracted_summary: null, // Added default value
        entry_type: 'text', // Added default value
      }));

      mockFetchEntriesPaginated.mockResolvedValue({ data: mockEntries, error: null });

      // Act: Call the action
      await useJournalStore.getState().loadInitialEntries();

      // Assert: Check state updates
      const state = useJournalStore.getState();
      expect(mockFetchEntriesPaginated).toHaveBeenCalledTimes(1);
      // Check arguments: offset 0, limit PAGE_SIZE, default filters
      expect(mockFetchEntriesPaginated).toHaveBeenCalledWith(0, PAGE_SIZE, '', null, null, new Set());

      expect(state.isLoadingInitial).toBe(false);
      expect(state.errorState).toBeNull();
      expect(state.loadedEntries).toEqual(mockEntries);
      expect(state.displayEntries).toEqual(mockEntries); // Initially display = loaded
      expect(state.currentPage).toBe(1);
      expect(state.hasMoreEntries).toBe(true); // Since we fetched exactly PAGE_SIZE
      expect(Object.keys(state.highlightedTagColors).length).toBeGreaterThan(0); // Check colors were calculated
    });

    it('should set hasMoreEntries to false if fewer than PAGE_SIZE entries are fetched', async () => {
      // Arrange: Mock data (less than PAGE_SIZE)
      const mockEntries: Entry[] = Array.from({ length: PAGE_SIZE - 1 }, (_, i) => ({
        id: `${i + 1}`,
        user_id: 'mock-user-id', // Added mock user_id
        date: MOCK_TODAY_DATE,
        content: `Entry ${i + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), // Added mock updated_at
        meta_tag: null, // Added default value
        intent_tag: null, // Added default value
        tags: null, // Added default value
        extracted_actions: null, // Added default value
        extracted_summary: null, // Added default value
        entry_type: 'text', // Added default value
      }));
      mockFetchEntriesPaginated.mockResolvedValue({ data: mockEntries, error: null });

      // Act
      await useJournalStore.getState().loadInitialEntries();

      // Assert
      const state = useJournalStore.getState();
      expect(mockFetchEntriesPaginated).toHaveBeenCalledTimes(1);
      expect(state.loadedEntries).toEqual(mockEntries);
      expect(state.displayEntries).toEqual(mockEntries);
      expect(state.currentPage).toBe(1);
      expect(state.hasMoreEntries).toBe(false); // Key assertion
    });

    it('should set error state and clear entries on fetch failure', async () => {
      // Arrange: Mock service failure
      const mockError = new Error('Fetch failed!');
      mockFetchEntriesPaginated.mockResolvedValue({ data: null, error: mockError });

      // Act: Call the action
      await useJournalStore.getState().loadInitialEntries();

      // Assert: Check state updates
      const state = useJournalStore.getState();
      expect(mockFetchEntriesPaginated).toHaveBeenCalledTimes(1);
      expect(state.isLoadingInitial).toBe(false);
      expect(state.errorState).toBe(`Failed to load entries: ${mockError.message}`);
      expect(state.loadedEntries).toEqual([]);
      expect(state.displayEntries).toEqual([]);
      expect(state.currentPage).toBe(0); // Stays at 0
      expect(state.hasMoreEntries).toBe(false); // Reset on initial load error
    });

     it('should set isLoadingInitial correctly during fetch', async () => {
      // Arrange
      let resolveFetch: (value: { data: Entry[] | null; error: Error | null }) => void;
      const promise = new Promise<{ data: Entry[] | null; error: Error | null }>(resolve => {
        resolveFetch = resolve;
      });
      mockFetchEntriesPaginated.mockReturnValue(promise);
      
      // Act: Start the action, but don't await completion yet
      const actionPromise = useJournalStore.getState().loadInitialEntries();

      // Assert: Check loading state immediately after call
      expect(useJournalStore.getState().isLoadingInitial).toBe(true);
      expect(useJournalStore.getState().errorState).toBeNull(); // Error cleared

      // Arrange: Resolve the promise
      resolveFetch!({ data: [], error: null }); 
      await actionPromise; // Wait for the action to complete

      // Assert: Check final loading state
      expect(useJournalStore.getState().isLoadingInitial).toBe(false);
    });

    it('should pass current filters to fetchEntriesPaginatedService', async () => {
        // Arrange: Set filters in the store first
        const initialFilters = {
            searchQuery: 'filter test',
            activeMetaTag: 'TestMeta',
            activeIntentTag: 'TestIntent',
            activeContentTags: new Set(['test1', 'test2'])
        };
        useJournalStore.setState(initialFilters);
        mockFetchEntriesPaginated.mockResolvedValue({ data: [], error: null });

        // Act
        await useJournalStore.getState().loadInitialEntries();

        // Assert
        expect(mockFetchEntriesPaginated).toHaveBeenCalledWith(
            0, 
            PAGE_SIZE, 
            initialFilters.searchQuery, 
            initialFilters.activeMetaTag, 
            initialFilters.activeIntentTag, 
            initialFilters.activeContentTags
        );
    });
  });

  // --- Tests for loadMoreEntries ---
  describe('loadMoreEntries', () => {
    const initialEntry: Entry = { 
        id: 'initial-1', 
        user_id: 'mock-user-id', 
        date: MOCK_TODAY_DATE, 
        content: 'Initial Entry', 
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(), 
        meta_tag: null, intent_tag: null, tags: null, extracted_actions: null, extracted_summary: null, entry_type: 'text' 
      };

    beforeEach(() => {
        // Set initial state: page 1 loaded with one entry, more exist
        useJournalStore.setState({
            loadedEntries: [initialEntry],
            displayEntries: [initialEntry],
            currentPage: 1,
            hasMoreEntries: true,
            isLoadingInitial: false,
            isLoadingMore: false,
        });
        mockFetchEntriesPaginated.mockClear(); // Clear mocks specifically for this suite
    });

    it('should fetch the next page and append entries, updating state correctly', async () => {
        // Arrange: Mock next page data (less than PAGE_SIZE indicates end)
        const nextPageEntries: Entry[] = Array.from({ length: PAGE_SIZE / 2 }, (_, i) => ({
            id: `next-${i + 1}`, user_id: 'mock-user-id', date: MOCK_YESTERDAY_DATE, content: `Next Page Entry ${i + 1}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), meta_tag: null, intent_tag: null, tags: null, extracted_actions: null, extracted_summary: null, entry_type: 'text'
        }));
        const expectedOffset = 1 * PAGE_SIZE; // Current page (1) * PAGE_SIZE
        mockFetchEntriesPaginated.mockResolvedValue({ data: nextPageEntries, error: null });

        // Act
        await useJournalStore.getState().loadMoreEntries();

        // Assert
        const state = useJournalStore.getState();
        expect(mockFetchEntriesPaginated).toHaveBeenCalledTimes(1);
        expect(mockFetchEntriesPaginated).toHaveBeenCalledWith(expectedOffset, PAGE_SIZE, '', null, null, new Set()); // Check offset and filters

        expect(state.isLoadingMore).toBe(false);
        expect(state.errorState).toBeNull();
        expect(state.loadedEntries).toEqual([initialEntry, ...nextPageEntries]);
        expect(state.displayEntries).toEqual([initialEntry, ...nextPageEntries]); // Should also append to displayEntries if no filters active
        expect(state.currentPage).toBe(2);
        expect(state.hasMoreEntries).toBe(false); // Since we fetched less than PAGE_SIZE
        // Potentially check tag colors recalculated if needed
    });

    it('should not fetch if isLoadingMore is true', async () => {
        // Arrange: Set loading state
        useJournalStore.setState({ isLoadingMore: true });

        // Act
        await useJournalStore.getState().loadMoreEntries();

        // Assert
        expect(mockFetchEntriesPaginated).not.toHaveBeenCalled();
    });

    it('should not fetch if isLoadingInitial is true', async () => {
        // Arrange: Set loading state
        useJournalStore.setState({ isLoadingInitial: true });

        // Act
        await useJournalStore.getState().loadMoreEntries();

        // Assert
        expect(mockFetchEntriesPaginated).not.toHaveBeenCalled();
    });


    it('should not fetch if hasMoreEntries is false', async () => {
        // Arrange: Set hasMoreEntries to false
        useJournalStore.setState({ hasMoreEntries: false });

        // Act
        await useJournalStore.getState().loadMoreEntries();

        // Assert
        expect(mockFetchEntriesPaginated).not.toHaveBeenCalled();
    });

    it('should set hasMoreEntries to true if exactly PAGE_SIZE entries are fetched', async () => {
        // Arrange: Mock exactly PAGE_SIZE entries
        const nextPageEntries: Entry[] = Array.from({ length: PAGE_SIZE }, (_, i) => ({ // Use PAGE_SIZE (100)
            id: `next-${i + 1}`, user_id: 'mock-user-id', date: MOCK_YESTERDAY_DATE, content: `Next Page Entry ${i + 1}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), meta_tag: null, intent_tag: null, tags: null, extracted_actions: null, extracted_summary: null, entry_type: 'text'
        }));
        mockFetchEntriesPaginated.mockResolvedValue({ data: nextPageEntries, error: null });

        // Act
        await useJournalStore.getState().loadMoreEntries();

        // Assert
        expect(useJournalStore.getState().hasMoreEntries).toBe(true); // Should now be true
        expect(useJournalStore.getState().currentPage).toBe(2);
    });

    it('should set error state and not change entries on fetch failure', async () => {
        // Arrange: Mock service failure
        const mockError = new Error('Fetch more failed!');
        mockFetchEntriesPaginated.mockResolvedValue({ data: null, error: mockError });
        const originalLoaded = useJournalStore.getState().loadedEntries;
        const originalPage = useJournalStore.getState().currentPage;
        const originalHasMore = useJournalStore.getState().hasMoreEntries; // Store original value

        // Act: Call the action
        await useJournalStore.getState().loadMoreEntries();

        // Assert: Check state updates
        const state = useJournalStore.getState();
        expect(mockFetchEntriesPaginated).toHaveBeenCalledTimes(1);
        expect(state.isLoadingMore).toBe(false);
        expect(state.errorState).toBe(`Failed to load more entries: ${mockError.message}`);
        expect(state.loadedEntries).toEqual(originalLoaded); // Entries unchanged
        expect(state.displayEntries).toEqual(originalLoaded); // Display entries unchanged
        expect(state.currentPage).toBe(originalPage); // Page unchanged
        // *** Corrected: Assert hasMoreEntries retains original value on load more error ***
        expect(state.hasMoreEntries).toBe(originalHasMore); 
    });

     it('should set isLoadingMore correctly during fetch', async () => {
      // Arrange
      let resolveFetch: (value: { data: Entry[] | null; error: Error | null }) => void;
      const promise = new Promise<{ data: Entry[] | null; error: Error | null }>(resolve => {
        resolveFetch = resolve;
      });
        mockFetchEntriesPaginated.mockReturnValue(promise);
      
        // Act: Start the action, but don't await completion yet
        const actionPromise = useJournalStore.getState().loadMoreEntries();

        // Assert: Check loading state immediately after call
        expect(useJournalStore.getState().isLoadingMore).toBe(true);

      // Arrange: Resolve the promise
      resolveFetch!({ data: [], error: null }); 
        await actionPromise; // Wait for the action to complete

      // Assert: Check final loading state
        expect(useJournalStore.getState().isLoadingMore).toBe(false);
    });

    it('should pass current filters to fetchEntriesPaginatedService', async () => {
        // Arrange: Set filters in the store first
        const currentFilters = {
            searchQuery: 'more filter test',
            activeMetaTag: 'MoreMeta',
            activeIntentTag: 'MoreIntent',
            activeContentTags: new Set(['more1', 'more2'])
        };
        useJournalStore.setState(currentFilters);
        const expectedOffset = useJournalStore.getState().currentPage * PAGE_SIZE;
        mockFetchEntriesPaginated.mockResolvedValue({ data: [], error: null });

        // Act
        await useJournalStore.getState().loadMoreEntries();

        // Assert
        expect(mockFetchEntriesPaginated).toHaveBeenCalledWith(
            expectedOffset,
            PAGE_SIZE,
            currentFilters.searchQuery,
            currentFilters.activeMetaTag,
            currentFilters.activeIntentTag,
            currentFilters.activeContentTags
        );
    });
  });

  // --- Tests for setFilters ---
  describe('setFilters', () => {
    // Sample entries to filter against
    const entry1: Entry = { id: '1', user_id: 'u1', date: 'd1', content: 'Test one apple', meta_tag: 'Work', intent_tag: 'Plan', tags: ['react', 'urgent'], created_at: 't1', updated_at: 't1', extracted_actions: null, extracted_summary: null, entry_type: 'text' };
    const entry2: Entry = { id: '2', user_id: 'u1', date: 'd1', content: 'Test two banana', meta_tag: 'Personal', intent_tag: 'Reflect', tags: ['typescript', 'urgent'], created_at: 't2', updated_at: 't2', extracted_actions: null, extracted_summary: null, entry_type: 'text' };
    const entry3: Entry = { id: '3', user_id: 'u1', date: 'd2', content: 'Another test', meta_tag: 'Work', intent_tag: 'Reflect', tags: ['react'], created_at: 't3', updated_at: 't3', extracted_actions: null, extracted_summary: null, entry_type: 'text' };
    const initialLoadedEntries = [entry1, entry2, entry3];

    beforeEach(() => {
      // Set initial state with loaded entries and no filters
      useJournalStore.setState({
        loadedEntries: initialLoadedEntries,
        displayEntries: initialLoadedEntries, // Initially show all
        searchQuery: '',
        activeMetaTag: null,
        activeIntentTag: null,
        activeContentTags: new Set(),
        currentPage: 1, // Assume some entries loaded
        hasMoreEntries: false, // Doesn't matter for filtering
      });
    });

    it('should update searchQuery and filter displayEntries (case-insensitive)', () => {
      // Act
      useJournalStore.getState().setFilters({ searchQuery: 'banana' });

      // Assert
      const state = useJournalStore.getState();
      expect(state.searchQuery).toBe('banana');
      expect(state.displayEntries).toEqual([entry2]);
    });

    it('should update activeMetaTag and filter displayEntries', () => {
      // Act
      useJournalStore.getState().setFilters({ activeMetaTag: 'Personal' });

      // Assert
      const state = useJournalStore.getState();
      expect(state.activeMetaTag).toBe('Personal');
      expect(state.displayEntries).toEqual([entry2]);
    });

    it('should update activeIntentTag and filter displayEntries', () => {
      // Act
      useJournalStore.getState().setFilters({ activeIntentTag: 'Plan' });

      // Assert
      const state = useJournalStore.getState();
      expect(state.activeIntentTag).toBe('Plan');
      expect(state.displayEntries).toEqual([entry1]);
    });

    it('should update activeContentTags and filter displayEntries (OR logic)', () => {
      // Act
      useJournalStore.getState().setFilters({ activeContentTags: new Set(['typescript']) });

      // Assert
      const state = useJournalStore.getState();
      expect(state.activeContentTags).toEqual(new Set(['typescript']));
      expect(state.displayEntries).toEqual([entry2]);
    });
    
    it('should filter displayEntries using multiple content tags (OR logic)', () => {
       // Act
       useJournalStore.getState().setFilters({ activeContentTags: new Set(['typescript', 'react']) });

       // Assert
       const state = useJournalStore.getState();
       expect(state.activeContentTags).toEqual(new Set(['typescript', 'react']));
       expect(state.displayEntries).toEqual([entry1, entry2, entry3]); // All match one or the other
     });

    it('should combine filters (Meta + Content Tag)', () => {
      // Act
      useJournalStore.getState().setFilters({ 
        activeMetaTag: 'Work', 
        activeContentTags: new Set(['urgent'])
      });

      // Assert
      const state = useJournalStore.getState();
      expect(state.activeMetaTag).toBe('Work');
      expect(state.activeContentTags).toEqual(new Set(['urgent']));
      expect(state.displayEntries).toEqual([entry1]); // Only entry 1 matches both
    });

    it('should combine filters (Intent + Search Query)', () => {
      // Act
      useJournalStore.getState().setFilters({ 
        activeIntentTag: 'Reflect', 
        searchQuery: 'test'
      });

      // Assert
      const state = useJournalStore.getState();
      expect(state.activeIntentTag).toBe('Reflect');
      expect(state.searchQuery).toBe('test');
      // entry2 content: Test two banana -> matches 'test'
      // entry3 content: Another test -> matches 'test'
      // Both have intent 'Reflect'
      expect(state.displayEntries).toEqual([entry2, entry3]);
    });
    
    it('should handle empty search query correctly', () => {
       useJournalStore.getState().setFilters({ searchQuery: '  ' }); // Whitespace only
       const state = useJournalStore.getState();
       expect(state.searchQuery).toBe('  ');
       expect(state.displayEntries).toEqual(initialLoadedEntries); // Should show all
    });

    it('should clear a specific filter by setting it to null/empty', () => {
      // Arrange: Set initial filters using the action
      useJournalStore.getState().setFilters({ activeMetaTag: 'Work', searchQuery: 'apple' });
      expect(useJournalStore.getState().displayEntries).toEqual([entry1]); // Verify initial filter

      // Act: Clear meta tag filter using the action
      useJournalStore.getState().setFilters({ activeMetaTag: null }); // searchQuery remains 'apple' implicitly

      // Assert: Only search query remains
      const state = useJournalStore.getState();
      expect(state.activeMetaTag).toBeNull();
      expect(state.searchQuery).toBe('apple');
      expect(state.displayEntries).toEqual([entry1]); // Search still applies
    });

    it('should clear all filters and show all loaded entries', () => {
      // Arrange: Set initial filters using the action
      useJournalStore.getState().setFilters({ activeIntentTag: 'Plan', activeContentTags: new Set(['react']) });
      expect(useJournalStore.getState().displayEntries).toEqual([entry1]); // Verify initial filter

      // Act: Clear all filters using the action
      useJournalStore.getState().setFilters({
        searchQuery: '',
        activeMetaTag: null,
        activeIntentTag: null,
        activeContentTags: new Set()
      });

      // Assert: All filters cleared, all entries shown
      const state = useJournalStore.getState();
      expect(state.searchQuery).toBe('');
      expect(state.activeMetaTag).toBeNull();
      expect(state.activeIntentTag).toBeNull();
      expect(state.activeContentTags).toEqual(new Set());
      expect(state.displayEntries).toEqual(initialLoadedEntries);
    });
    
    // We could add more tests specifically targeting the `filterLoadedEntries` function 
    // in isolation if its logic becomes significantly more complex.
  });

  // --- Tests for addEntry ---
  describe('addEntry', () => {
    const newContent = 'Newly added entry content';
    const newDate = MOCK_TODAY_DATE;
    const mockNewEntry: Entry = { 
      id: 'new-id-123', 
      user_id: 'mock-user-id', 
      date: newDate, 
      content: newContent, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(), 
      meta_tag: null, intent_tag: null, tags: null, extracted_actions: null, extracted_summary: null, entry_type: 'text' 
    };
    const initialEntry: Entry = { 
      id: 'initial-1', user_id: 'mock-user-id', date: MOCK_YESTERDAY_DATE, content: 'Initial Entry', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString(), meta_tag: 'Work', intent_tag: null, tags: null, extracted_actions: null, extracted_summary: null, entry_type: 'text' 
    };

    beforeEach(() => {
      // Set initial state with one entry
      useJournalStore.setState({
        loadedEntries: [initialEntry],
        displayEntries: [initialEntry],
        isProcessingEntry: false,
        errorState: null,
      });
      // *** ADDED: Mock global fetch ***
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ 
          ok: true, 
          json: () => Promise.resolve({})
      })); 
      mockAddEntry.mockClear();
    });

    afterEach(() => {
        // *** ADDED: Restore fetch ***
        vi.unstubAllGlobals();
    });

    it('should call addEntryService and optimistically prepend to entries on success', async () => {
      // Arrange
      mockAddEntry.mockResolvedValue({ data: mockNewEntry, error: null });
      const initialLoadedCount = useJournalStore.getState().loadedEntries.length;

      // Act
      await useJournalStore.getState().addEntry(newContent, newDate);

      // Assert: Service call
      expect(mockAddEntry).toHaveBeenCalledTimes(1);
      expect(mockAddEntry).toHaveBeenCalledWith(newDate, newContent, 'text'); // Assuming default type is text

      // Assert: State update (optimistic)
      const state = useJournalStore.getState();
      expect(state.isProcessingEntry).toBe(false); // Should reset
      expect(state.errorState).toBeNull();
      expect(state.loadedEntries.length).toBe(initialLoadedCount + 1);
      expect(state.loadedEntries[0]).toEqual(mockNewEntry); // Prepended
      expect(state.loadedEntries[1]).toEqual(initialEntry);
      expect(state.displayEntries.length).toBe(initialLoadedCount + 1);
      expect(state.displayEntries[0]).toEqual(mockNewEntry); // Also prepended to display
       // Check if colors got recalculated (indirectly by checking if it's not empty)
      expect(Object.keys(state.highlightedTagColors).length).toBeGreaterThan(0); 
    });

    it('should set error state and not change entries if addEntryService fails', async () => {
      // Arrange
      const mockError = new Error('Failed to add entry');
      mockAddEntry.mockResolvedValue({ data: null, error: mockError });
      const originalLoaded = useJournalStore.getState().loadedEntries;

      // Act
      // Use try/catch as the store action re-throws the error
      try {
          await useJournalStore.getState().addEntry(newContent, newDate);
      } catch (e) {
          // Expected path
      }

      // Assert: Service call
      expect(mockAddEntry).toHaveBeenCalledTimes(1);
      expect(mockAddEntry).toHaveBeenCalledWith(newDate, newContent, 'text');

      // Assert: State update (error)
      const state = useJournalStore.getState();
      expect(state.isProcessingEntry).toBe(false);
      // *** Corrected Assertion: check error message ***
      expect(state.errorState).toBe(`Failed to add entry: ${mockError.message}`);
      expect(state.loadedEntries).toEqual(originalLoaded); // No change
      expect(state.displayEntries).toEqual(originalLoaded); // No change
    });
    
    it('should handle isProcessingEntry state correctly during the call', async () => {
        // Arrange
        let resolveAdd: (value: { data: Entry | null; error: Error | null }) => void;
        const promise = new Promise<{ data: Entry | null; error: Error | null }>(resolve => {
            resolveAdd = resolve;
        });
        mockAddEntry.mockReturnValue(promise);

        // Act: Start the action, don't await yet
        const actionPromise = useJournalStore.getState().addEntry(newContent, newDate);

        // Assert: Check processing state immediately
        expect(useJournalStore.getState().isProcessingEntry).toBe(true);

        // Arrange: Resolve the promise
        resolveAdd!({ data: mockNewEntry, error: null });
        await actionPromise; // Wait for completion

        // Assert: Check final processing state
        expect(useJournalStore.getState().isProcessingEntry).toBe(false);
    });
    
    // Note: The store action doesn't currently prevent adding empty content itself,
    // it relies on the service layer (addEntryService) to handle that validation.
    // A test case for adding empty content here wouldn't fail the store action.
  });

  // --- Tests for updateEntry ---
  describe('updateEntry', () => {
    const entryIdToUpdate = 'entry-2';
    const originalContent = 'Original content';
    const updatedContent = 'Updated entry content';
    const initialEntry1: Entry = { 
      id: 'entry-1', user_id: 'mock-user-id', date: MOCK_TODAY_DATE, content: 'Another Entry', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), meta_tag: null, intent_tag: null, tags: null, extracted_actions: null, extracted_summary: null, entry_type: 'text' 
    };
     const entryToUpdate: Entry = { 
      id: entryIdToUpdate, 
      user_id: 'mock-user-id', 
      date: MOCK_YESTERDAY_DATE, 
      content: originalContent, 
      created_at: new Date(Date.now() - 86400000).toISOString(), 
      updated_at: new Date(Date.now() - 86400000).toISOString(), 
      meta_tag: 'Work', intent_tag: null, tags: ['test'], extracted_actions: null, extracted_summary: null, entry_type: 'text' 
    };
    const mockUpdatedEntry: Entry = { ...entryToUpdate, content: updatedContent, updated_at: new Date().toISOString() }; // Simulate updated timestamp

    beforeEach(() => {
      // Set initial state with entries
      useJournalStore.setState({
        loadedEntries: [initialEntry1, entryToUpdate],
        displayEntries: [initialEntry1, entryToUpdate],
        isProcessingEntry: false,
        errorState: null,
      });
      // *** ADDED: Mock global fetch ***
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ 
          ok: true, 
          json: () => Promise.resolve({})
      })); 
      mockUpdateEntryContent.mockClear();
    });

    afterEach(() => {
        // *** ADDED: Restore fetch ***
        vi.unstubAllGlobals();
    });

    it('should call updateEntryContentService and update the specific entry on success', async () => {
      // Arrange
      mockUpdateEntryContent.mockResolvedValue({ data: mockUpdatedEntry, error: null });
      const initialColorState = useJournalStore.getState().highlightedTagColors;

      // Act
      await useJournalStore.getState().updateEntry(entryIdToUpdate, updatedContent);

      // Assert: Service call
      expect(mockUpdateEntryContent).toHaveBeenCalledTimes(1);
      expect(mockUpdateEntryContent).toHaveBeenCalledWith(entryIdToUpdate, updatedContent);

      // Assert: State update
      const state = useJournalStore.getState();
      expect(state.isProcessingEntry).toBe(false); 
      expect(state.errorState).toBeNull();
      
      // Find the updated entry in both arrays
      const updatedLoadedEntry = state.loadedEntries.find(e => e.id === entryIdToUpdate);
      const updatedDisplayEntry = state.displayEntries.find(e => e.id === entryIdToUpdate);
      
      expect(updatedLoadedEntry).toBeDefined();
      expect(updatedLoadedEntry?.content).toBe(updatedContent);
      expect(updatedLoadedEntry?.updated_at).toBe(mockUpdatedEntry.updated_at); // Check timestamp updated
      expect(updatedDisplayEntry).toEqual(updatedLoadedEntry);
      
      // Check other entry is untouched
      expect(state.loadedEntries.find(e => e.id === 'entry-1')?.content).toBe('Another Entry');

      // Check colors were recalculated (might change if content update affects tags later)
      // For now, just assert it recalculated - could be more specific later
       expect(state.highlightedTagColors).not.toBe(initialColorState); 
    });

    it('should set error state and not change entries if updateEntryContentService fails', async () => {
      // Arrange
      const mockError = new Error('Failed to update entry');
      mockUpdateEntryContent.mockResolvedValue({ data: null, error: mockError });
      const originalLoaded = [...useJournalStore.getState().loadedEntries]; // Deep copy
      const originalDisplay = [...useJournalStore.getState().displayEntries];

      // Act
      // Use try/catch as the store action re-throws the error
      try {
          await useJournalStore.getState().updateEntry(entryIdToUpdate, updatedContent);
      } catch (e) {
          // Expected path
      }

      // Assert: Service call
      expect(mockUpdateEntryContent).toHaveBeenCalledTimes(1);
      expect(mockUpdateEntryContent).toHaveBeenCalledWith(entryIdToUpdate, updatedContent);

      // Assert: State update (error)
      const state = useJournalStore.getState();
      expect(state.isProcessingEntry).toBe(false);
      // *** Corrected Assertion: check error message ***
      expect(state.errorState).toBe(`Failed to update entry: ${mockError.message}`);
      expect(state.loadedEntries).toEqual(originalLoaded); // No change
      expect(state.displayEntries).toEqual(originalDisplay); // No change
    });
    
    it('should handle isProcessingEntry state correctly during the call', async () => {
        // Arrange
        let resolveUpdate: (value: { data: Entry | null; error: Error | null }) => void;
        const promise = new Promise<{ data: Entry | null; error: Error | null }>(resolve => {
            resolveUpdate = resolve;
        });
        mockUpdateEntryContent.mockReturnValue(promise);

        // Act: Start the action, don't await yet
        const actionPromise = useJournalStore.getState().updateEntry(entryIdToUpdate, updatedContent);

        // Assert: Check processing state immediately
        expect(useJournalStore.getState().isProcessingEntry).toBe(true);

        // Arrange: Resolve the promise
        resolveUpdate!({ data: mockUpdatedEntry, error: null });
        await actionPromise; // Wait for completion

        // Assert: Check final processing state
        expect(useJournalStore.getState().isProcessingEntry).toBe(false);
    });
  });

  // --- Tests for deleteEntry ---
  describe('deleteEntry', () => {
    const entryIdToDelete = 'entry-del';
    const entryToDelete: Entry = { 
      id: entryIdToDelete, 
      user_id: 'mock-user-id', 
      date: MOCK_YESTERDAY_DATE, 
      content: 'Entry to be deleted', 
      created_at: new Date(Date.now() - 86400000).toISOString(), 
      updated_at: new Date(Date.now() - 86400000).toISOString(), 
      meta_tag: 'DeleteMeta', intent_tag: null, tags: ['delete'], extracted_actions: null, extracted_summary: null, entry_type: 'text' 
    };
    const entryToKeep: Entry = { 
      id: 'entry-keep', user_id: 'mock-user-id', date: MOCK_TODAY_DATE, content: 'Entry to keep', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), meta_tag: null, intent_tag: 'KeepIntent', tags: ['keep'], extracted_actions: null, extracted_summary: null, entry_type: 'text' 
    };

    beforeEach(() => {
      // Set initial state with entries
      useJournalStore.setState({
        loadedEntries: [entryToKeep, entryToDelete],
        displayEntries: [entryToKeep, entryToDelete],
        isProcessingEntry: false,
        errorState: null,
      });
      mockDeleteEntry.mockClear();
    });

    it('should call deleteEntryService and remove the entry from state on success', async () => {
      // Arrange
      mockDeleteEntry.mockResolvedValue({ error: null });
      const initialColorState = useJournalStore.getState().highlightedTagColors;
      const initialLoadedCount = useJournalStore.getState().loadedEntries.length;

      // Act
      await useJournalStore.getState().deleteEntry(entryIdToDelete);

      // Assert: Service call
      expect(mockDeleteEntry).toHaveBeenCalledTimes(1);
      expect(mockDeleteEntry).toHaveBeenCalledWith(entryIdToDelete);

      // Assert: State update
      const state = useJournalStore.getState();
      expect(state.isProcessingEntry).toBe(false); 
      expect(state.errorState).toBeNull();
      expect(state.loadedEntries.length).toBe(initialLoadedCount - 1);
      expect(state.loadedEntries.find(e => e.id === entryIdToDelete)).toBeUndefined();
      expect(state.loadedEntries[0]).toEqual(entryToKeep);
      expect(state.displayEntries.length).toBe(initialLoadedCount - 1);
      expect(state.displayEntries.find(e => e.id === entryIdToDelete)).toBeUndefined();
      expect(state.displayEntries[0]).toEqual(entryToKeep);

      // Check colors were recalculated
      expect(state.highlightedTagColors).not.toBe(initialColorState); 
    });

    it('should set error state and not change entries if deleteEntryService fails', async () => {
      // Arrange
      const mockError = new Error('Failed to delete entry');
      mockDeleteEntry.mockRejectedValue(mockError); // Simulate service throwing error
      const originalLoaded = [...useJournalStore.getState().loadedEntries]; 
      const originalDisplay = [...useJournalStore.getState().displayEntries];

      // Act
      await useJournalStore.getState().deleteEntry(entryIdToDelete);

      // Assert: Service call
      expect(mockDeleteEntry).toHaveBeenCalledTimes(1);
      expect(mockDeleteEntry).toHaveBeenCalledWith(entryIdToDelete);

      // Assert: State update (error)
      const state = useJournalStore.getState();
      expect(state.isProcessingEntry).toBe(false);
      // *** Corrected Assertion: check error message ***
      expect(state.errorState).toBe(`Failed to delete entry: ${mockError.message}`);
      expect(state.loadedEntries).toEqual(originalLoaded); // State should revert or stay the same
      expect(state.displayEntries).toEqual(originalDisplay); 
    });
    
    it('should handle isProcessingEntry state correctly during the call', async () => {
        // Arrange
        let resolveDelete: (value: { error: Error | null }) => void;
        const promise = new Promise<{ error: Error | null }>(resolve => {
            resolveDelete = resolve;
        });
        mockDeleteEntry.mockReturnValue(promise);

        // Act: Start the action, don't await yet
        const actionPromise = useJournalStore.getState().deleteEntry(entryIdToDelete);

        // Assert: Check processing state immediately
        expect(useJournalStore.getState().isProcessingEntry).toBe(true);

        // Arrange: Resolve the promise
        resolveDelete!({ error: null });
        await actionPromise; // Wait for completion

        // Assert: Check final processing state
        expect(useJournalStore.getState().isProcessingEntry).toBe(false);
    });
  });

  // --- Tests for updateEntryTags ---
  describe('updateEntryTags', () => {
    const entryIdToUpdate = 'entry-rt-2';
    const initialEntry1: Entry = { 
      id: 'entry-rt-1', user_id: 'mock-user-id', date: MOCK_TODAY_DATE, content: 'First Realtime Entry', created_at: 't1', updated_at: 't1', meta_tag: 'Work', intent_tag: null, tags: ['initial'], extracted_actions: null, extracted_summary: null, entry_type: 'text' 
    };
    const entryToUpdate: Entry = { // Entry before update
      id: entryIdToUpdate, 
      user_id: 'mock-user-id', 
      date: MOCK_YESTERDAY_DATE, 
      content: 'Entry Receiving Tags', 
      created_at: 't2', updated_at: 't2', 
      meta_tag: null, // Initially null
      intent_tag: null, // Initially null
      tags: null, // Initially null
      extracted_actions: null, 
      extracted_summary: null, 
      entry_type: 'text' 
    };
     const entryUpdatePayload: Partial<Entry> = { // The update payload
         meta_tag: 'Personal',
         intent_tag: 'Reflect',
         tags: ['updated', 'realtime'],
         // Simulate summary/actions update too
         extracted_summary: ['Point 1', 'Point 2'], 
         extracted_actions: [{ task: 'Action 1', completed: false }],
     };

    beforeEach(() => {
      // Set initial state - Keep this as is, filters are applied within tests now
      useJournalStore.setState({
        loadedEntries: [initialEntry1, entryToUpdate],
        displayEntries: [initialEntry1, entryToUpdate],
        searchQuery: '',
        activeMetaTag: null,
        activeIntentTag: null,
        activeContentTags: new Set(),
      });
    });

    it('should update the target entry in loadedEntries with the payload', () => {
      // Act
      useJournalStore.getState().updateEntryTags(entryIdToUpdate, entryUpdatePayload);

      // Assert
      const state = useJournalStore.getState();
      const updatedEntry = state.loadedEntries.find(e => e.id === entryIdToUpdate);

      expect(updatedEntry).toBeDefined();
      // Check specific fields from payload are updated
      expect(updatedEntry?.meta_tag).toBe(entryUpdatePayload.meta_tag);
      expect(updatedEntry?.intent_tag).toBe(entryUpdatePayload.intent_tag);
      expect(updatedEntry?.tags).toEqual(entryUpdatePayload.tags);
      expect(updatedEntry?.extracted_summary).toEqual(entryUpdatePayload.extracted_summary);
      expect(updatedEntry?.extracted_actions).toEqual(entryUpdatePayload.extracted_actions);
      // Check original fields are preserved
      expect(updatedEntry?.content).toBe(entryToUpdate.content);
      expect(updatedEntry?.user_id).toBe(entryToUpdate.user_id);
    });

    it('should recalculate highlightedTagColors', () => {
      const initialColors = useJournalStore.getState().highlightedTagColors;
      
      // Act
      useJournalStore.getState().updateEntryTags(entryIdToUpdate, entryUpdatePayload);
      
      // Assert
      const finalColors = useJournalStore.getState().highlightedTagColors;
      expect(finalColors).not.toBe(initialColors); // Check object reference changed
      // Check if new tags have colors assigned (case-insensitive check)
      expect(finalColors['personal']).toBeDefined(); 
      expect(finalColors['reflect']).toBeDefined();
      expect(finalColors['updated']).toBeDefined();
      expect(finalColors['realtime']).toBeDefined();
    });

    it('should refilter displayEntries based on updated entry data', () => {
      // Arrange: Set a filter that the entry *will* match *after* the update using the action
       useJournalStore.getState().setFilters({ activeMetaTag: 'Personal' }); // Apply filter
       // Verify initial state after filtering - should be empty as neither entry matches 'Personal' initially
       expect(useJournalStore.getState().displayEntries.length).toBe(0); 

      // Act: Update the entry with tags that match the filter
      useJournalStore.getState().updateEntryTags(entryIdToUpdate, entryUpdatePayload); // entryUpdatePayload has meta_tag: 'Personal'

      // Assert: The updated entry should now appear in displayEntries
      const state = useJournalStore.getState();
      expect(state.displayEntries.length).toBe(1);
      expect(state.displayEntries[0].id).toBe(entryIdToUpdate);
      expect(state.displayEntries[0].meta_tag).toBe('Personal');
    });
    
    it('should remove entry from displayEntries if update makes it no longer match filters', () => {
        // Arrange: Set a filter that the entry matches *before* the update using the action
        useJournalStore.getState().setFilters({ activeMetaTag: 'Work' }); // Apply filter (initialEntry1 matches this)
        // Verify initial state after filtering
        expect(useJournalStore.getState().displayEntries.length).toBe(1);
        expect(useJournalStore.getState().displayEntries[0].id).toBe(initialEntry1.id); 

        // Act: Update entry1 so it no longer matches
        useJournalStore.getState().updateEntryTags(initialEntry1.id, { meta_tag: 'Other' }); 

        // Assert: The updated entry should be removed from displayEntries
        const state = useJournalStore.getState();
        expect(state.displayEntries.length).toBe(0);
    });
    
    it('should not modify state if entryId is not found', () => {
        const unknownId = 'unknown-id';
        const originalLoaded = [...useJournalStore.getState().loadedEntries];
        const originalDisplay = [...useJournalStore.getState().displayEntries];
        const originalColors = useJournalStore.getState().highlightedTagColors;

        // Act
        useJournalStore.getState().updateEntryTags(unknownId, entryUpdatePayload);

        // Assert
        const state = useJournalStore.getState();
        expect(state.loadedEntries).toEqual(originalLoaded);
        expect(state.displayEntries).toEqual(originalDisplay);
        expect(state.highlightedTagColors).toBe(originalColors);
    });
  });

  // --- Tests for addEntryWithTranscription ---
  describe('addEntryWithTranscription', () => {
    const transcriptionText = "This is a voice note transcription.";
    const mockFormattedDate = '2025-04-16'; // Should match the mocked format

    // Spy on the addEntry action *within* the store instance
    let addEntrySpy: any;

    beforeAll(() => {
        // Mock date-fns JUST for this test suite if needed, or rely on previous mock setup
        // Ensure format returns the expected date
        vi.mock('date-fns', async (importOriginal) => {
            const actual = await importOriginal<typeof import('date-fns')>();
            return {
                ...actual,
                format: (date: Date | number | string, formatString: string) => {
                    if (formatString === 'yyyy-MM-dd') {
                        return mockFormattedDate;
                    }
                    return actual.format(date, formatString);
                }
            }
        });
    });

    beforeEach(() => {
        // Reset store and spy before each test in this suite
        resetStore();
        // We need to spy on the *actual* addEntry method created by Zustand
        addEntrySpy = vi.spyOn(useJournalStore.getState(), 'addEntry');
        // Ensure the underlying service mock is also reset/ready if addEntry calls it
        mockAddEntry.mockClear(); 
        mockAddEntry.mockResolvedValue({ data: {} as Entry, error: null }); // Prevent potential errors in spied call
    });

    afterEach(() => {
        addEntrySpy.mockRestore(); // Restore original addEntry after each test
    });

    afterAll(() => {
        vi.unmock('date-fns'); // Clean up mock
    });

    it('should call addEntry with transcription, formatted date, and type "voice" ', async () => {
        // Arrange: Spy on the actual addEntry method
        addEntrySpy = vi.spyOn(useJournalStore.getState(), 'addEntry');
        // Ensure the underlying service mock is ready
        mockAddEntry.mockClear(); 
        mockAddEntry.mockResolvedValue({ data: {} as Entry, error: null });

        // Act
        await useJournalStore.getState().addEntryWithTranscription(transcriptionText);

        // Assert
        expect(addEntrySpy).toHaveBeenCalledTimes(1);
        // Check the arguments passed to the internal addEntry call
        expect(addEntrySpy).toHaveBeenCalledWith(transcriptionText, mockFormattedDate, 'voice');
    });

    // Since addEntryWithTranscription just calls addEntry, 
    // error handling and state updates are implicitly covered by addEntry tests.
    // We mainly need to test the argument passing here.
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
      const entryToEdit: Entry = { 
        id: 'edit-id', 
        user_id: 'mock-user-id', // Added
        date: MOCK_TODAY_DATE, 
        content: 'Edit me', 
        created_at: new Date().toISOString(), // Added 
        updated_at: new Date().toISOString(), // Added
        meta_tag: null, // Added 
        intent_tag: null, // Added 
        tags: null, // Added 
        extracted_actions: null, // Added 
        extracted_summary: null, // Added 
        entry_type: 'text' // Added 
      };

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
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, startOfDay } from 'date-fns';
import { JournalSidebar, JournalEntry } from '@/components';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import debounce from 'lodash.debounce';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

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

// Type for the editor state
interface EditorState {
  html: string;
  text: string;
}

// Define tag types
type TagType = 'meta' | 'intent' | 'content';

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [errorLoadingEntries, setErrorLoadingEntries] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM-dd');
  });
  const [currentContent, setCurrentContent] = useState<EditorState>({ html: '', text: '' });
  const [macroSummary, setMacroSummary] = useState<MacroSummary | undefined>(undefined);
  const [isGeneratingMacroSummary, setIsGeneratingMacroSummary] = useState<boolean>(false);
  const [isSavingEntry, setIsSavingEntry] = useState<boolean>(false);
  const [generatingTagsForId, setGeneratingTagsForId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMetaTag, setFilterMetaTag] = useState<string | null>(null);
  const [filterIntentTag, setFilterIntentTag] = useState<string | null>(null);
  const [filterContentTag, setFilterContentTag] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Calculate tag frequencies across all entries (including meta and intent)
  const tagCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    entries.forEach(entry => {
      // Count Meta Tag
      if (entry.meta_tag) {
        counts[entry.meta_tag] = (counts[entry.meta_tag] || 0) + 1;
      }
      // Count Intent Tag
      if (entry.intent_tag) {
        counts[entry.intent_tag] = (counts[entry.intent_tag] || 0) + 1;
      }
      // Count Content Tags
      entry.tags?.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [entries]);

  // Fetch entries - Handle all filters
  const fetchEntries = useCallback(async (query: string, metaTag: string | null, intentTag: string | null, contentTag: string | null) => {
    setErrorLoadingEntries(null);
    try {
      let supabaseQuery = supabase
        .from('entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      const trimmedQuery = query.trim();

      // Apply filters based on priority
      if (trimmedQuery) {
        // Combined search on content/tags (using ilike/contains)
        const filterString = `content.ilike.%${trimmedQuery}%,tags.cs.${JSON.stringify(trimmedQuery)}`;
        supabaseQuery = supabaseQuery.or(filterString);
      } else if (metaTag) {
        // Filter by meta_tag (exact match)
        supabaseQuery = supabaseQuery.eq('meta_tag', metaTag);
      } else if (intentTag) {
        // Filter by intent_tag (exact match)
        supabaseQuery = supabaseQuery.eq('intent_tag', intentTag);
      } else if (contentTag) {
        // Filter by content tag (array contains)
        supabaseQuery = supabaseQuery.contains('tags', JSON.stringify(contentTag));
      }
      // If no filters, query remains unchanged (fetches all)

      const { data, error } = await supabaseQuery;

      if (error) {
        if (error.message.includes('syntax error in tsquery')) {
           console.warn('Full-text search might not be configured properly. Falling back to ilike.');
           // Fallback to ilike if FTS fails
           const { data: fallbackData, error: fallbackError } = await supabase
             .from('entries')
             .select('*')
             .order('date', { ascending: false })
             .order('created_at', { ascending: false })
             .ilike('content', `%${trimmedQuery}%`);
            
           if (fallbackError) throw fallbackError; // Throw original error? Or fallback?
           setEntries((fallbackData as Entry[]) || []);
        } else {
            throw error;
        }
      } else {
         setEntries((data as Entry[]) || []);
      }

    } catch (error: any) {
      console.error('Error loading entries:', error);
      setErrorLoadingEntries(`Failed to load entries: ${error.message}`);
      setEntries([]);
    }
  }, []);

  // Debounced version - Pass all filter states
  const debouncedFetchEntries = useMemo(() => {
    const debouncedFn = debounce((currentQuery: string, currentMeta: string | null, currentIntent: string | null, currentContent: string | null) => {
       fetchEntries(currentQuery, currentMeta, currentIntent, currentContent);
    }, 300);
    return debouncedFn;
  }, [fetchEntries]);

  // Initial Load Effect
  useEffect(() => {
    const initialFetch = async () => {
        setIsInitialLoading(true);
        // Pass null for all filters
        await fetchEntries('', null, null, null); 
        setIsInitialLoading(false);
    }
    initialFetch();
  }, [fetchEntries]);

  // Effect for search/filter changes - Pass all filter states
  useEffect(() => {
    // Call debounced fetch whenever any filter or search changes
    debouncedFetchEntries(searchQuery, filterMetaTag, filterIntentTag, filterContentTag);
    return () => {
      debouncedFetchEntries.cancel();
    };
  }, [searchQuery, filterMetaTag, filterIntentTag, filterContentTag, debouncedFetchEntries]);

  // Update currentContent when selectedDate changes
  useEffect(() => {
    setCurrentContent({ html: '', text: '' }); // Reset editor state
    setMacroSummary(undefined);
  }, [selectedDate]);

  // Update handleTagClick to accept tag type
  const handleTagClick = useCallback((tag: string, type: TagType) => {
    setSearchQuery(''); // Clear search
    // Clear other tag filters and set the new one
    setFilterMetaTag(type === 'meta' ? tag : null);
    setFilterIntentTag(type === 'intent' ? tag : null);
    setFilterContentTag(type === 'content' ? tag : null);
  }, []);

  // Update handleClearFilter to clear all tag filters
  const handleClearFilters = useCallback(() => {
    setFilterMetaTag(null);
    setFilterIntentTag(null);
    setFilterContentTag(null);
    // Optionally clear search too? No, keep search independent for now.
    // setSearchQuery(''); 
  }, []);

  const handleSave = async () => {
    const { html: editorHtml, text: editorText } = currentContent;
    const trimmedText = editorText.trim();
    
    if (!trimmedText || isSavingEntry || generatingTagsForId) return;

    setIsSavingEntry(true);
    setGeneratingTagsForId('new'); // Use a generic indicator for new entry AI processing
    let newEntryId: string | null = null;

    try {
      // Insert basic entry data first
      const newEntryData = {
        date: selectedDate,
        content: editorHtml, // Save HTML
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('entries')
        .insert(newEntryData)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!insertedData) throw new Error("Failed to get inserted entry data.");

      newEntryId = insertedData.id;
      const entryToDisplay = { ...insertedData, tags: [], meta_tag: null, intent_tag: null } as Entry;
      
      // Add entry immediately (without AI tags yet)
      setEntries([entryToDisplay, ...entries]);
      setCurrentContent({ html: '', text: '' });

      // --- Start AI Tag Generation (Meta, Intent, Content) in Parallel ---
      try {
        const results = await Promise.allSettled([
          fetch('/api/classify-meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: trimmedText }) }),
          fetch('/api/classify-intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: trimmedText }) }),
          fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: trimmedText }) })
        ]);

        let metaTag: string | null = null;
        let intentTag: string | null = null;
        let tags: string[] | null = null;

        // Process Meta Tag result
        if (results[0].status === 'fulfilled' && results[0].value.ok) {
          try { metaTag = (await results[0].value.json()).metaTag; } catch (e) { console.error('Failed parsing meta tag'); }
        } else if (results[0].status === 'fulfilled') {
           console.error('Meta Tag API Error:', await results[0].value.text());
        } else {
           console.error('Meta Tag Fetch Error:', results[0].reason);
        }

        // Process Intent Tag result
        if (results[1].status === 'fulfilled' && results[1].value.ok) {
          try { intentTag = (await results[1].value.json()).intentTag; } catch (e) { console.error('Failed parsing intent tag'); }
        } else if (results[1].status === 'fulfilled') {
           console.error('Intent Tag API Error:', await results[1].value.text());
        } else {
           console.error('Intent Tag Fetch Error:', results[1].reason);
        }

        // Process Content Tags result
        if (results[2].status === 'fulfilled' && results[2].value.ok) {
          try { 
              const tagsResult = (await results[2].value.json()).tags; 
              if (tagsResult && Array.isArray(tagsResult)) tags = tagsResult;
          } catch (e) { console.error('Failed parsing content tags'); }
        } else if (results[2].status === 'fulfilled') {
           console.error('Content Tag API Error:', await results[2].value.text());
        } else {
           console.error('Content Tag Fetch Error:', results[2].reason);
        }

        // Check if we have any new tags to save
        if (metaTag || intentTag || (tags && tags.length > 0)) {
          const updatePayload: Partial<Entry> = {};
          if (metaTag) updatePayload.meta_tag = metaTag;
          if (intentTag) updatePayload.intent_tag = intentTag;
          if (tags) updatePayload.tags = tags;

          // Update the entry in Supabase with all generated tags
          const { error: updateError } = await supabase
            .from('entries')
            .update(updatePayload)
            .eq('id', newEntryId);

          if (updateError) {
            console.error('Error saving generated tags to Supabase:', updateError);
          } else {
            // Update the local state with all tags after successful DB update
            setEntries(prevEntries =>
              prevEntries.map(entry =>
                entry.id === newEntryId ? { ...entry, ...updatePayload } : entry
              )
            );
          }
        }
      } catch (tagError: any) {
        console.error('Error during AI tag generation process:', tagError);
      } finally {
        setGeneratingTagsForId(null); // Hide loader
      }
      // --- End AI Tag Generation ---

    } catch (error: any) {
      console.error('Error saving entry:', error);
      alert(`Failed to save entry: ${error.message}`);
      // Consider removing the optimistically added entry if insert failed
      if (newEntryId) {
         setEntries(prev => prev.filter(e => e.id !== newEntryId));
      }
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleUpdateEntry = async (id: string, content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    // Consider adding an isUpdating state here
    try {
      const { data, error } = await supabase
        .from('entries')
        .update({ content: trimmedContent })
        .eq('id', id)
        .select() // Select the updated row
        .single(); // Expecting a single row back

      if (error) {
        throw error;
      }

      // Update the entry in the local state
      // Or refetch all entries: await fetchEntries();
      if (data) {
        setEntries(prevEntries =>
          prevEntries.map(entry => (entry.id === id ? (data as Entry) : entry))
        );
      }
    } catch (error: any) {
      console.error('Error updating entry:', error);
      // TODO: Add user-facing error notification
      alert(`Failed to update entry: ${error.message}`);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    // Consider adding an isDeleting state here
    // Optimistic UI update (remove immediately)
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
      // No need to refetch if optimistic update is successful
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      // TODO: Add user-facing error notification
      alert(`Failed to delete entry: ${error.message}`);
      // Revert UI update if delete fails
      setEntries(originalEntries);
    }
  };

  const handleGenerateMacroSummary = async () => {
    const entriesForDate = entries.filter(entry => entry.date === selectedDate);
    if (entriesForDate.length === 0) return;

    setIsGeneratingMacroSummary(true);
    try {
      // console.log('Generating macro-summary for entries:', entriesForDate.length);
      const response = await fetch('/api/macro-summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Pass only content and maybe date, API doesn't need IDs etc.
          entries: entriesForDate.map(e => ({ content: e.content, date: e.date })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Macro-summary API error:', errorData);
        throw new Error(`Failed to generate macro-summary: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      setMacroSummary(data.macroSummary);
      // Note: Macro summary is currently *not* saved to the database.
      // It's generated on demand and held in local state.
      // console.log('Generated macro-summary:', data.macroSummary);
    } catch (error: any) {
      console.error('Error generating macro-summary:', error);
      setMacroSummary({
        mood: "Error",
        moodEmoji: "⚠️",
        focusAreas: [],
        keyTakeaway: "Unable to generate overview"
      });
      alert(`Failed to generate overview: ${error.message}`);
    } finally {
      setIsGeneratingMacroSummary(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        searchQuery={searchQuery} 
        onSearchChange={(query) => {
          handleClearFilters(); // Clear all tag filters when searching
          setSearchQuery(query);
        }}
        entries={entries}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        macroSummary={macroSummary}
        isGeneratingMacroSummary={isGeneratingMacroSummary}
        onGenerateMacroSummary={handleGenerateMacroSummary}
      />
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar - Hidden on smaller than lg screens */}
        <div className="hidden lg:block">
          <JournalSidebar
            entries={entries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            macroSummary={macroSummary ?? undefined}
            isGeneratingMacroSummary={isGeneratingMacroSummary}
            onGenerateMacroSummary={handleGenerateMacroSummary}
          />
        </div>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-hidden p-4 gap-2">
          {/* Update Clear Filter UI */}
          {(filterMetaTag || filterIntentTag || filterContentTag) && (
            <div className="flex-shrink-0">
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Filtering by: 
                {filterMetaTag && ` [Meta: ${filterMetaTag}]`}
                {filterIntentTag && ` [Intent: ${filterIntentTag}]`}
                {filterContentTag && ` [Tag: ${filterContentTag}]`}
                <X className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
          {errorLoadingEntries && 
              <p className="text-red-600 text-sm flex-shrink-0">Error: {errorLoadingEntries}</p>
          }
          <div className="flex-grow overflow-y-auto pr-2">
            {isInitialLoading && (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}
            {!isInitialLoading && !errorLoadingEntries && (
                entries.length === 0 && (searchQuery || filterMetaTag || filterIntentTag || filterContentTag) ? (
                    <p className="pt-4 text-center text-gray-500">No entries found matching filters.</p>
                ) : entries.length === 0 ? (
                    <p className="pt-4 text-center text-gray-500">No entries yet. Start writing!</p>
                ) : (
                    <JournalEntry
                        selectedDate={selectedDate}
                        content={currentContent.html}
                        onChange={setCurrentContent}
                        onSave={handleSave}
                        entries={entries}
                        onUpdateEntry={handleUpdateEntry}
                        onDeleteEntry={handleDeleteEntry}
                        isSavingEntry={isSavingEntry}
                        generatingTagsForId={generatingTagsForId}
                        onTagClick={handleTagClick}
                        tagCounts={tagCounts}
                    />
                )
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 
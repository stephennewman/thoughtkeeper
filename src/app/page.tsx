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
import { X } from 'lucide-react';

// Define a type matching the Supabase table structure
// Assuming tags will be stored as string[] in jsonb
interface SupabaseEntry {
  id: string;         // uuid
  created_at: string; // timestamptz
  date: string;         // date (YYYY-MM-DD)
  content: string;      // text
  summary?: string | null; // text
  tags?: string[] | null; // jsonb
}

// Keep the existing Entry type for simplicity or merge later if needed
interface Entry extends SupabaseEntry {}

interface MacroSummary {
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

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
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
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Calculate tag frequencies across all entries
  const tagCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    entries.forEach(entry => {
      entry.tags?.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [entries]); // Recalculate only when entries change

  // Fetch entries from Supabase, now including search and tag filters
  const fetchEntries = useCallback(async (query: string, tag: string | null) => {
    setIsLoadingEntries(true);
    setErrorLoadingEntries(null);
    try {
      let supabaseQuery = supabase
        .from('entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      const trimmedQuery = query.trim();

      // Apply text search OR tag filter if query exists
      if (trimmedQuery) {
        // Ensure tag filter is cleared if searching
        tag = null; 
        
        // --- DEBUG: Temporarily search ONLY content --- 
        supabaseQuery = supabaseQuery.textSearch('content', trimmedQuery, {
          type: 'websearch',
          config: 'english'
        });
        // --- END DEBUG --- 

        // Original .or() logic commented out:
        // const filterString = `content.fts.${trimmedQuery},tags.cs.${JSON.stringify(trimmedQuery)}`;
        // supabaseQuery = supabaseQuery.or(filterString);
      } 
      // Apply tag filter only if tag exists AND search query is empty
      else if (tag) {
        supabaseQuery = supabaseQuery.contains('tags', JSON.stringify(tag));
      }

      const { data, error } = await supabaseQuery;

      if (error) {
        // Special handling for FTS syntax error if index isn't ready/configured
        if (error.message.includes('syntax error in tsquery')) {
          console.warn('Full-text search might not be configured properly on `content` column.');
          // Fallback: Maybe search only tags or show a different error?
          // For now, just rethrow or clear results
        }
        throw error;
      }
      setEntries((data as Entry[]) || []);
    } catch (error: any) {
      console.error('Error loading entries:', error);
      setErrorLoadingEntries(`Failed to load entries: ${error.message}`);
      setEntries([]);
    } finally {
      setIsLoadingEntries(false);
    }
  }, []);

  // Debounced version of fetchEntries
  const debouncedFetchEntries = useMemo(() => {
    return debounce(fetchEntries, 300); // 300ms delay
  }, [fetchEntries]);

  // Effect to trigger debounced search when searchQuery changes
  useEffect(() => {
    debouncedFetchEntries(searchQuery, filterTag);
    // Cleanup function to cancel debounced call if component unmounts or query changes quickly
    return () => {
      debouncedFetchEntries.cancel();
    };
  }, [searchQuery, debouncedFetchEntries]);

  // Effect to fetch entries when filterTag changes
  useEffect(() => {
    // Fetch immediately when filter tag changes (no debounce needed?)
    // Pass both query and tag, let fetchEntries decide priority
    fetchEntries(searchQuery, filterTag); 
  }, [filterTag, fetchEntries]); // Add fetchEntries dependency

  // Update currentContent when selectedDate changes
  useEffect(() => {
    setCurrentContent({ html: '', text: '' }); // Reset editor state
    setMacroSummary(undefined);
  }, [selectedDate]);

  const handleSave = async () => {
    // Use state directly
    const { html: trimmedHtml, text: trimmedText } = {
      html: currentContent.html.trim(), // Trim HTML? Maybe not necessary if TipTap handles it.
      text: currentContent.text.trim(),
    };
    
    // Basic check if editor is effectively empty (might need refinement)
    if (!trimmedText || isSavingEntry || generatingTagsForId) return;

    setIsSavingEntry(true);
    let newEntryId: string | null = null;

    try {
      // Insert HTML content into Supabase
      const newEntryData = {
        date: selectedDate,
        content: currentContent.html, // Save the HTML
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('entries')
        .insert(newEntryData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }
      if (!insertedData) {
        throw new Error("Failed to get inserted entry data.");
      }

      newEntryId = insertedData.id;
      setEntries([insertedData as Entry, ...entries]);
      setCurrentContent({ html: '', text: '' }); // Reset editor state

      // --- Start Tag Generation (using plain text) ---
      setGeneratingTagsForId(newEntryId);
      try {
        const tagsResponse = await fetch('/api/tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: trimmedText }), // Send PLAIN TEXT
        });

        if (!tagsResponse.ok) {
          // Log error but don't block the main flow
          console.error('Error generating tags:', await tagsResponse.text());
        } else {
          const { tags } = await tagsResponse.json();
          if (tags && Array.isArray(tags) && tags.length > 0) {
            // Update the entry in Supabase with the generated tags
            const { error: updateError } = await supabase
              .from('entries')
              .update({ tags: tags })
              .eq('id', newEntryId);

            if (updateError) {
              console.error('Error saving tags to Supabase:', updateError);
            } else {
              // Update the local state with tags after successful DB update
              setEntries(prevEntries =>
                prevEntries.map(entry =>
                  entry.id === newEntryId ? { ...entry, tags: tags } : entry
                )
              );
            }
          }
        }
      } catch (tagError: any) {
        console.error('Error during tag generation/saving process:', tagError);
      } finally {
        setGeneratingTagsForId(null); // Hide loader for this ID
      }
      // --- End Tag Generation ---

    } catch (error: any) {
      console.error('Error saving entry:', error);
      alert(`Failed to save entry: ${error.message}`);
      // If insert failed, maybe remove the entry if we added it optimistically?
      // Or handle differently.
    } finally {
      setIsSavingEntry(false); // Reset main saving state
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

  // Handler for clicking a tag
  const handleTagClick = useCallback((tag: string) => {
    setSearchQuery(''); // Clear search query
    setFilterTag(tag); // Set the filter tag
    // The useEffect watching filterTag will trigger the fetch
  }, []); // Empty dependency array ok, only uses setters

  // Handler for clearing the tag filter
  const handleClearFilter = useCallback(() => {
    setFilterTag(null); // Clear the filter tag
    // The useEffect watching filterTag will trigger the fetch
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        searchQuery={searchQuery} 
        onSearchChange={(query) => {
          setFilterTag(null); // Clear tag filter when searching
          setSearchQuery(query);
        }}
      />
      <main className="flex flex-1 overflow-hidden">
        <JournalSidebar
          entries={entries}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          macroSummary={macroSummary ?? undefined}
          isGeneratingMacroSummary={isGeneratingMacroSummary}
          onGenerateMacroSummary={handleGenerateMacroSummary}
        />
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          {/* Show Clear Filter button if a tag is active */}
          {filterTag && (
            <div className="flex-shrink-0">
              <Button variant="secondary" size="sm" onClick={handleClearFilter}>
                Filtering by: "{filterTag}"
                <X className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
          <div className="flex-grow overflow-y-auto">
            {isLoadingEntries && <p className="p-4 text-center">Loading entries...</p>}
            {errorLoadingEntries && <p className="p-4 text-red-600">Error: {errorLoadingEntries}</p>}
            {!isLoadingEntries && !errorLoadingEntries && entries.length === 0 && searchQuery && (
              <p className="p-4 text-center text-gray-500">No entries found matching "{searchQuery}".</p>
            )}
            {!isLoadingEntries && !errorLoadingEntries && entries.length === 0 && !searchQuery && (
              <p className="p-4 text-center text-gray-500">No entries yet. Start writing!</p>
            )}
            {!isLoadingEntries && !errorLoadingEntries && entries.length === 0 && filterTag && (
                 <p className="p-4 text-center text-gray-500">No entries found tagged with "{filterTag}".</p>
             )}
            {!isLoadingEntries && !errorLoadingEntries && entries.length > 0 && (
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 
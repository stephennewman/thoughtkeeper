'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, startOfDay } from 'date-fns';
import { JournalSidebar, JournalEntry } from '@/components';
import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

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

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [errorLoadingEntries, setErrorLoadingEntries] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM-dd');
  });
  const [currentContent, setCurrentContent] = useState('');
  const [macroSummary, setMacroSummary] = useState<MacroSummary | undefined>(undefined);
  const [isGeneratingMacroSummary, setIsGeneratingMacroSummary] = useState<boolean>(false);
  const [isSavingEntry, setIsSavingEntry] = useState<boolean>(false);

  // Fetch entries from Supabase
  const fetchEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    setErrorLoadingEntries(null);
    try {
      // Fetch all entries for now, ordered by date then creation time
      // Later, you might filter by date range for performance
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      // Ensure data conforms to Entry type (adjust if Supabase returns different structure)
      setEntries((data as Entry[]) || []);
    } catch (error: any) {
      console.error('Error loading entries:', error);
      setErrorLoadingEntries(`Failed to load entries: ${error.message}`);
      setEntries([]); // Clear entries on error
    } finally {
      setIsLoadingEntries(false);
    }
  }, []);

  // Load entries on initial mount
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Update currentContent when selectedDate changes
  useEffect(() => {
    setCurrentContent('');
    // Reset macro summary when date changes
    setMacroSummary(undefined);
    // Optionally refetch entries filtered by selectedDate here for performance,
    // but for now, filtering happens client-side in JournalEntry
  }, [selectedDate]);

  const handleSave = async (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSavingEntry) return;

    setIsSavingEntry(true);
    try {
      // Insert minimal data first
      const newEntryData = {
        date: selectedDate,
        content: trimmedContent,
        // tags: null, // Explicitly set optional fields if needed by RLS later
        // summary: null
      };

      const { data, error } = await supabase
        .from('entries')
        .insert(newEntryData)
        .select() // Select the newly created row
        .single(); // Expecting a single row back

      if (error) {
        throw error;
      }

      // Add the new entry to the beginning of the local state
      // Or refetch all entries: await fetchEntries();
      if (data) {
        setEntries([data as Entry, ...entries]);
      }

      setCurrentContent(''); // Clear the input after saving

      // TODO LATER: Add back tag generation - perhaps call a separate function
      // handleGenerateTagsForEntry(data.id, trimmedContent);

    } catch (error: any) {
      console.error('Error saving entry:', error);
      // TODO: Add user-facing error notification
      alert(`Failed to save entry: ${error.message}`);
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
    <main className="flex min-h-screen">
      {/* TODO: Pass loading/error states to Sidebar if needed */}
      <JournalSidebar
        entries={entries}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        macroSummary={macroSummary ?? undefined}
        isGeneratingMacroSummary={isGeneratingMacroSummary}
        onGenerateMacroSummary={handleGenerateMacroSummary} // Assuming sidebar has button
      />
      <div className="flex-1">
        {isLoadingEntries && <p className="p-4">Loading entries...</p>}
        {errorLoadingEntries && <p className="p-4 text-red-600">Error: {errorLoadingEntries}</p>}
        {!isLoadingEntries && !errorLoadingEntries && (
          <JournalEntry
            selectedDate={selectedDate}
            content={currentContent}
            onSave={handleSave}
            entries={entries} // Pass all entries for now, JournalEntry filters by date
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            isSavingEntry={isSavingEntry}
          />
        )}
      </div>
    </main>
  );
} 
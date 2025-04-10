'use client';

import { useState, useEffect } from 'react';
import { format, parseISO, startOfDay } from 'date-fns';
import { JournalSidebar, JournalEntry } from '@/components';
import * as React from 'react';

interface Entry {
  id: string;
  date: string;
  content: string;
  summary?: string;
  tags?: string[];
}

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
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM-dd');
  });
  const [currentContent, setCurrentContent] = useState('');
  const [macroSummary, setMacroSummary] = useState<MacroSummary | null>(null);
  const [isGeneratingMacroSummary, setIsGeneratingMacroSummary] = useState<boolean>(false);

  // Load entries from localStorage on mount
  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem('journal_entries');
      if (savedEntries) {
        setEntries(JSON.parse(savedEntries));
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  }, []);

  // Update currentContent when selectedDate changes
  useEffect(() => {
    setCurrentContent('');
  }, [selectedDate]);

  const handleSave = async (content: string) => {
    if (!content.trim()) return; // Don't save empty entries

    const newEntry: Entry = {
      id: crypto.randomUUID(),
      date: selectedDate,
      content: content.trim()
    };

    // Generate tags
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (response.ok) {
        const { tags } = await response.json();
        newEntry.tags = tags;
      }
    } catch (error) {
      console.error('Error generating tags:', error);
    }

    // Add the new entry to the beginning of the list
    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    try {
      localStorage.setItem('journal_entries', JSON.stringify(updatedEntries));
    } catch (error) {
      console.error('Error saving entries:', error);
    }
    setCurrentContent(''); // Clear the input after saving
  };

  const handleUpdateEntry = async (id: string, content: string) => {
    if (!content.trim()) return; // Don't update with empty content

    const updatedEntries = entries.map(entry => {
      if (entry.id === id) {
        return { ...entry, content: content.trim() };
      }
      return entry;
    });

    setEntries(updatedEntries);
    try {
      localStorage.setItem('journal_entries', JSON.stringify(updatedEntries));
    } catch (error) {
      console.error('Error saving entries:', error);
    }
  };

  const handleDeleteEntry = (id: string) => {
    const updatedEntries = entries.filter(entry => entry.id !== id);
    setEntries(updatedEntries);
    try {
      localStorage.setItem('journal_entries', JSON.stringify(updatedEntries));
    } catch (error) {
      console.error('Error saving entries:', error);
    }
  };

  const handleGenerateSummary = async (entryIndex: number) => {
    const entry = entries[entryIndex];
    if (!entry?.content) return;

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: entry.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      const summary = data.summary;

      const updatedEntries = entries.map((e, index) => 
        index === entryIndex ? { ...e, summary } : e
      );

      setEntries(updatedEntries);
      localStorage.setItem('journal_entries', JSON.stringify(updatedEntries));
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  };

  const handleGenerateTags = async (entryIndex: number) => {
    const entry = entries[entryIndex];
    if (!entry?.content) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: entry.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate tags');
      }

      const data = await response.json();
      const tags = data.tags;

      const updatedEntries = entries.map((e, index) => 
        index === entryIndex ? { ...e, tags } : e
      );

      setEntries(updatedEntries);
      localStorage.setItem('journal_entries', JSON.stringify(updatedEntries));
    } catch (error) {
      console.error('Error generating tags:', error);
    }
  };

  const handleGenerateMacroSummary = async () => {
    if (entries.length === 0) return;

    setIsGeneratingMacroSummary(true);
    try {
      console.log('Generating macro-summary for entries:', entries.length);
      const response = await fetch('/api/macro-summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: entries.filter(entry => entry.date === selectedDate),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Macro-summary API error:', errorData);
        throw new Error(`Failed to generate macro-summary: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      setMacroSummary(data.macroSummary);
      console.log('Generated macro-summary:', data.macroSummary);
    } catch (error) {
      console.error('Error generating macro-summary:', error);
      setMacroSummary({
        mood: "Error",
        moodEmoji: "⚠️",
        focusAreas: [],
        keyTakeaway: "Unable to generate overview"
      });
    } finally {
      setIsGeneratingMacroSummary(false);
    }
  };

  return (
    <main className="flex min-h-screen">
      <JournalSidebar
        entries={entries}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        macroSummary={macroSummary}
        isGeneratingMacroSummary={isGeneratingMacroSummary}
      />
      <div className="flex-1">
        <JournalEntry
          selectedDate={selectedDate}
          content={currentContent}
          onSave={handleSave}
          entries={entries}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      </div>
    </main>
  );
} 
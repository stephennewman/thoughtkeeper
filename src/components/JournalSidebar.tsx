'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useJournalStore } from '@/stores/journalStore'; // Import the store

// Remove props interface - Component will get state from store
// interface JournalSidebarProps { ... }

export function JournalSidebar() { // Remove props from function signature
  // Get state and actions from the store
  const { 
    allEntries, 
    selectedDate, 
    setFiltersAndFetch, // Needed to trigger refetch on date change
    setSelectedDate // Use the new action
  } = useJournalStore();

  // Group entries by date (use allEntries from store)
  const entriesByDate = React.useMemo(() => {
    return allEntries.reduce((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = [];
      }
      acc[entry.date].push(entry);
      return acc;
    }, {} as Record<string, typeof allEntries>);
  }, [allEntries]);

  // Sort dates in descending order
  const sortedDates = React.useMemo(() => {
    return Object.keys(entriesByDate).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [entriesByDate]);

  // Handle date selection click
  const handleSelectDate = (date: string) => {
    // 1. Update selectedDate in the store via action
    setSelectedDate(date); 
    // 2. Trigger a fetch for the new date
    setFiltersAndFetch({});
    // Also scroll main content to top - How to trigger this?
    // We need to either call a prop or have the page component react to selectedDate change
    // Let's remove the scroll logic from here for now.
  };

  return (
    <div className="w-64 border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 p-4 overflow-y-auto h-full flex flex-col">
      <img 
        src="https://s3.ca-central-1.amazonaws.com/logojoy/logos/217739981/noBgColor.png?388025.2999999523"
        alt="ThoughtKeeper Logo" 
        className="w-56 mx-auto mb-6"
      />
      <div className="space-y-4 flex-grow overflow-y-auto">
        {sortedDates.map((date) => {
          const dateEntries = entriesByDate[date];
          const isSelected = date === selectedDate; // Use selectedDate from store

          return (
            <div key={date} className="space-y-2">
              <Button
                variant={isSelected ? "default" : "ghost"}
                className={`w-full justify-between ${isSelected
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleSelectDate(date)} // Use updated handler
              >
                <span suppressHydrationWarning={true}>{format(parseISO(date), 'MMM d, yyyy')}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {dateEntries.length}
                </span>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
} 
import React from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';

interface JournalSidebarProps {
  entries: Array<{
    id: string;
    date: string;
    content: string;
    summary?: string | null;
    tags?: string[] | null;
  }>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function JournalSidebar({
  entries,
  selectedDate,
  onSelectDate,
}: JournalSidebarProps) {
  // Group entries by date
  const entriesByDate = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, typeof entries>);

  // Sort dates in descending order
  const sortedDates = Object.keys(entriesByDate).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

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
          const isSelected = date === selectedDate;

          return (
            <div key={date} className="space-y-2">
              <Button
                variant={isSelected ? "default" : "ghost"}
                className={`w-full justify-between ${
                  isSelected
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSelectDate(date)}
              >
                <span>{format(parseISO(date), 'MMM d, yyyy')}</span>
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
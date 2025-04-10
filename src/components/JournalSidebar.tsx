import React from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

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

interface JournalSidebarProps {
  entries: Array<{
    id: string;
    date: string;
    content: string;
    summary?: string;
    tags?: string[];
  }>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  macroSummary?: MacroSummary;
  isGeneratingMacroSummary?: boolean;
}

export function JournalSidebar({
  entries,
  selectedDate,
  onSelectDate,
  macroSummary,
  isGeneratingMacroSummary
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
    <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
      <div className="space-y-4">
        {sortedDates.map((date) => {
          const dateEntries = entriesByDate[date];
          const isSelected = date === selectedDate;
          const dateMacroSummary = isSelected ? macroSummary : undefined;
          const isGenerating = isSelected ? isGeneratingMacroSummary : false;

          return (
            <div key={date} className="space-y-2">
              <Button
                variant={isSelected ? "default" : "ghost"}
                className={`w-full justify-between ${
                  isSelected ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'hover:bg-gray-100'
                }`}
                onClick={() => onSelectDate(date)}
              >
                <div className="flex items-center gap-2">
                  {isSelected && dateMacroSummary && (
                    <span className="text-lg">{dateMacroSummary.moodEmoji}</span>
                  )}
                  <span>{format(parseISO(date), 'MMM d, yyyy')}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {dateEntries.length}
                </span>
              </Button>

              {isSelected && dateMacroSummary && (
                <div className="pl-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-3 w-3 text-purple-500" />
                    <span className="text-gray-600">{dateMacroSummary.keyTakeaway}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 
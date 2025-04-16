'use client';

import React from 'react';
// Removed date-fns imports
// import { format, parseISO } from 'date-fns';
// import { subYears, addDays } from 'date-fns'; 
import { Button } from '@/components/ui/button';
// Remove store import
// import { useJournalStore } from '@/stores/journalStore';
// Remove heatmap import
// import CalendarHeatmap from 'react-calendar-heatmap';
// import 'react-calendar-heatmap/dist/styles.css'; 
// Remove loader import
// import { Loader2 } from 'lucide-react';

// Removed HEATMAP_META_TAGS

export function JournalSidebar() {
  // Removed heatmap state access
  // const { ... } = useJournalStore();
  // Removed date range calculation
  // Removed heatmapValues calculation

  return (
    <div className="w-64 border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 p-4 overflow-y-auto h-full flex flex-col">
      {/* Logo and App Name */}
      <div className="flex items-center mb-6 px-4">
        <img 
          src="https://s3.ca-central-1.amazonaws.com/logojoy/logos/218272791/noBgBlack.png?865367" 
          alt="Thought Keeper Logo" 
          className="h-10 mr-2" // Adjust size as needed
        />
      </div>
      {/* Placeholder for sidebar content */}
      <div className="flex-grow"></div>
      {/* Removed style tag */}
    </div>
  );
} 
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
      {/* Removed Logo Image */}
      {/* <img 
        src="https://s3.ca-central-1.amazonaws.com/logojoy/logos/217739981/noBgColor.png?388025.2999999523"
        alt="ThoughtKeeper Logo" 
        className="w-56 mx-auto flex-shrink-0"
      /> */}
      {/* Placeholder for sidebar content */}
      <div className="flex-grow"></div>
      {/* Removed style tag */}
    </div>
  );
} 
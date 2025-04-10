'use client';

import React from 'react';
import type { Entry } from '@/app/page'; // Assuming Entry type is exported from page

interface StaticAnalysisColumnProps {
  entries: Entry[];
}

export const StaticAnalysisColumn: React.FC<StaticAnalysisColumnProps> = ({
  entries,
}) => {
  return (
    <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0 border-l p-4 overflow-y-auto bg-muted/40">
      <h2 className="text-lg font-semibold mb-4 sticky top-0 bg-transparent pb-2">Analysis</h2> 
      {/* Placeholder Content */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-1">Total Entries</h3>
          <p className="text-2xl font-semibold">{entries.length}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          (More analysis content will go here)
        </div>
        {/* Example: Could list top tags later */}
      </div>
    </aside>
  );
}; 
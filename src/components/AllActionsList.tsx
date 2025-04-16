'use client';

import React, { useMemo } from 'react';
import { useJournalStore } from '@/stores/journalStore';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { Entry, ActionItem } from '@/types';
import { format, parseISO } from 'date-fns';

// Keep these types, they define the structure of the prop
const UNTAGGED_KEY = "_untagged_"; // May not be needed here anymore, but harmless
interface UniqueActionOrigin {
  entryId: string;
  actionIndex: number;
  entryDate: string;
  metaTag: string | null;
}
interface UniqueAction {
  text: string;
  origins: UniqueActionOrigin[];
}

// Define props for the component
interface AllActionsListProps {
    actionsToDisplay: UniqueAction[];
}

export const AllActionsList: React.FC<AllActionsListProps> = ({ actionsToDisplay }) => {
  // Get only needed actions/state from the store
  const markActionCompleted = useJournalStore((state) => state.markActionCompleted);
  const isProcessingEntry = useJournalStore((state) => state.isProcessingEntry);

  const handleCheckedChange = (checked: boolean | 'indeterminate', action: UniqueAction) => {
    if (checked === true) {
      markActionCompleted(action.origins);
    }
  };

  // Use the prop directly
  if (!actionsToDisplay || actionsToDisplay.length === 0) {
    // Display message if the *filtered* list for this tab is empty
    return <p className="text-muted-foreground text-center py-4">No pending actions for this group.</p>; 
  }

  return (
    <div className="space-y-3"> {/* Use regular spacing now, groups handled by parent */} 
      {/* Iterate over the actions passed via props */} 
      {actionsToDisplay.map((action) => {
        const firstOrigin = action.origins[0];
        const key = `${firstOrigin.entryId}-${firstOrigin.actionIndex}`;
        // Find the most recent date for display purposes
        const mostRecentDate = action.origins.reduce((latest, o) => (o.entryDate > latest ? o.entryDate : latest), '1970-01-01');
        
        return (
          <Card key={key}> 
            <CardContent className="p-4 flex items-start gap-3">
              <Checkbox 
                id={`action-${key}`}
                className="mt-1"
                checked={false}
                onCheckedChange={(checked) => handleCheckedChange(checked, action)}
                disabled={isProcessingEntry}
                aria-label={`Mark action '${action.text}' as complete`}
              />
              <div className="flex-1">
                <label htmlFor={`action-${key}`} className="font-medium cursor-pointer">
                  {action.text}
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  From entry on: {format(parseISO(mostRecentDate), 'MMM d, yyyy')}
                  {action.origins.length > 1 && ` (and ${action.origins.length - 1} other entries)`}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}; 
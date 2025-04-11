'use client'; // Needs to be a client component to use hooks

import { format, parseISO } from 'date-fns';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import type { Entry, TagType } from '@/types'; // Import from centralized types
import { useJournalStore } from '@/stores/journalStore'; // Import store
import clsx from 'clsx';
import { useMemo } from 'react'; // Keep useMemo for calculations

// Define Color Palettes locally for now - could be moved to utils or theme file
const metaTagColors = [
  { base: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300', hover: 'hover:bg-purple-200 dark:hover:bg-purple-800/70' },
  { base: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300', hover: 'hover:bg-pink-200 dark:hover:bg-pink-800/70' },
  { base: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', hover: 'hover:bg-red-200 dark:hover:bg-red-800/70' },
  { base: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300', hover: 'hover:bg-rose-200 dark:hover:bg-rose-800/70' },
  { base: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-300', hover: 'hover:bg-fuchsia-200 dark:hover:bg-fuchsia-800/70' },
];
const intentTagColors = [
  { base: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', hover: 'hover:bg-green-200 dark:hover:bg-green-800/70' },
  { base: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-300', hover: 'hover:bg-lime-200 dark:hover:bg-lime-800/70' },
  { base: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300', hover: 'hover:bg-teal-200 dark:hover:bg-teal-800/70' },
  { base: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300', hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-800/70' },
  { base: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300', hover: 'hover:bg-cyan-200 dark:hover:bg-cyan-800/70' },
];
const contentTagColors = [
  { base: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', hover: 'hover:bg-blue-200 dark:hover:bg-blue-800/70' },
  { base: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300', hover: 'hover:bg-indigo-200 dark:hover:bg-indigo-800/70' },
  { base: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300', hover: 'hover:bg-sky-200 dark:hover:bg-sky-800/70' },
  { base: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300', hover: 'hover:bg-violet-200 dark:hover:bg-violet-800/70' },
];

// Define props that are still needed from the parent
interface JournalEntryProps {
  // Remove props coming from store: selectedDate, entries
  // Remove props related to internal state/display logic: onTagClick, tagCounts, highlightedTagColors, generatingTagsForId
  // Keep callbacks for actions triggered by this component
  onDeleteEntry: (id: string) => Promise<void>;
  onEditClick: (entry: Entry) => void;
}

export function JournalEntry({
  onDeleteEntry,
  onEditClick
}: JournalEntryProps) {
  // Get state and actions from the store
  const {
    filteredEntries,
    selectedDate,
    loadingState,
    setFiltersAndFetch,
    allEntries // Needed for tag counts/colors across all entries
  } = useJournalStore();

  // Recalculate tag counts and colors based on ALL entries from the store
  const { tagCounts, highlightedTagColors } = useMemo(() => {
    const counts: { [key: string]: number } = {};
    const colors: { [lowerCaseTag: string]: { base: string; hover: string } } = {};
    let metaColorIndex = 0;
    let intentColorIndex = 0;
    let contentColorIndex = 0;
    const assignedMetaColors: { [key: string]: boolean } = {};
    const assignedIntentColors: { [key: string]: boolean } = {};
    const assignedContentColors: { [key: string]: boolean } = {};

    // Use allEntries from store for counts/colors
    allEntries.forEach(entry => {
      if (entry.meta_tag) {
        const lowerTag = entry.meta_tag.toLowerCase();
        counts[lowerTag] = (counts[lowerTag] || 0) + 1;
        if (counts[lowerTag] >= 2 && !assignedMetaColors[lowerTag]) {
           colors[lowerTag] = metaTagColors[metaColorIndex % metaTagColors.length];
           assignedMetaColors[lowerTag] = true;
           metaColorIndex++;
        }
      }
      if (entry.intent_tag) {
        const lowerTag = entry.intent_tag.toLowerCase();
        counts[lowerTag] = (counts[lowerTag] || 0) + 1;
         if (counts[lowerTag] >= 2 && !assignedIntentColors[lowerTag]) {
           colors[lowerTag] = intentTagColors[intentColorIndex % intentTagColors.length];
           assignedIntentColors[lowerTag] = true;
           intentColorIndex++;
        }
      }
      entry.tags?.forEach(tag => {
        const lowerTag = tag.toLowerCase();
        counts[lowerTag] = (counts[lowerTag] || 0) + 1;
         if (counts[lowerTag] >= 2 && !assignedContentColors[lowerTag]) {
           colors[lowerTag] = contentTagColors[contentColorIndex % contentTagColors.length];
           assignedContentColors[lowerTag] = true;
           contentColorIndex++;
        }
      });
    });
    return { tagCounts: counts, highlightedTagColors: colors };
  }, [allEntries]);

  // Get loading state for individual entries (tag generation)
  const generatingTagsForId = loadingState === 'tagging' ? useJournalStore.getState().allEntries[0]?.id : null; // Simplistic - assumes tagging only happens on newest entry
  // TODO: Need a more robust way to track which specific entry ID is currently generating tags
  // This might require adding a dedicated state property in the Zustand store, e.g., `taggingEntryId: string | null`

  // Filter entries locally based on selectedDate from store
  // const selectedEntries = useMemo(() => {
  //   return filteredEntries.filter(entry => entry.date === selectedDate);
  // }, [filteredEntries, selectedDate]);
  // No need to filter again, `filteredEntries` from store should already be filtered based on search/tags
  // If we want ONLY date filtering, store needs adjusting or do it here.
  // Assuming `filteredEntries` IS the list to display.
  const selectedEntries = filteredEntries;

  // Handle tag clicks by calling store action
  const handleTagClick = (tag: string, type: TagType) => {
    if (type === 'meta') {
      setFiltersAndFetch({ searchQuery: '', activeMetaTag: tag, activeIntentTag: null }); // Clear search, set meta, clear intent
    } else if (type === 'intent') {
      setFiltersAndFetch({ searchQuery: '', activeIntentTag: tag, activeMetaTag: null }); // Clear search, set intent, clear meta
    }
    // Content tags are not clickable on the card based on instructions
    // If they were, logic would go here to update activeContentTags set
  };

  const handleStartEdit = (entry: Entry) => {
    onEditClick(entry); // Call prop passed down from page
  };

  const handleDelete = async (id: string) => {
    // Call prop passed down from page (which calls store action)
    await onDeleteEntry(id);
  };

  const getTagClasses = (tag: string, type: TagType): string => {
    const lowerCaseTag = tag.toLowerCase();
    const isClickable = type === 'meta' || type === 'intent'; // Only meta/intent clickable on cards
    const colorInfo = highlightedTagColors[lowerCaseTag];
    const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
    let colorClasses = 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'; // Default
    let hoverClasses = isClickable ? 'hover:bg-gray-200 dark:hover:bg-gray-700' : '';

    if (colorInfo) {
      colorClasses = colorInfo.base;
      hoverClasses = isClickable ? colorInfo.hover : '';
    }

    return clsx(baseClasses, colorClasses, isClickable && 'cursor-pointer', hoverClasses);
  };

  // Render logic remains largely the same, using selectedEntries derived from store
  return (
    <div className="space-y-4">
      {selectedEntries.length === 0 && <p className="text-center text-gray-500 pt-4">No entries for this selection.</p>}
      {selectedEntries.map((entry) => {
        const isGenerating = generatingTagsForId === entry.id; // Use derived generating state
        return (
          <Card key={entry.id} className="hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700"><CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                {/* Content using dangerouslySetInnerHTML */}
                <div
                  className="prose prose-sm dark:prose-invert max-w-none flex-1 mr-4"
                  dangerouslySetInnerHTML={{ __html: entry.content }}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => handleStartEdit(entry)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleDelete(entry.id)} className="text-red-600">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Tag rendering logic */}
              <div className="flex flex-wrap gap-1 items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                 {isGenerating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                 {/* Meta Tag */}
                 {entry.meta_tag && (() => {
                    const isClickable = true;
                    return (
                      <Badge
                        key={`meta-${entry.meta_tag}`}
                        variant="outline"
                        className={getTagClasses(entry.meta_tag, 'meta')}
                        onClick={isClickable ? (e) => { e.stopPropagation(); handleTagClick(entry.meta_tag!, 'meta'); } : undefined}
                      >
                        {entry.meta_tag.toUpperCase()}
                      </Badge>
                    );
                 })()}
                 {/* Intent Tag */}
                 {entry.intent_tag && (() => {
                    const isClickable = true;
                    return (
                      <Badge
                        key={`intent-${entry.intent_tag}`}
                        variant="outline"
                        className={getTagClasses(entry.intent_tag, 'intent')}
                        onClick={isClickable ? (e) => { e.stopPropagation(); handleTagClick(entry.intent_tag!, 'intent'); } : undefined}
                      >
                        {entry.intent_tag}
                      </Badge>
                    );
                 })()}
                 {/* Content Tags (Not Clickable on Card) */}
                 {entry.tags && entry.tags.length > 0 && (
                    entry.tags.map((tag) => {
                       const isClickable = false;
                       return (
                         <Badge
                           key={tag}
                           variant="outline"
                           className={getTagClasses(tag, 'content')}
                         >
                           {tag}
                         </Badge>
                       );
                    })
                 )}
                 <span className="ml-auto">
                   {entry.created_at && (
                      <>{format(parseISO(entry.created_at), 'p')}</>
                   )}
                 </span>
              </div>
            </CardContent></Card>
        );
      })}
    </div>
  );
}
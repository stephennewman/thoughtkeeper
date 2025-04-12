'use client'; // Needs to be a client component to use hooks

import { format, parseISO } from 'date-fns';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import type { Entry, TagType } from '@/types'; // Import from centralized types
// Remove direct store import if not needed for simple state like isProcessingEntry
// import { useJournalStore } from '@/stores/journalStore';
import clsx from 'clsx';

// Define props for the component
interface JournalEntryProps {
  entry: Entry; // Expect a single entry object
  highlightedTagColors: { [lowerCaseTag: string]: { base: string; hover: string } }; // Pass colors down
  onDeleteEntry: (id: string) => Promise<void>;
  onEditClick: (entry: Entry) => void;
  // Add setFilters to handle tag clicks directly
  setFilters: (filters: Partial<{
    searchQuery: string;
    activeMetaTag: string | null;
    activeIntentTag: string | null;
    activeContentTags: Set<string>;
  }>) => void;
  // Consider passing isProcessing state if needed for the spinner
  // isProcessingEntry?: boolean;
}

export function JournalEntry({
  entry,
  highlightedTagColors,
  onDeleteEntry,
  onEditClick,
  setFilters // Destructure setFilters
}: JournalEntryProps) {
  // Simplified check for tag generation spinner (can be refined)
  // Assumes tags are missing only during initial processing after creation
  const isGenerating = !entry.meta_tag && !entry.intent_tag && !entry.tags && entry.content; // Check content exists

  // Handle tag clicks by calling setFilters from props
  const handleTagClick = (tag: string, type: TagType) => {
    // Reset other filters when a tag is clicked for simplicity
    if (type === 'meta') {
      setFilters({ activeMetaTag: tag, activeIntentTag: null, activeContentTags: new Set(), searchQuery: '' });
    } else if (type === 'intent') {
      setFilters({ activeIntentTag: tag, activeMetaTag: null, activeContentTags: new Set(), searchQuery: '' });
    } else if (type === 'content') {
      setFilters({ activeContentTags: new Set([tag]), activeMetaTag: null, activeIntentTag: null, searchQuery: '' });
    }
  };

  const handleStartEdit = () => {
    onEditClick(entry);
  };

  const handleDelete = async () => {
    // Confirmation logic should ideally live where the action is dispatched (page.tsx)
    // For now, assume confirmation happened before calling onDeleteEntry prop.
    await onDeleteEntry(entry.id);
  };

  // Use highlightedTagColors passed via props
  const getTagClasses = (tag: string, type: TagType): string => {
    const lowerCaseTag = tag.toLowerCase();
    const isClickable = true;
    const colorInfo = highlightedTagColors[lowerCaseTag];
    const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
    let colorClasses = 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    let hoverClasses = isClickable ? 'hover:opacity-80' : '';

    if (colorInfo) {
      colorClasses = colorInfo.base;
      hoverClasses = isClickable ? colorInfo.hover : '';
    }

    return clsx(baseClasses, colorClasses, isClickable && 'cursor-pointer', hoverClasses);
  };

  // Render a single entry
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div
            className="prose prose-sm dark:prose-invert max-w-none flex-1 mr-4"
            dangerouslySetInnerHTML={{ __html: entry.content || '' }} // Ensure content is not null
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleStartEdit}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDelete} className="text-red-600">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-1 items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
          {isGenerating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {/* Meta Tag */}
          {entry.meta_tag && (
            <Badge
              key={`meta-${entry.meta_tag}`}
              variant="outline"
              className={getTagClasses(entry.meta_tag, 'meta')}
              onClick={(e) => { e.stopPropagation(); handleTagClick(entry.meta_tag!, 'meta'); }}
            >
              {entry.meta_tag.toUpperCase()}
            </Badge>
          )}
          {/* Intent Tag */}
          {entry.intent_tag && (
            <Badge
              key={`intent-${entry.intent_tag}`}
              variant="outline"
              className={getTagClasses(entry.intent_tag, 'intent')}
              onClick={(e) => { e.stopPropagation(); handleTagClick(entry.intent_tag!, 'intent'); }}
            >
              {entry.intent_tag}
            </Badge>
          )}
          {/* Content Tags */}
          {entry.tags && entry.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={getTagClasses(tag, 'content')}
              onClick={(e) => { e.stopPropagation(); handleTagClick(tag, 'content'); }}
            >
              {tag}
            </Badge>
          ))}
          <span className="ml-auto">
            {entry.created_at && (
              <>{format(parseISO(entry.created_at), 'p')}</>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
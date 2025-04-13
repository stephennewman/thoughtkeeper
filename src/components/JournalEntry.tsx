'use client'; // Needs to be a client component to use hooks

import { format, parseISO } from 'date-fns';
import { MoreHorizontal, Loader2, Mic, FileText } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import type { Entry, TagType } from '@/types'; // Import from centralized types
import { useJournalStore } from '@/stores/journalStore'; // IMPORT THE STORE
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
  // Get current filter state from store - Select individually
  const activeMetaTag = useJournalStore((state) => state.activeMetaTag);
  const activeIntentTag = useJournalStore((state) => state.activeIntentTag);
  const activeContentTags = useJournalStore((state) => state.activeContentTags);

  // Simplified check for tag generation spinner (can be refined)
  // Assumes tags are missing only during initial processing after creation
  const isGenerating = !entry.meta_tag && !entry.intent_tag && !entry.tags && entry.content; // Check content exists

  // Determine entry type and icon
  const isVoiceNote = entry.entry_type === 'voice';
  const EntryIcon = isVoiceNote ? Mic : FileText;
  const entryTypeText = isVoiceNote ? 'Voice Note' : 'Text Note';

  // Format creation time
  const creationTime = entry.created_at ? format(parseISO(entry.created_at), 'h:mm a') : '';

  // Handle tag clicks by calling setFilters from props - UPDATED LOGIC
  const handleTagClick = (tag: string, type: TagType) => {
    let newMetaTag = activeMetaTag;
    let newIntentTag = activeIntentTag;
    let newContentTags = new Set(activeContentTags);

    if (type === 'meta') {
      newMetaTag = activeMetaTag === tag ? null : tag; // Toggle
    } else if (type === 'intent') {
      newIntentTag = activeIntentTag === tag ? null : tag; // Toggle
    } else { // type === 'content'
      if (newContentTags.has(tag)) {
        newContentTags.delete(tag); // Toggle off
      } else {
        newContentTags.add(tag); // Toggle on - Allow multiple content tags
      }
    }
    
    // Call store action with updated filters, preserving others
    setFilters({
      searchQuery: '', // Always clear search on tag click
      activeMetaTag: newMetaTag,
      activeIntentTag: newIntentTag,
      activeContentTags: newContentTags
    });
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
    const baseClasses = "inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
    let colorClasses = 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    let hoverClasses = isClickable ? 'hover:opacity-80' : '';

    if (colorInfo) {
      colorClasses = colorInfo.base;
      hoverClasses = isClickable ? colorInfo.hover : '';
    }

    return clsx(baseClasses, colorClasses, isClickable && 'cursor-pointer', hoverClasses);
  };

  // Consolidated Footer Separator Component (Optional but cleaner)
  const FooterSeparator = () => <span className="mx-1.5 text-muted-foreground/60">•</span>;

  // Determine if any tags exist for separator logic
  const hasTags = entry.meta_tag || entry.intent_tag || (entry.tags && entry.tags.length > 0);

  // Render a single entry
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border border-border dark:border-border">
      {/* Use relative positioning for the options menu */}
      <CardContent className="p-4 relative">
        {/* Options Menu (Top Right) */}
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground">
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
        
        {/* Content Area (Takes up main space) */}
        <div
          className="prose prose-sm dark:prose-invert max-w-none mb-4" // Increased bottom margin slightly for footer space
          dangerouslySetInnerHTML={{ __html: entry.content || '' }} 
        />

        {/* Footer Area (Consolidated Metadata) */}
        <div className="flex flex-wrap gap-x-2 gap-y-1 items-center text-xs text-muted-foreground border-t border-border pt-2"> 
          {/* Entry Type */}
          <span className="inline-flex items-center gap-1">
            <EntryIcon className="h-3.5 w-3.5" />
            <span>{entryTypeText}</span>
          </span>

          {/* Time */}
          <FooterSeparator />
          <span>{creationTime}</span>

          {/* Separator only if tags exist */}
          {hasTags && <FooterSeparator />}

          {/* Tag Spinner */}
          {isGenerating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}

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
        </div>
      </CardContent>
    </Card>
  );
}
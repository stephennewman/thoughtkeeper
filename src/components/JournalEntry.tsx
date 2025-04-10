import React from 'react';
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "./RichTextEditor";
import { format, parseISO } from 'date-fns';
import { Pencil, Save, X, Trash2, Loader2, MoreVertical } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import clsx from 'clsx';

// Define Entry type based on Supabase structure
interface Entry {
  id: string;
  created_at: string;
  date: string;
  content: string;
  summary?: string | null;
  tags?: string[] | null;
  meta_tag?: string | null;
  intent_tag?: string | null;
}

// Define tag types here too (or move to shared file)
type TagType = 'meta' | 'intent' | 'content';

// Define TagColorMap again or import if moved to a shared types file
interface TagColorMap {
  [lowerCaseTag: string]: { base: string; hover: string };
}

interface JournalEntryProps {
  selectedDate: string;
  entries: Array<Entry>;
  onUpdateEntry: (id: string, content: string) => void;
  onDeleteEntry: (id: string) => void;
  generatingTagsForId?: string | null;
  onTagClick?: (tag: string, type: TagType) => void;
  tagCounts?: { [key: string]: number };
  highlightedTagColors?: TagColorMap;
  onEditClick: (entry: Entry) => void;
}

export function JournalEntry({
  selectedDate,
  entries,
  onUpdateEntry,
  onDeleteEntry,
  generatingTagsForId,
  onTagClick,
  tagCounts = {},
  highlightedTagColors = {},
  onEditClick,
}: JournalEntryProps) {
  const selectedEntries = entries.filter(entry => entry.date === selectedDate);

  const handleStartEdit = (entry: Entry) => {
    onEditClick(entry);
  };

  const handleDelete = (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      onDeleteEntry(entryId);
    }
  };

  const getTagClasses = (tag: string, type: TagType): string => {
      const lowerTag = tag.toLowerCase();
      const count = tagCounts[lowerTag] || 0;
      const isHighlighted = count > 1;
      const assignedColor = highlightedTagColors[lowerTag];
      const canClick = !!onTagClick; 

      if (isHighlighted && assignedColor && canClick) {
          return clsx(assignedColor.base, assignedColor.hover, 'transition-colors');
      } else if (isHighlighted && canClick) {
          return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-800/70 transition-colors';
      } else {
          return 'bg-muted text-muted-foreground opacity-75 cursor-default';
      }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="space-y-4">
        {selectedEntries.map((entry) => {
          const isGenerating = generatingTagsForId === entry.id;

          return (
            <div 
              key={entry.id} 
              className={clsx(
                "border rounded-lg p-4 group transition-colors", 
                "hover:bg-accent/70 dark:hover:bg-accent/50",
                 "bg-background text-card-foreground border-border/60"
              )}
              style={{ cursor: 'default' }}
            >
              <>
                  <div
                    className="prose dark:prose-invert prose-sm max-w-none mb-4"
                    dangerouslySetInnerHTML={{ __html: entry.content }}
                  />

                  <div className="mt-3 pt-3 border-t flex flex-wrap justify-between items-center gap-x-4 gap-y-2">
                    <div className="flex flex-wrap items-center gap-1 order-1 flex-grow min-w-0">
                      {entry.meta_tag && (() => {
                        const lowerTag = entry.meta_tag.toLowerCase();
                        const isClickable = (tagCounts[lowerTag] || 0) > 1 && !!onTagClick;
                        const TagComponent = isClickable ? 'button' : 'span';
                        return (
                          <TagComponent
                            key={`meta-${entry.meta_tag}`}
                            onClick={isClickable ? (e) => { 
                              e.stopPropagation(); 
                              console.log('[Debug JournalEntry] Clicking Meta Tag:', entry.meta_tag);
                              onTagClick!(entry.meta_tag!, 'meta'); 
                            } : undefined}
                            className={clsx(
                              "px-1.5 py-0.5 rounded text-xs font-medium uppercase", 
                              getTagClasses(entry.meta_tag, 'meta') 
                            )}
                            disabled={!isClickable}
                          >
                            {entry.meta_tag}
                          </TagComponent>
                        );
                      })()}

                      {entry.intent_tag && (() => {
                         const lowerTag = entry.intent_tag.toLowerCase();
                         const isClickable = (tagCounts[lowerTag] || 0) > 1 && !!onTagClick;
                         const TagComponent = isClickable ? 'button' : 'span';
                        return (
                           <TagComponent
                            key={`intent-${entry.intent_tag}`}
                            onClick={isClickable ? (e) => { e.stopPropagation(); onTagClick!(entry.intent_tag!, 'intent'); } : undefined}
                            className={clsx(
                              "px-1.5 py-0.5 rounded text-xs font-medium", 
                              getTagClasses(entry.intent_tag, 'intent') 
                            )}
                            disabled={!isClickable}
                          >
                            {entry.intent_tag}
                          </TagComponent>
                        );
                      })()}
                      
                      <div className="inline-flex flex-wrap gap-1">
                        {isGenerating ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          entry.tags && entry.tags.length > 0 && (
                            entry.tags.map((tag) => {
                              const isClickable = (tagCounts[tag] || 0) > 1 && !!onTagClick;
                              const TagComponent = isClickable ? 'button' : 'span';
                              return (
                                <TagComponent
                                  key={tag}
                                  onClick={isClickable ? (e) => { e.stopPropagation(); onTagClick!(tag, 'content'); } : undefined}
                                  className={clsx(
                                    "px-1.5 py-0.5 rounded text-xs font-medium", 
                                    getTagClasses(tag, 'content') 
                                  )}
                                  disabled={!isClickable}
                                >
                                  {tag}
                                </TagComponent>
                              );
                            })
                          )
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 order-2 flex-shrink-0">
                      {entry.created_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(entry.created_at), 'p')}
                        </p>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 data-[state=open]:bg-muted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem 
                            onSelect={() => handleStartEdit(entry)} 
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onSelect={() => handleDelete(entry.id)}
                          >
                             <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
              </>
            </div>
          );
        })}
      </div>
    </div>
  );
} 
import React from 'react';
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "./RichTextEditor";
import { format, parseISO } from 'date-fns';
import { Pencil, Save, X, Trash2, Loader2 } from 'lucide-react';
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

// Type definition for editor state (ensure consistency if moved)
interface EditorState {
  html: string;
  text: string;
}

interface JournalEntryProps {
  selectedDate: string;
  content: string; // Initial HTML content for new entry editor
  onChange: (state: EditorState) => void; // Handler for new entry editor changes
  onSave: () => void; // onSave now takes no arguments
  entries: Array<Entry>;
  onUpdateEntry: (id: string, content: string) => void;
  onDeleteEntry: (id: string) => void;
  isSavingEntry?: boolean;
  generatingTagsForId?: string | null;
  onTagClick?: (tag: string) => void;
  tagCounts?: { [key: string]: number };
}

export function JournalEntry({
  selectedDate,
  content,
  onChange,
  onSave,
  entries,
  onUpdateEntry,
  onDeleteEntry,
  isSavingEntry,
  generatingTagsForId,
  onTagClick,
  tagCounts,
}: JournalEntryProps) {
  // State for editing existing entries (still uses string for HTML)
  const [editEntryContent, setEditEntryContent] = React.useState('');
  const [editingEntryId, setEditingEntryId] = React.useState<string | null>(null);
  const selectedEntries = entries.filter(entry => entry.date === selectedDate);

  const handleSaveClick = () => {
    // Call the onSave passed from parent, which now reads state
    onSave(); 
  };

  const handleStartEdit = (entry: typeof selectedEntries[0]) => {
    setEditingEntryId(entry.id);
    setEditEntryContent(entry.content);
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditEntryContent('');
  };

  const handleSaveEdit = (entryId: string) => {
    if (!editEntryContent.trim()) return;
    onUpdateEntry(entryId, editEntryContent);
    setEditingEntryId(null);
    setEditEntryContent('');
  };

  const handleDelete = (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      onDeleteEntry(entryId);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">
          {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
        </h2>
        <p className="text-gray-500">{selectedEntries.length} entries for this date</p>
      </div>

      <div className="flex flex-col gap-4">
        <RichTextEditor
          content={content} // Use the passed-in initial HTML
          onChange={onChange} // Use the passed-in handler
          placeholder="Write your journal entry here..."
        />
        <Button onClick={handleSaveClick} className="w-fit" disabled={isSavingEntry /* Add check for empty state later? */}>
          Save Entry
        </Button>
      </div>

      <div className="space-y-4">
        {selectedEntries.map((entry) => {
          const hasMultipleContentTags = entry.tags && entry.tags.length > 1;
          // Example: Highlight based on meta tag presence?
          const hasMetaTag = !!entry.meta_tag;
          
          return (
            <div 
              key={entry.id} 
              className={clsx(
                "border rounded-lg p-4 group transition-colors", 
                // Keep existing hover style for non-editing
                editingEntryId !== entry.id ? "hover:bg-accent/70 dark:hover:bg-accent/50" : "",
                // Base style - highlight if it has a meta tag?
                hasMetaTag ? "border-purple-400 dark:border-purple-600 bg-purple-50/30 dark:bg-purple-900/10" : "bg-background text-card-foreground border-border/60"
              )}
              onClick={editingEntryId !== entry.id ? () => handleStartEdit(entry) : undefined}
              style={{ cursor: editingEntryId !== entry.id ? 'pointer' : 'default' }}
            >
              {editingEntryId === entry.id ? (
                <div className="space-y-4">
                  <RichTextEditor
                    content={editEntryContent}
                    onChange={(state) => setEditEntryContent(state.html)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit(entry.id);
                      }}
                      className="flex items-center gap-2"
                      disabled={!editEntryContent.trim()}
                    >
                      <Save className="h-4 w-4" />
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="prose dark:prose-invert prose-sm max-w-none mb-4"
                    dangerouslySetInnerHTML={{ __html: entry.content }}
                  />

                  <div className="mt-3 pt-3 border-t flex flex-wrap justify-between items-center gap-x-4 gap-y-2">
                    <div className="flex flex-wrap items-center gap-1 order-1 flex-grow min-w-0">
                      {entry.meta_tag && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                          {entry.meta_tag}
                        </span>
                      )}
                      {entry.intent_tag && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                          {entry.intent_tag}
                        </span>
                      )}
                      <div className="inline-flex flex-wrap gap-1">
                        {generatingTagsForId === entry.id || (generatingTagsForId === 'new' && entry.id === entries[0]?.id) ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Generating tags...
                          </div>
                        ) : (
                          entry.tags && entry.tags.length > 0 && (
                            entry.tags.map((tag) => {
                              const count = tagCounts?.[tag] || 0;
                              const isClickable = count > 1 && !!onTagClick;
                              
                              return isClickable ? (
                                <button
                                  key={tag}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTagClick && onTagClick(tag);
                                  }}
                                  className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors"
                                >
                                  {tag}
                                </button>
                              ) : (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs opacity-75"
                                >
                                  {tag}
                                </span>
                              );
                            })
                          )
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 order-2 flex-shrink-0">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(entry);
                          }}
                          className="h-7 w-7 p-1"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(entry.id);
                          }}
                          className="h-7 w-7 p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {entry.created_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(entry.created_at), 'p')}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 
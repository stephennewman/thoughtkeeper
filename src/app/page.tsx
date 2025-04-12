'use client';

import { useEffect, useRef, useMemo, Fragment } from 'react';
import { format, parseISO } from 'date-fns';
import { useInView } from 'react-intersection-observer';
import { JournalSidebar, JournalEntry, EntryEditorDialog, StaticAnalysisColumn } from '@/components';
import { X, Loader2, Plus, Info } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJournalStore } from '@/stores/journalStore';
import { clsx } from 'clsx';
import type { Entry } from '@/types';

export default function Home() {
  const {
    searchQuery,
    activeMetaTag,
    activeIntentTag,
    activeContentTags,
    loadedEntries,
    displayEntries,
    hasMoreEntries,
    isLoadingInitial,
    isLoadingMore,
    isProcessingEntry,
    errorState,
    isEditorOpen,
    editingEntry,
    highlightedTagColors,
    loadInitialEntries,
    loadMoreEntries,
    setFilters,
    deleteEntry,
    openEditorDialog,
  } = useJournalStore();

  const mainContentScrollRef = useRef<HTMLDivElement>(null);
  const { ref: intersectionObserverRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  useEffect(() => {
    loadInitialEntries();
  }, [loadInitialEntries]);

  useEffect(() => {
    if (inView && !isLoadingInitial && !isLoadingMore && hasMoreEntries) {
      loadMoreEntries();
    }
  }, [inView, isLoadingInitial, isLoadingMore, hasMoreEntries, loadMoreEntries]);

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      await deleteEntry(id);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ searchQuery: event.target.value });
  };

  const handleAddClick = () => {
    openEditorDialog();
  };

  const handleEditClick = (entry: Entry) => {
    openEditorDialog(entry);
  };

  const groupedEntries = useMemo(() => {
    return displayEntries.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      acc[date].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return acc;
    }, {} as Record<string, Entry[]>);
  }, [displayEntries]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedEntries).sort((a, b) => parseISO(b).getTime() - parseISO(a).getTime());
  }, [groupedEntries]);

  const isAnyFilterActive = !!searchQuery || !!activeMetaTag || !!activeIntentTag || activeContentTags.size > 0;

  return (
    <div className="flex flex-col h-screen">
      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-y-hidden p-4 gap-2">
          <div className="flex justify-between items-center flex-shrink-0 gap-4 border-b pb-2 h-12">
            <div className="flex items-center flex-shrink-0">
              <img 
                src="https://s3.ca-central-1.amazonaws.com/logojoy/logos/217739981/noBgColor.png?388025.2999999523"
                alt="ThoughtKeeper Logo" 
                className="h-8 w-auto mr-4"
              />
              <div className="flex items-center gap-2">
                {errorState && (
                  <p className="text-red-600 text-sm">Error: {errorState}</p>
                )}
                {(isLoadingInitial || isProcessingEntry) && !errorState && (
                  <div className="flex items-center justify-start">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    {isProcessingEntry && <span className="text-sm text-muted-foreground ml-2">Processing...</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Input
                type="search"
                placeholder="Search loaded entries..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full max-w-xs hidden sm:block"
              />
              <Button
                onClick={handleAddClick}
                size="sm"
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity flex-shrink-0"
                disabled={isProcessingEntry}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Entry
              </Button>
            </div>
          </div>

          {isAnyFilterActive && (
              <div className="flex flex-col gap-1 flex-shrink-0 p-2 rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-800/60 dark:bg-yellow-900/20">
                 <div className="flex items-center gap-1 text-xs font-semibold text-yellow-800 dark:text-yellow-300">
                      <Info className="h-3 w-3" />
                      <span>Filtering applied only to {loadedEntries.length} loaded entries.</span>
                  </div>
                  <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-sm font-medium mr-1">Active:</span>
                      {activeMetaTag && (() => {
                          const lowerTag = activeMetaTag.toLowerCase();
                          const colorInfo = highlightedTagColors[lowerTag];
                          const activeClasses = colorInfo ? colorInfo.base : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
                          const hoverClasses = colorInfo ? colorInfo.hover : 'hover:bg-purple-200 dark:hover:bg-purple-800/70';
                          return (
                          <Badge variant="secondary" className={clsx("cursor-pointer", activeClasses, hoverClasses)} onClick={() => setFilters({ activeMetaTag: null })}>
                              {activeMetaTag.toUpperCase()}
                              <X className="ml-1 h-3 w-3" />
                          </Badge>
                          );
                      })()}
                      {activeIntentTag && (() => {
                          const lowerTag = activeIntentTag.toLowerCase();
                          const colorInfo = highlightedTagColors[lowerTag];
                          const activeClasses = colorInfo ? colorInfo.base : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
                          const hoverClasses = colorInfo ? colorInfo.hover : 'hover:bg-green-200 dark:hover:bg-green-800/70';
                          return (
                          <Badge variant="secondary" className={clsx("cursor-pointer", activeClasses, hoverClasses)} onClick={() => setFilters({ activeIntentTag: null })}>
                              {activeIntentTag}
                              <X className="ml-1 h-3 w-3" />
                          </Badge>
                          );
                      })()}
                      {Array.from(activeContentTags).map(tag => {
                          const lowerTag = tag.toLowerCase();
                          const colorInfo = highlightedTagColors[lowerTag];
                          const activeClasses = colorInfo ? colorInfo.base : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
                          const hoverClasses = colorInfo ? colorInfo.hover : 'hover:bg-blue-200 dark:hover:bg-blue-800/70';
                          return (
                          <Badge key={tag} variant="secondary" className={clsx("cursor-pointer", activeClasses, hoverClasses)} onClick={() => {
                              const newTags = new Set(activeContentTags);
                              newTags.delete(tag);
                              setFilters({ activeContentTags: newTags });
                          }}>
                              {tag}
                              <X className="ml-1 h-3 w-3" />
                          </Badge>
                          );
                      })}
                       {(!!activeMetaTag || !!activeIntentTag || activeContentTags.size > 0) && (
                          <Button variant="ghost" size="sm" className="h-5 px-1 text-muted-foreground hover:text-foreground" onClick={() => setFilters({ activeMetaTag: null, activeIntentTag: null, activeContentTags: new Set(), searchQuery: '' })}>
                              Clear All
                          </Button>
                      )}
                  </div>
              </div>
          )}

          <div ref={mainContentScrollRef} className="flex-grow overflow-y-auto pr-2 space-y-4">
            {isLoadingInitial && (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoadingInitial && !errorState && (
              <>
                {displayEntries.length === 0 && loadedEntries.length > 0 && isAnyFilterActive && (
                  <p className="pt-4 text-center text-gray-500">No loaded entries found matching filters.</p>
                )}
                {displayEntries.length === 0 && loadedEntries.length === 0 && (
                   <p className="pt-4 text-center text-gray-500">No entries yet. Click 'Add Entry' to start!</p>
                )}

                 {sortedDates.map(date => (
                  <Fragment key={date}>
                      <h2 className="sticky top-0 z-10 bg-background py-1 px-4 font-semibold text-sm text-left">
                          {format(parseISO(date), 'MMMM dd, yyyy')}
                      </h2>
                      <div className="space-y-3">
                      {groupedEntries[date].map(entry => (
                          <JournalEntry
                              key={entry.id}
                              entry={entry}
                              highlightedTagColors={highlightedTagColors}
                              setFilters={setFilters}
                              onDeleteEntry={handleDeleteEntry}
                              onEditClick={handleEditClick}
                          />
                      ))}
                      </div>
                  </Fragment>
                  ))}

                {isLoadingMore && (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!hasMoreEntries && displayEntries.length > 0 && (
                  <p className="pt-4 pb-4 text-center text-sm text-gray-500">
                    {isAnyFilterActive ? "End of loaded entries matching filters." : "End of journal."}
                  </p>
                )}

                <div ref={intersectionObserverRef} style={{ height: '1px' }} />
              </>
            )}
          </div>
        </div>

        <StaticAnalysisColumn />
      </main>
      {isEditorOpen && (
          <EntryEditorDialog
            isOpen={isEditorOpen}
            selectedDate={format(new Date(), 'yyyy-MM-dd')}
            initialEntry={editingEntry}
          />
      )}
    </div>
  );
} 
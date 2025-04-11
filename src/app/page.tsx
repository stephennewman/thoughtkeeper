'use client';

import { useEffect, useRef, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { JournalSidebar, JournalEntry, EntryEditorDialog, StaticAnalysisColumn } from '@/components';
import { X, Loader2, Plus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJournalStore } from '@/stores/journalStore';
import { clsx } from 'clsx';

export default function Home() {
  const {
    filteredEntries,
    allEntries,
    selectedDate,
    searchQuery,
    activeMetaTag,
    activeIntentTag,
    activeContentTags,
    loadingState,
    errorState,
    isEditorOpen,
    editingEntry,
    fetchInitialEntries,
    setFiltersAndFetch,
    deleteEntry,
    openEditorDialog,
    closeEditorDialog
  } = useJournalStore();

  const mainContentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialEntries();
  }, [fetchInitialEntries]);

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      await deleteEntry(id);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiltersAndFetch({ searchQuery: event.target.value });
  };

  const handleAddClick = () => {
    openEditorDialog();
  };

  const handleEditClick = (entry: import('@/types').Entry) => {
    openEditorDialog(entry);
  };

  const handleSelectDate = (date: string) => {
    useJournalStore.setState({ selectedDate: date });
    setFiltersAndFetch({});
    mainContentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isLoading = loadingState === 'initial' || loadingState === 'filtered';
  const isProcessingEntry = loadingState === 'adding' || loadingState === 'tagging' || loadingState === 'updating' || loadingState === 'deleting';

  console.log('[Debug] Store State:', useJournalStore.getState());

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block border-r">
          <JournalSidebar
            // entries={allEntries}
            // selectedDate={selectedDate}
            // onSelectDate={handleSelectDate}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-y-hidden p-4 gap-2">
          <div className="flex justify-between items-center mb-2 flex-shrink-0 gap-4">
              <div className="flex items-center gap-2 h-8 flex-shrink-0">
                {errorState && 
                    <p className="text-red-600 text-sm">Error: {errorState}</p>
                }
                {loadingState === 'initial' && !errorState && (
                     <div className="flex items-center justify-start h-8"> 
                         <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                     </div>
                 )}
              </div>
             <div className="flex items-center gap-2">
                 <Input
                    type="search"
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full max-w-xs"
                  />
                 <Button 
                    onClick={handleAddClick} 
                    size="sm" 
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity flex-shrink-0"
                 > 
                    <Plus className="mr-2 h-4 w-4" /> Add Entry
                 </Button>
             </div>
          </div>

          {/* Active Filter Badges Area */}
          {(activeMetaTag || activeIntentTag || activeContentTags.size > 0) && (
            <div className="flex flex-wrap gap-1 mb-2 flex-shrink-0">
              <span className="text-sm font-medium mr-1">Active Filters:</span>
              {activeMetaTag && (() => {
                const lowerTag = activeMetaTag.toLowerCase();
                const colorInfo = useJournalStore.getState().highlightedTagColors[lowerTag];
                const activeClasses = colorInfo ? colorInfo.base : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
                const hoverClasses = colorInfo ? colorInfo.hover : 'hover:bg-purple-200 dark:hover:bg-purple-800/70';
                return (
                  <Badge variant="secondary" className={clsx(activeClasses, hoverClasses)}>
                    {activeMetaTag.toUpperCase()}
                    <button 
                      onClick={() => setFiltersAndFetch({ activeMetaTag: null })} 
                      className="ml-1.5 p-0.5 rounded-full hover:bg-purple-300 dark:hover:bg-purple-700 transition-colors"
                      aria-label={`Remove ${activeMetaTag} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })()}
              {activeIntentTag && (() => {
                const lowerTag = activeIntentTag.toLowerCase();
                const colorInfo = useJournalStore.getState().highlightedTagColors[lowerTag];
                const activeClasses = colorInfo ? colorInfo.base : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
                const hoverClasses = colorInfo ? colorInfo.hover : 'hover:bg-green-200 dark:hover:bg-green-800/70';
                return (
                   <Badge variant="secondary" className={clsx(activeClasses, hoverClasses)}>
                    {activeIntentTag}
                    <button 
                      onClick={() => setFiltersAndFetch({ activeIntentTag: null })} 
                      className="ml-1.5 p-0.5 rounded-full hover:bg-green-300 dark:hover:bg-green-700 transition-colors"
                      aria-label={`Remove ${activeIntentTag} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
               })()}
              {Array.from(activeContentTags).map(tag => {
                 const lowerTag = tag.toLowerCase(); // Content tags already lowercase, but be sure
                 const colorInfo = useJournalStore.getState().highlightedTagColors[lowerTag];
                 const activeClasses = colorInfo ? colorInfo.base : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
                 const hoverClasses = colorInfo ? colorInfo.hover : 'hover:bg-blue-200 dark:hover:bg-blue-800/70';
                 return (
                   <Badge key={tag} variant="secondary" className={clsx(activeClasses, hoverClasses)}>
                    {tag}
                    <button 
                      onClick={() => {
                        const newTags = new Set(activeContentTags);
                        newTags.delete(tag);
                        setFiltersAndFetch({ activeContentTags: newTags });
                      }}
                      className="ml-1.5 p-0.5 rounded-full hover:bg-blue-300 dark:hover:bg-blue-700 transition-colors"
                      aria-label={`Remove ${tag} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
               })}
            </div>
          )}

          <div ref={mainContentScrollRef} className="flex-grow overflow-y-auto pr-2">
            {isLoading && (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}
            {!isLoading && !errorState && (
                filteredEntries.length === 0 && (searchQuery || activeMetaTag || activeIntentTag || activeContentTags.size > 0) ? (
                    <p className="pt-4 text-center text-gray-500">No entries found matching filters.</p>
                ) : filteredEntries.length === 0 ? (
                    <p className="pt-4 text-center text-gray-500">No entries yet. Click the '+' button to add one!</p>
                ) : (
                    <JournalEntry
                        // entries={displayEntries}
                        onDeleteEntry={handleDeleteEntry}
                        onEditClick={handleEditClick}
                    />
                )
            )}
          </div>
        </div>

        <StaticAnalysisColumn
        />

      </main>
      {isEditorOpen && (
          <EntryEditorDialog 
            isOpen={isEditorOpen}
            selectedDate={selectedDate}
            initialEntry={editingEntry}
          />
      )}
    </div>
  );
} 
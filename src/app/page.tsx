'use client';

import { useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { JournalSidebar, JournalEntry, EntryEditorDialog, StaticAnalysisColumn } from '@/components';
import { X, Loader2, Plus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJournalStore } from '@/stores/journalStore';

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
            entries={allEntries}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
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
                        selectedDate={selectedDate}
                        entries={filteredEntries}
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
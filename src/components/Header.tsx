'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Menu, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

// Remove unused icons
// import { Settings, Sun, Moon } from 'lucide-react';

// Import necessary types 
import type { Entry, MacroSummary } from '@/app/page'; // Use named import
import { JournalSidebar } from './JournalSidebar'; // Import JournalSidebar

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Sidebar Props
  entries: Entry[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  macroSummary?: MacroSummary | null;
  isGeneratingMacroSummary?: boolean;
  onGenerateMacroSummary?: () => void;
  // Callbacks managed by page.tsx for Dialog
  onEntryAdded: (newEntry: Entry) => void; 
  onEntryTagsUpdated: (entryId: string, updatedTags: Partial<Entry>) => void;
  generatingTagsForId: string | null; 
  // Callback to trigger modal opening in parent
  onAddClick: () => void; 
}

export const Header: React.FC<HeaderProps> = ({ 
  searchQuery, 
  onSearchChange,
  entries,
  selectedDate,
  onSelectDate,
  macroSummary,
  isGeneratingMacroSummary,
  onGenerateMacroSummary,
  // Destructure the added props (even if not directly used in Header JSX)
  onEntryAdded, 
  onEntryTagsUpdated,
  generatingTagsForId,
  onAddClick, 
 }) => {
  // REMOVE state for dialog - managed by parent
  // const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    // Keep header structure, but remove Dialog and AddEntryDialog rendering
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30 w-full backdrop-blur transition-all">
      {/* Mobile Menu Button - Hidden on large screens (lg) */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 lg:hidden"
            aria-label="Toggle sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0 w-64"> 
          <JournalSidebar
            entries={entries}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            macroSummary={macroSummary ?? undefined}
            isGeneratingMacroSummary={isGeneratingMacroSummary}
            onGenerateMacroSummary={onGenerateMacroSummary}
          />
        </SheetContent>
      </Sheet>

      {/* App Title - Hidden on small screens? Optional */} 
      <div className="flex-none hidden lg:block">
        <h1 className="font-semibold text-lg md:text-xl">ThoughtKeeper</h1>
      </div>

      {/* Search Input */}
      <div className="flex-1 px-4 md:px-8 lg:px-16">
        <Input
          type="search"
          placeholder="Search entries..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-2 flex-none">
        {/* Add New Entry Button - Triggers callback */}
        <Button 
          variant="outline" 
          size="icon" 
          className="ml-auto" 
          aria-label="Add new journal entry"
          onClick={onAddClick} // Call the passed callback
        >
          <Plus className="h-5 w-5" />
        </Button>
        {/* Placeholder for future User Profile/Auth button */}
      </div>
    </header>
    // REMOVE AddEntryDialog rendering from here
  );
}; 
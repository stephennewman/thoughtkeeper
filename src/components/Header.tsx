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
import type { Entry, MacroSummary } from '@/types'; // Import from centralized types
import { JournalSidebar } from './JournalSidebar'; // Import JournalSidebar

interface HeaderProps {
  // Remove props previously passed to JournalSidebar
  // entries: Entry[];
  // selectedDate: string;
  // onSelectDate: (date: string) => void;

  // Remove props previously passed to JournalSidebar (they are unused here now)
  // macroSummary?: MacroSummary | null;
  // isGeneratingMacroSummary?: boolean;
  // onGenerateMacroSummary?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  // Remove destructured props
  // entries,
  // selectedDate,
  // onSelectDate,
  // macroSummary,
  // isGeneratingMacroSummary,
  // onGenerateMacroSummary,
 }) => {

  return (
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
            // entries={entries} // Removed
            // selectedDate={selectedDate} // Removed
            // onSelectDate={onSelectDate} // Removed
          />
        </SheetContent>
      </Sheet>

      {/* App Title - Ensure sufficient weight */}
      <div className="flex-none hidden lg:block ml-[-1rem] lg:ml-[-1.5rem]">
        <h1 className="font-semibold text-xl">ThoughtKeeper</h1>
      </div>

      {/* Add flex-1 spacer to push remaining items right if needed */}
      <div className="flex-1"></div>
      
      {/* Global Actions */}
      <div className="flex items-center gap-2 flex-none">
        {/* Placeholder for future User Profile/Auth button */}
      </div>
    </header>
  );
}; 
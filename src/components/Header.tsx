'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// Remove unused icons
// import { Settings, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ searchQuery, onSearchChange }) => {

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30 w-full backdrop-blur transition-all">
      {/* App Title */}
      <div className="flex-none">
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

      {/* Global Actions (Empty for now) */}
      <div className="flex items-center gap-2 flex-none">
        {/* Theme Toggle Button Removed */}
        {/* Settings Button Removed */}
        {/* Placeholder for future User Profile/Auth button */}
      </div>
    </header>
  );
}; 
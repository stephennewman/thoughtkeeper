'use client';

import React, { useState } from 'react';
import { ChevronsUpDown, Tag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import clsx from 'clsx';

interface MetaTagEditorProps {
  entryId: string;
  currentTag: string | null;
  uniqueTags: Set<string>;
  onUpdateTag: (entryId: string, newTag: string | null) => Promise<void>;
}

export function MetaTagEditor({ 
  entryId, 
  currentTag, 
  uniqueTags,
  onUpdateTag,
}: MetaTagEditorProps) {

  const [isMetaPopoverOpen, setIsMetaPopoverOpen] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (selectedValue === '__remove__') {
      onUpdateTag(entryId, null);
    } else {
      onUpdateTag(entryId, selectedValue);
    }
    setIsMetaPopoverOpen(false);
  };

  const handleSaveNewTag = () => {
    const trimmedValue = newTagValue.trim();
    if (trimmedValue) {
      onUpdateTag(entryId, trimmedValue);
      setNewTagValue('');
      setIsMetaPopoverOpen(false);
    }
  };
  
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveNewTag();
    }
  };

  return (
    <Popover open={isMetaPopoverOpen} onOpenChange={setIsMetaPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isMetaPopoverOpen}
          className={clsx(
            "h-auto px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 justify-between w-[150px] truncate",
            currentTag 
              ? "border-input"
              : "border-dashed text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {currentTag ? (
            currentTag.toUpperCase()
          ) : (
            <span className="inline-flex items-center gap-1">
              <Tag className="h-3 w-3" /> Add Meta
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <div className="p-2 space-y-2">
          <div>
            <Label htmlFor={`select-meta-${entryId}`} className="text-xs text-muted-foreground px-1">
              Select Existing
            </Label>
            <select 
              id={`select-meta-${entryId}`}
              value={currentTag || '__none__'}
              onChange={handleSelectChange}
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                "mt-1"
              )}
            >
              {!currentTag && <option value="__none__" disabled>(No Tag)</option>}
              <option value="__remove__">(Remove Tag)</option>
              {(uniqueTags instanceof Set ? Array.from(uniqueTags) : []).sort().map((tag) => (
                 <option key={tag} value={tag}>
                   {tag}
                 </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-popover px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor={`create-meta-${entryId}`} className="text-xs text-muted-foreground px-1">
              Create New Tag
            </Label>
            <div className="flex items-center space-x-1 mt-1">
              <Input 
                id={`create-meta-${entryId}`}
                type="text"
                placeholder="New tag name..."
                value={newTagValue}
                onChange={(e) => setNewTagValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="h-9"
              />
              <Button size="sm" onClick={handleSaveNewTag} className="h-9">Save</Button>
            </div>
          </div>

        </div>
      </PopoverContent>
    </Popover>
  );
} 
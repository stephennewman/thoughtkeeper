'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Entry, TagType } from '@/types'; // Import from centralized types
import { Badge } from '@/components/ui/badge'; // Import Badge
import { X } from 'lucide-react'; // Import X icon
import { useJournalStore } from '@/stores/journalStore'; // Import the store
import clsx from 'clsx';

// Helper function to get top N tags from a counts object
const getTopTags = (counts: { [tag: string]: number }, topN: number): [string, number][] => {
  return Object.entries(counts)
    // .filter(([, count]) => count > 1) // Removed: Show all tags regardless of count for testing
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, topN);
};

export const StaticAnalysisColumn: React.FC = () => {
  // Get state and actions from the store
  const {
    displayEntries,
    activeMetaTag,
    activeIntentTag,
    activeContentTags,
    setFilters,
    highlightedTagColors
  } = useJournalStore();

  const topN = 5; // Number of top tags to display

  // Memoized calculation for top tags - Uses displayEntries from store
  const { topMetaTags, topIntentTags, topContentTags } = useMemo(() => {
    const metaCounts: { [tag: string]: number } = {};
    const intentCounts: { [tag: string]: number } = {};
    const contentCounts: { [tag: string]: number } = {};

    displayEntries.forEach(entry => { // Use displayEntries from store
      // Count Meta Tags (preserve case)
      if (entry.meta_tag) {
        metaCounts[entry.meta_tag] = (metaCounts[entry.meta_tag] || 0) + 1;
      }
      // Count Intent Tags (preserve case)
      if (entry.intent_tag) {
        intentCounts[entry.intent_tag] = (intentCounts[entry.intent_tag] || 0) + 1;
      }
      // Count Content Tags (already lowercase)
      entry.tags?.forEach(tag => {
        contentCounts[tag] = (contentCounts[tag] || 0) + 1;
      });
    });

    return {
      topMetaTags: getTopTags(metaCounts, topN),
      topIntentTags: getTopTags(intentCounts, topN),
      topContentTags: getTopTags(contentCounts, topN),
    };
    // Dependency is now displayEntries from store
  }, [displayEntries, topN]);

  // Check if tag is active based on store state
  const isTagActive = (tag: string, type: TagType): boolean => {
    if (type === 'meta') return tag === activeMetaTag;
    if (type === 'intent') return tag === activeIntentTag;
    if (type === 'content') return activeContentTags.has(tag);
    return false;
  };

  // Check if any filter is active based on store state
  const anyFilterActive = activeMetaTag !== null || activeIntentTag !== null || activeContentTags.size > 0;

  // Handle tag click - Call setFilters action directly
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
        // For content tags, allow selecting multiple, but let's stick to single selection for now for consistency
        // newContentTags.add(tag); // Toggle on
        // newContentTags = new Set([tag]); // Select only this one
        newContentTags.add(tag); // ALLOW MULTIPLE
      }
    }
    
    // Call store action with updated filters
    setFilters({
      searchQuery: '', // Always clear search on tag click
      activeMetaTag: newMetaTag,
      activeIntentTag: newIntentTag,
      activeContentTags: newContentTags
    });
  };

  // Helper function for close button click (calls handleTagClick)
  const handleCloseClick = (event: React.MouseEvent, tag: string, type: TagType) => {
    event.stopPropagation(); // Prevent badge click from firing
    handleTagClick(tag, type); // Toggles the tag off via the main handler
  };

  return (
    <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0 border-l p-4 overflow-y-auto bg-muted/40 dark:bg-gray-800/30">
      <h2 className="text-lg font-semibold mb-4 sticky top-0 bg-muted/40 dark:bg-gray-800/30 pb-2 z-10">Analysis</h2>
      <div className="space-y-6">
        {/* Filtered Entries count from store data */}
        <div>
          <h3 className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Loaded & Filtered Entries</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{displayEntries.length}</p>
          <p className="text-xs text-muted-foreground">Analysis based on currently visible entries.</p>
        </div>

        {/* Top Meta Tags */}
        <div>
          <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Top META TAGS</h3>
          <div className="flex flex-wrap gap-1">
            {topMetaTags.length > 0 ? (
              topMetaTags.map(([tag, count]) => {
                const isActive = isTagActive(tag, 'meta');
                const isGrayed = anyFilterActive && !isActive;
                // Get specific color from store map or default
                const lowerTag = tag.toLowerCase();
                const colorInfo = highlightedTagColors[lowerTag];
                const defaultClasses = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:opacity-80'; // Default gray
                const activeClasses = colorInfo ? colorInfo.base : defaultClasses;
                const hoverClasses = colorInfo ? colorInfo.hover : ''; // Hover is part of base for gradient, use default hover otherwise
                const ringClasses = 'ring-purple-500 dark:ring-purple-400'; // Ring color fixed to type

                return (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={clsx(
                        'relative group cursor-pointer transition-all duration-150 ease-in-out',
                        isActive
                          ? `ring-2 ring-offset-1 ${ringClasses} ${activeClasses} ${hoverClasses}`
                          : isGrayed
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 opacity-60 hover:opacity-100'
                            : `${activeClasses} ${hoverClasses}`
                    )}
                    onClick={() => handleTagClick(tag, 'meta')}
                  >
                    <span>{tag.toUpperCase()} ({count})</span>
                    {isActive && (
                      <button
                        onClick={(e) => handleCloseClick(e, tag, 'meta')}
                        className="absolute -top-2 -right-2 p-0.5 rounded-full bg-gray-500 hover:bg-gray-600 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label={`Remove ${tag} filter`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">No meta tags found in visible entries.</p>
            )}
          </div>
        </div>

        {/* Top Intent Tags */}
        <div>
          <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Top Intent Tags</h3>
          <div className="flex flex-wrap gap-1">
            {topIntentTags.length > 0 ? (
              topIntentTags.map(([tag, count]) => {
                const isActive = isTagActive(tag, 'intent');
                const isGrayed = anyFilterActive && !isActive;
                // Get specific color from store map or default
                const lowerTag = tag.toLowerCase();
                const colorInfo = highlightedTagColors[lowerTag];
                const defaultClasses = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:opacity-80'; // Default gray
                const activeClasses = colorInfo ? colorInfo.base : defaultClasses;
                const hoverClasses = colorInfo ? colorInfo.hover : ''; // Hover is part of base for gradient, use default hover otherwise
                const ringClasses = 'ring-green-600 dark:ring-green-500'; // Ring color fixed to type

                return (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={clsx(
                        'relative group cursor-pointer transition-all duration-150 ease-in-out',
                        isActive
                          ? `ring-2 ring-offset-1 ${ringClasses} ${activeClasses} ${hoverClasses}`
                          : isGrayed
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 opacity-60 hover:opacity-100'
                            : `${activeClasses} ${hoverClasses}`
                    )}
                    onClick={() => handleTagClick(tag, 'intent')}
                  >
                    <span>{tag} ({count})</span>
                    {isActive && (
                      <button
                        onClick={(e) => handleCloseClick(e, tag, 'intent')}
                        className="absolute -top-2 -right-2 p-0.5 rounded-full bg-gray-500 hover:bg-gray-600 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label={`Remove ${tag} filter`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">No intent tags found in visible entries.</p>
            )}
          </div>
        </div>

        {/* Top Content Tags */}
        <div>
          <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Top content tags</h3>
          <div className="flex flex-wrap gap-1">
            {topContentTags.length > 0 ? (
              topContentTags.map(([tag, count]) => {
                const isActive = isTagActive(tag, 'content');
                const isGrayed = anyFilterActive && !isActive;
                // Get specific color from store map or default
                const lowerTag = tag.toLowerCase();
                const colorInfo = highlightedTagColors[lowerTag];
                const defaultClasses = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:opacity-80'; // Default gray
                const activeClasses = colorInfo ? colorInfo.base : defaultClasses;
                const hoverClasses = colorInfo ? colorInfo.hover : ''; // Hover is part of base for gradient, use default hover otherwise
                const ringClasses = 'ring-blue-500 dark:ring-blue-400'; // Ring color fixed to type

                return (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={clsx(
                        'relative group cursor-pointer transition-all duration-150 ease-in-out',
                        isActive
                          ? `ring-2 ring-offset-1 ${ringClasses} ${activeClasses} ${hoverClasses}`
                          : isGrayed
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 opacity-60 hover:opacity-100'
                            : `${activeClasses} ${hoverClasses}`
                    )}
                    onClick={() => handleTagClick(tag, 'content')}
                  >
                    <span>{tag} ({count})</span>
                    {isActive && (
                      <button
                        onClick={(e) => handleCloseClick(e, tag, 'content')}
                        className="absolute -top-2 -right-2 p-0.5 rounded-full bg-gray-500 hover:bg-gray-600 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label={`Remove ${tag} filter`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">No content tags found in visible entries.</p>
            )}
          </div>
        </div>

      </div>
    </aside>
  );
}; 
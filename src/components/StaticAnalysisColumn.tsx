'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Entry, TagType } from '@/types'; // Import from centralized types
import { Badge } from '@/components/ui/badge'; // Import Badge
import { X } from 'lucide-react'; // Import X icon

interface StaticAnalysisColumnProps {
  entries: Entry[];
  onTagClick: (tag: string, type: TagType) => void;
  activeMetaTag: string | null; // Changed back to string | null
  activeIntentTag: string | null; // Changed back to string | null
  activeContentTags: Set<string>;
}

// Helper function to get top N tags from a counts object
const getTopTags = (counts: { [tag: string]: number }, topN: number): [string, number][] => {
  return Object.entries(counts)
    .filter(([, count]) => count > 1) // Filter out tags with count <= 1
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, topN);
};

export const StaticAnalysisColumn: React.FC<StaticAnalysisColumnProps> = ({
  entries,
  onTagClick,
  activeMetaTag, // Changed back
  activeIntentTag, // Changed back
  activeContentTags,
}) => {
  const topN = 5; // Number of top tags to display

  // Memoized calculation for top tags - Now uses filtered entries
  const { topMetaTags, topIntentTags, topContentTags } = useMemo(() => {
    const metaCounts: { [tag: string]: number } = {};
    const intentCounts: { [tag: string]: number } = {};
    const contentCounts: { [tag: string]: number } = {};

    entries.forEach(entry => { // Use filtered entries here
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
    // Dependency is now filtered entries
  }, [entries, topN]);

  // REVISED isTagActive: Check string for meta/intent, Set for content
  const isTagActive = (tag: string, type: TagType): boolean => {
    if (type === 'meta') return tag === activeMetaTag;
    if (type === 'intent') return tag === activeIntentTag;
    if (type === 'content') return activeContentTags.has(tag);
    return false;
  };

  // REVISED anyFilterActive check
  const anyFilterActive = activeMetaTag !== null || activeIntentTag !== null || activeContentTags.size > 0;

  // Helper function for close button click
  const handleCloseClick = (event: React.MouseEvent, tag: string, type: TagType) => {
    event.stopPropagation(); // Prevent badge click from firing
    onTagClick(tag, type); // Toggles the tag off via the main handler
  };

  return (
    <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0 border-l p-4 overflow-y-auto bg-muted/40 dark:bg-gray-800/30">
      <h2 className="text-lg font-semibold mb-4 sticky top-0 bg-muted/40 dark:bg-gray-800/30 pb-2 z-10">Analysis</h2>
      <div className="space-y-6">
        {/* Filtered Entries */}
        <div>
          <h3 className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Filtered Entries</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{entries.length}</p>
        </div>

        {/* Top Meta Tags - Update title casing */}
        <div>
          <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Top META TAGS</h3> {/* Changed casing */}
          <div className="flex flex-wrap gap-1">
            {topMetaTags.length > 0 ? (
              topMetaTags.map(([tag, count]) => {
                const isActive = isTagActive(tag, 'meta');
                const isGrayed = anyFilterActive && !isActive;
                return (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={`relative group cursor-pointer transition-all duration-150 ease-in-out
                      ${isActive
                        ? 'ring-2 ring-offset-1 ring-purple-500 dark:ring-purple-400 bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/70'
                        : isGrayed
                          ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 opacity-60 hover:opacity-100'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/70'
                      }
                    `}
                    onClick={() => onTagClick(tag, 'meta')}
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
              <p className="text-xs text-muted-foreground">No meta tags found in filtered results.</p> // Updated text
            )}
          </div>
        </div>

        {/* Top Intent Tags - Styling logic using isTagActive/isGrayed is already correct */}
        <div>
          <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Top Intent Tags</h3>
          <div className="flex flex-wrap gap-1">
            {topIntentTags.length > 0 ? (
              topIntentTags.map(([tag, count]) => {
                const isActive = isTagActive(tag, 'intent');
                const isGrayed = anyFilterActive && !isActive;
                return (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={`relative group cursor-pointer transition-all duration-150 ease-in-out
                      ${isActive
                        ? 'ring-2 ring-offset-1 ring-green-600 dark:ring-green-500 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/70'
                        : isGrayed
                          ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 opacity-60 hover:opacity-100'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/70'
                      }
                    `}
                    onClick={() => onTagClick(tag, 'intent')}
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
              <p className="text-xs text-muted-foreground">No intent tags found in filtered results.</p> // Updated text
            )}
          </div>
        </div>

        {/* Top Content Tags - Capitalize 'Top' */}
        <div>
          <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Top content tags</h3> {/* Capitalized 'Top' */}
          <div className="flex flex-wrap gap-1">
            {topContentTags.length > 0 ? (
              topContentTags.map(([tag, count]) => {
                const isActive = isTagActive(tag, 'content');
                const isGrayed = anyFilterActive && !isActive;
                return (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={`relative group cursor-pointer transition-all duration-150 ease-in-out
                      ${isActive
                        ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-blue-400 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/70'
                        : isGrayed
                          ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 opacity-60 hover:opacity-100'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/70'
                      }
                    `}
                    onClick={() => onTagClick(tag, 'content')}
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
              <p className="text-xs text-muted-foreground">No content tags found in filtered results.</p> // Updated text
            )}
          </div>
        </div>

      </div>
    </aside>
  );
}; 
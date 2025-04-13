import { supabase } from '@/lib/supabaseClient';
import type { Entry } from '@/types';

/**
 * Fetches entries from Supabase, applying pagination and optional filters.
 * Search query overrides tag filters.
 * Requires a 'search_vector' tsvector column on the 'entries' table for text search.
 * Returns paginated data and error object.
 */
export const fetchEntriesPaginatedService = async (
    offset: number,
    limit: number,
    // Added filter parameters:
    searchQuery: string,
    metaTag: string | null,
    intentTag: string | null,
    contentTags: Set<string>
): Promise<{ data: Entry[] | null; error: Error | null }> => {
    if (limit <= 0) {
        return { data: [], error: null }; 
    }
    try {
        let supabaseQuery = supabase
            .from('entries')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        const trimmedQuery = searchQuery.trim();

        // Apply filters OR search
        if (trimmedQuery) {
            // Search overrides tag filters
            console.log(`Applying search filter: "${trimmedQuery}"`);
            supabaseQuery = supabaseQuery.textSearch('search_vector', trimmedQuery, {
                type: 'websearch',
                config: 'english'
            });
        } else {
            // Apply tag filters if no search query (AND logic across types)
            let filtersApplied = false;
            if (metaTag) {
                console.log(`Applying meta tag filter: ${metaTag}`);
                supabaseQuery = supabaseQuery.eq('meta_tag', metaTag);
                filtersApplied = true;
            }
            if (intentTag) {
                console.log(`Applying intent tag filter: ${intentTag}`);
                supabaseQuery = supabaseQuery.eq('intent_tag', intentTag);
                filtersApplied = true;
            }
            if (contentTags.size > 0) {
                const tagsArray = Array.from(contentTags);
                console.log(`Applying content tag filters: ${tagsArray.join(', ')}`);
                // Option 1: Contains ALL tags (using .cs with array)
                // supabaseQuery = supabaseQuery.cs('tags', tagsArray);
                
                // Option 2: Contains ANY tag (using .or with .cs)
                const orFilters = tagsArray.map(tag => 
                    `tags.cs.${JSON.stringify([tag])}` // Check if tag is in the tags array
                ).join(',');
                supabaseQuery = supabaseQuery.or(orFilters);
                filtersApplied = true;
            }
            if (filtersApplied) {
                 console.log("Tag filters applied.");
            } else {
                 console.log("No search or tag filters applied.");
            }
        }

        // Apply pagination AFTER filtering/searching
        supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);
        console.log("Applying pagination: offset", offset, "limit", limit);

        const { data, error } = await supabaseQuery;

        if (error) {
            // Log the specific Supabase error
            console.error('Supabase query error in fetchEntriesPaginatedService:', error);
            throw error;
        }
        console.log(`Fetched ${data?.length ?? 0} entries.`);
        return { data: (data as Entry[]) || [], error: null };

    } catch (error: any) {
        console.error('Error in fetchEntriesPaginatedService:', error);
        return { data: null, error: new Error(`Failed to fetch paginated entries: ${error.message}`) };
    }
};

/**
 * Fetches all entries, ordered by date and creation time.
 * Generally should NOT be used in production UI due to performance.
 * Returns data and error object.
 */
export const fetchAllEntriesService = async (): Promise<{ data: Entry[] | null; error: Error | null }> => {
    try {
        const { data, error } = await supabase
            .from('entries')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }
        return { data: (data as Entry[]) || [], error: null };
    } catch (error: any) {
        console.error('Error in fetchAllEntriesService:', error);
        return { data: null, error: new Error(`Failed to fetch all entries: ${error.message}`) };
    }
};

/**
 * Adds a new entry to the database.
 * Does not handle AI tag generation here.
 * Returns the newly created entry data and error object.
 */
export const addEntryService = async (
    date: string, 
    content: string, 
    entryType: 'voice' | 'text' // Added entryType parameter
): Promise<{ data: Entry | null; error: Error | null }> => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
        return { data: null, error: new Error("Content cannot be empty.") };
    }

    try {
        const { data, error } = await supabase
            .from('entries')
            .insert({ 
                date: date, 
                content: trimmedContent, 
                entry_type: entryType // Include entry_type in the insert payload
            })
            .select()
            .single();

        if (error) {
            throw error;
        }
        // Return the basic entry structure, tags/summary will be added later
        return { data: data as Entry, error: null }; 
    } catch (error: any) {
        console.error('Error in addEntryService:', error);
        return { data: null, error: new Error(`Failed to add entry: ${error.message}`) };
    }
};

/**
 * Updates the content of an existing entry.
 * Does not handle AI tag re-generation here.
 * Returns the updated entry data and error object.
 */
export const updateEntryContentService = async (id: string, content: string): Promise<{ data: Entry | null; error: Error | null }> => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
        return { data: null, error: new Error("Content cannot be empty.") };
    }

    try {
        const { data, error } = await supabase
            .from('entries')
            .update({ content: trimmedContent }) // Only update content for now
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw error;
        }
        return { data: data as Entry, error: null };
    } catch (error: any) {
        console.error('Error in updateEntryContentService:', error);
        return { data: null, error: new Error(`Failed to update entry: ${error.message}`) };
    }
};

/**
 * Deletes an entry from the database.
 * Returns error object if deletion fails.
 */
export const deleteEntryService = async (id: string): Promise<{ error: Error | null }> => {
    try {
        const { error } = await supabase
            .from('entries')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }
        return { error: null };
    } catch (error: any) {
        console.error('Error in deleteEntryService:', error);
        return { error: new Error(`Failed to delete entry: ${error.message}`) };
    }
};

// TODO: Consider adding service for AI tag generation calls?

// TODO: Add functions for initial fetch, add, update, delete 
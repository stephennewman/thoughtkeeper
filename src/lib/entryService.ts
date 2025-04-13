import { supabase } from '@/lib/supabaseClient';
import type { Entry } from '@/types';

/**
 * Fetches entries from Supabase based on query and/or tag filters.
 * Handles search override and combined tag filtering logic.
 * Returns data and error object.
 */
export const fetchEntriesService = async (
    // query: string, // Removed query parameter
    metaTag: string | null,
    intentTag: string | null,
    contentTags: Set<string>
): Promise<{ data: Entry[] | null; error: Error | null }> => {
    try {
        let supabaseQuery = supabase
            .from('entries')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        // const trimmedQuery = query.trim(); // Removed query logic

        // Apply filters
        // if (trimmedQuery) { // Removed query logic
        //     // Search overrides tag filters
        //     supabaseQuery = supabaseQuery.textSearch('search_vector', trimmedQuery, {
        //         type: 'websearch',
        //         config: 'english'
        //     });
        // } else { // Removed query logic
            // Apply tag filters (AND logic across types)
            if (metaTag) {
                supabaseQuery = supabaseQuery.eq('meta_tag', metaTag);
            }
            if (intentTag) {
                supabaseQuery = supabaseQuery.eq('intent_tag', intentTag);
            }
            if (contentTags.size > 0) {
                // Use .or() with .cs. (contains) for each tag
                // Build filter string like: tags.cs.["tag1"],tags.cs.["tag2"]
                const orFilters = Array.from(contentTags).map(tag => 
                    // Ensure tag is properly escaped within the JSON string
                    `tags.cs.${JSON.stringify([tag])}`
                ).join(',');
                supabaseQuery = supabaseQuery.or(orFilters);
            }
        // } // Removed query logic

        const { data, error } = await supabaseQuery;

        if (error) {
            throw error;
        }
        return { data: (data as Entry[]) || [], error: null };

    } catch (error: any) {
        console.error('Error in fetchEntriesService:', error);
        return { data: null, error: new Error(`Failed to fetch entries: ${error.message}`) };
    }
};

/**
 * Fetches all entries, ordered by date and creation time.
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

/**
 * Fetches entries chronologically with pagination.
 * Does NOT apply filters (search, tags) server-side.
 * Returns paginated data and error object.
 */
export const fetchEntriesPaginatedService = async (
    offset: number,
    limit: number
): Promise<{ data: Entry[] | null; error: Error | null }> => {
    if (limit <= 0) {
        return { data: [], error: null }; // Or handle as an error
    }
    try {
        const { data, error } = await supabase
            .from('entries')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            throw error;
        }
        return { data: (data as Entry[]) || [], error: null };

    } catch (error: any) {
        console.error('Error in fetchEntriesPaginatedService:', error);
        return { data: null, error: new Error(`Failed to fetch paginated entries: ${error.message}`) };
    }
};

// TODO: Consider adding service for AI tag generation calls?

// TODO: Add functions for initial fetch, add, update, delete 
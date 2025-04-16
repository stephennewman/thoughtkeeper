import { supabase } from '@/lib/supabaseClient';
import type { Entry, ActionItem } from '@/types';

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
 * Triggers asynchronous extraction of actions after creation.
 * Returns the newly created entry data and error object.
 */
export const addEntryService = async (
    date: string, 
    content: string, 
    entryType: 'voice' | 'text' 
): Promise<{ data: Entry | null; error: Error | null }> => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
        return { data: null, error: new Error("Content cannot be empty.") };
    }

    let newEntry: Entry | null = null;

    try {
        // Fetch the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error("Error fetching user or user not logged in:", userError);
            return { data: null, error: new Error("User not authenticated.") };
        }

        // Insert entry with user_id
        const { data, error } = await supabase
            .from('entries')
            .insert({ 
                date: date, 
                content: trimmedContent, 
                entry_type: entryType, 
                user_id: user.id // Include the user ID
            })
            .select()
            .single();

        if (error) {
            throw error;
        }
        newEntry = data as Entry; // Store the newly created entry

        // --- Start: Asynchronously extract and update actions --- 
        if (newEntry && newEntry.id && newEntry.content) {
            // Don't await these calls - let them run in the background
            extractAndSaveActions(newEntry.id, newEntry.content);
            console.log("[addEntryService] Attempting to call extractAndSaveSummary for entry:", newEntry.id);
            extractAndSaveSummary(newEntry.id, newEntry.content); // Call summary extraction
        }
        // --- End: Asynchronously extract and update actions ---

        return { data: newEntry, error: null }; 
    } catch (error: any) {
        console.error('Error in addEntryService:', error);
        return { data: null, error: new Error(`Failed to add entry: ${error.message}`) };
    }
};

/**
 * Updates the content of an existing entry.
 * Triggers asynchronous re-extraction of actions after update.
 * Returns the updated entry data and error object.
 */
export const updateEntryContentService = async (id: string, content: string): Promise<{ data: Entry | null; error: Error | null }> => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
        return { data: null, error: new Error("Content cannot be empty.") };
    }

    let updatedEntry: Entry | null = null;

    try {
        const { data, error } = await supabase
            .from('entries')
            .update({ content: trimmedContent }) // Only update content initially
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw error;
        }
        updatedEntry = data as Entry; // Store the updated entry

        // --- Start: Asynchronously extract and update actions --- 
        if (updatedEntry && updatedEntry.id && updatedEntry.content) {
             // Don't await these calls - let them run in the background
            extractAndSaveActions(updatedEntry.id, updatedEntry.content);
            console.log("[updateEntryContentService] Attempting to call extractAndSaveSummary for entry:", updatedEntry.id);
            extractAndSaveSummary(updatedEntry.id, updatedEntry.content); // Call summary extraction
        }
        // --- End: Asynchronously extract and update actions ---

        return { data: updatedEntry, error: null };
    } catch (error: any) {
        console.error('Error in updateEntryContentService:', error);
        return { data: null, error: new Error(`Failed to update entry: ${error.message}`) };
    }
};

/**
 * Helper function to call the API, extract actions, and update the DB.
 * Designed to be called without awaiting.
 */
const extractAndSaveActions = async (entryId: string, entryContent: string): Promise<void> => {
    console.log(`Starting action extraction for entry: ${entryId}`);
    try {
        const response = await fetch('/api/extract-actions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: entryContent }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error (${response.status}): ${errorData.error || response.statusText}`);
        }

        const extractedActions: ActionItem[] = await response.json();

        // Validate the structure slightly (basic check)
        if (!Array.isArray(extractedActions) || (extractedActions.length > 0 && typeof extractedActions[0] !== 'object')) {
             console.warn(`Received invalid actions structure for entry ${entryId}:`, extractedActions);
             // Decide whether to save [] or null or do nothing. Saving [] might be safest.
             // For now, let's skip the update if the structure is clearly wrong.
             return; 
        }
        
        console.log(`Extracted ${extractedActions.length} actions for entry ${entryId}. Saving...`);

        const { error: updateError } = await supabase
            .from('entries')
            .update({ extracted_actions: extractedActions })
            .eq('id', entryId);

        if (updateError) {
            console.error(`Failed to save extracted actions for entry ${entryId}:`, updateError);
        } else {
            console.log(`Successfully saved extracted actions for entry ${entryId}.`);
        }

    } catch (error) {
        console.error(`Error during action extraction/saving for entry ${entryId}:`, error);
    }
};

/**
 * Helper function to call the summary API, extract summary points, and update the DB.
 * Designed to be called without awaiting.
 */
const extractAndSaveSummary = async (entryId: string, entryContent: string): Promise<void> => {
    console.log(`Starting summary extraction for entry: ${entryId}`);
    try {
        const response = await fetch('/api/extract-summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: entryContent }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error (${response.status}): ${errorData.error || response.statusText}`);
        }

        const extractedSummary: string[] = await response.json();

        // Validate the structure (expecting array of strings)
        if (!Array.isArray(extractedSummary) || !extractedSummary.every(item => typeof item === 'string')) {
             console.warn(`Received invalid summary structure for entry ${entryId}:`, extractedSummary);
             // Skip update if structure is clearly wrong
             return; 
        }
        
        console.log(`Extracted ${extractedSummary.length} summary points for entry ${entryId}. Saving...`);

        const { error: updateError } = await supabase
            .from('entries')
            .update({ extracted_summary: extractedSummary })
            .eq('id', entryId);

        if (updateError) {
            console.error(`Failed to save extracted summary for entry ${entryId}:`, updateError);
        } else {
            console.log(`Successfully saved extracted summary for entry ${entryId}.`);
        }

    } catch (error) {
        console.error(`Error during summary extraction/saving for entry ${entryId}:`, error);
    }
};

/**
 * Updates the `extracted_actions` field for a specific entry.
 * Returns only the ID and updated actions, or error.
 */
export const updateEntryActionsService = async (id: string, actions: ActionItem[]): Promise<{ data: Pick<Entry, 'id' | 'extracted_actions'> | null; error: Error | null }> => {
    console.log(`Updating actions for entry ${id} with:`, actions);
    try {
        // Basic validation
        if (!id || !Array.isArray(actions)) {
            return { data: null, error: new Error("Invalid ID or actions array provided.") };
        }

        const { data, error } = await supabase
            .from('entries')
            .update({ extracted_actions: actions })
            .eq('id', id)
            .select('id, extracted_actions') // Select only necessary fields
            .single();

        if (error) {
            throw error;
        }
        return { data, error: null };
    } catch (error: any) {
        console.error('Error in updateEntryActionsService:', error);
        return { data: null, error: new Error(`Failed to update entry actions: ${error.message}`) };
    }
};

/**
 * Updates the `extracted_summary` field for a specific entry.
 * Returns only the ID and updated summary, or error.
 */
export const updateEntrySummaryService = async (id: string, summary: string[]): Promise<{ data: Pick<Entry, 'id' | 'extracted_summary'> | null; error: Error | null }> => {
    try {
        // Basic validation
        if (!id || !Array.isArray(summary)) {
            return { data: null, error: new Error("Invalid ID or summary array provided.") };
        }

        const { data, error } = await supabase
            .from('entries')
            .update({ extracted_summary: summary })
            .eq('id', id)
            .select('id, extracted_summary') // Select only necessary fields
            .single();

        if (error) {
            throw error;
        }
        // Cast the data to the expected partial type
        return { data: data as Pick<Entry, 'id' | 'extracted_summary'> | null, error: null };
    } catch (error: any) {
        console.error('Error in updateEntrySummaryService:', error);
        return { data: null, error: new Error(`Failed to update entry summary: ${error.message}`) };
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
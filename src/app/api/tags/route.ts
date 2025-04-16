import { NextResponse } from 'next/server';
import OpenAI from 'openai';
// Import the standard Supabase client
import { createClient } from '@supabase/supabase-js';
// Remove the Database type import for now
// import type { Database } from '@/types_db'; // Keep this, maybe path is slightly different?

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    console.log('Tags API: Received request');
    // Extract entryId along with content
    const { content, entryId } = await request.json();
    console.log('Tags API: Content received:', content, 'for entryId:', entryId);

    // Check for both content and entryId
    if (!content || !entryId) {
      console.log('Tags API: Content or entryId missing');
      return NextResponse.json({ error: 'Content and entryId are required' }, { status: 400 });
    }

    console.log('Tags API: Calling OpenAI API');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates relevant tags for journal entries. Generate 3-5 concise, meaningful tags that capture the main themes, emotions, or topics of the journal entry. Return ONLY the tags as a JSON array of strings. ALL TAGS MUST BE LOWERCASE."
        },
        {
          role: "user",
          content: content
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    });

    console.log('Tags API: OpenAI response:', completion.choices[0]?.message?.content);
    
    let tags: string[] = []; // Ensure type is string[]
    try {
      const rawResponse = completion.choices[0]?.message?.content || '[]';
      const cleanedResponse = rawResponse.replace(/```json\n?|```/g, '').trim();
      const parsedTags = JSON.parse(cleanedResponse);
      // Validate and clean tags
      if (Array.isArray(parsedTags) && parsedTags.every(t => typeof t === 'string')) {
          tags = parsedTags.map(tag => tag.toLowerCase().trim()).filter(Boolean); // Ensure lowercase, trimmed, non-empty
      } else {
          console.warn('Tags API: Parsed tags were not a valid string array:', parsedTags);
      }
      console.log('Tags API: Parsed and cleaned tags:', tags);
    } catch (error) {
      console.error('Tags API: Error parsing tags:', error);
      // Keep tags as empty array on parse failure
    }

    // Update the database entry with the generated tags
    // Create a Supabase client for server-side operations
    // Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment variables
    let supabase; // Define supabase variable outside the try block
    try {
        console.log('Tags API: Attempting to create Supabase client...');
        supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        console.log('Tags API: Supabase client created successfully.');
    } catch (clientError) {
        console.error('Tags API: Error creating Supabase client:', clientError);
        return NextResponse.json({ error: 'Failed to create Supabase client' }, { status: 500 });
    }

    try {
        console.log(`Tags API: Attempting to update DB for entryId: ${entryId}`);
        const { error: updateError } = await supabase
            .from('entries')
            .update({ tags: tags })
            .eq('id', entryId);

        if (updateError) {
            console.error('Tags API: Database Update Error:', updateError);
            // Return an error to the client
            return NextResponse.json({ error: 'Failed to update entry tags in database' }, { status: 500 });
        } else {
             console.log(`Tags API: Successfully updated tags for entry ${entryId}:`, tags);
        }

    } catch (dbError) {
         console.error('Tags API: Unexpected error during database update:', dbError);
         return NextResponse.json({ error: 'Unexpected error during database update' }, { status: 500 });
    }

    // Return success (client relies on Realtime, but good practice to return status)
    return NextResponse.json({ success: true, tags: tags });

  } catch (error) {
    console.error('Tags API: Error:', error);
    return NextResponse.json({ error: 'Failed to generate tags' }, { status: 500 });
  }
} 
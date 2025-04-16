import { NextResponse } from 'next/server';
import OpenAI from 'openai';
// Import the standard Supabase client
import { createClient } from '@supabase/supabase-js';
// Assuming Database types are not strictly needed for now
// import type { Database } from '@/types_db';

// Ensure OpenAI API key is configured
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PREFERRED_INTENT_TAGS = [
  'Action Item',
  'Idea',
  'Log',
  'Reflection',
  'Note',
  'Decision',
  'Reminder',
  'Goal',
  'Bookmark',
  'Reference',
];

export async function POST(request: Request) {
  try {
    // Extract entryId along with content
    const { content, entryId } = await request.json();
    console.log('Intent API: Content received:', content, 'for entryId:', entryId);

    // Check for both content and entryId
    if (!content || !entryId) {
        console.log('Intent API: Content or entryId missing');
        return NextResponse.json({ error: 'Content and entryId are required' }, { status: 400 });
    }

    console.log('Intent API: Calling OpenAI API');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or potentially a faster/cheaper model if sufficient
      messages: [
        {
          role: "system",
          content: `You are an assistant that classifies journal entries based on their intent or structure. Analyze the content and determine the primary purpose of the note. Choose ONLY ONE intent type. Prefer one of the following types if applicable: ${PREFERRED_INTENT_TAGS.join(', ')}. If none of those fit well, choose another concise, relevant type (e.g., "Meeting Notes", "Gratitude", "Question"). Respond with ONLY the single chosen intent type name as plain text, without any explanation, preamble, or quotation marks.`
        },
        {
          role: "user",
          content: content // Send the plain text content
        }
      ],
      temperature: 0.2, // Lower temperature for more deterministic classification
      max_tokens: 20
    });

    const intentTag = completion.choices[0]?.message?.content?.trim() || null;
    console.log('Intent API: Generated intentTag:', intentTag);

    // Basic validation (optional)
    if (!intentTag) {
      console.warn('Intent API: Intent tag generation failed or returned empty. Skipping DB update.');
      // Return null but indicate success (generation itself didn't fail)
      return NextResponse.json({ success: true, intentTag: null });
    }

    // *** ADDED: Database Update Logic ***
    let supabase;
    try {
        console.log('Intent API: Attempting to create Supabase client...');
        supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        console.log('Intent API: Supabase client created successfully.');
    } catch (clientError) {
        console.error('Intent API: Error creating Supabase client:', clientError);
        return NextResponse.json({ error: 'Failed to create Supabase client' }, { status: 500 });
    }

    try {
        console.log(`Intent API: Attempting to update DB for entryId: ${entryId} with intentTag: ${intentTag}`);
        const { error: updateError } = await supabase
            .from('entries')
            .update({ intent_tag: intentTag }) // Update the intent_tag column
            .eq('id', entryId);

        if (updateError) {
            console.error('Intent API: Database Update Error:', updateError);
            return NextResponse.json({ error: 'Failed to update entry intent tag in database' }, { status: 500 });
        } else {
             console.log(`Intent API: Successfully updated intent tag for entry ${entryId}`);
        }
    } catch (dbError) {
         console.error('Intent API: Unexpected error during database update:', dbError);
         return NextResponse.json({ error: 'Unexpected error during database update' }, { status: 500 });
    }
    // *** END: Database Update Logic ***

    // Return success and the generated tag (client doesn't use it, but good practice)
    return NextResponse.json({ success: true, intentTag });

  } catch (error: any) {
    console.error('Intent Tag API Error (Outer Catch):', error);
    // Return null tag on error to avoid breaking the save flow, but indicate error
    return NextResponse.json({ error: 'Failed to generate intent tag' }, { status: 500 });
  }
} 
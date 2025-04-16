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

const PREFERRED_META_TAGS = [
  'Work',
  'SideHustle',
  'Family',
  'Social',
  'Finances',
  'Spirituality',
  'Health',
  'Mind',
  'Learning',
];

export async function POST(request: Request) {
  try {
    // Extract entryId along with content
    const { content, entryId } = await request.json();
    console.log('Meta API: Content received:', content, 'for entryId:', entryId);

    // Check for both content and entryId
    if (!content || !entryId) {
        console.log('Meta API: Content or entryId missing');
        return NextResponse.json({ error: 'Content and entryId are required' }, { status: 400 });
    }

    console.log('Meta API: Calling OpenAI API');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or potentially a faster/cheaper model if sufficient
      messages: [
        {
          role: "system",
          content: `You are an assistant that classifies journal entries into a single meta category. Analyze the content and determine the primary life domain it relates to. Choose ONLY ONE category. Prefer one of the following categories if applicable: ${PREFERRED_META_TAGS.join(', ')}. Differentiate between 'Work' (main job/career) and 'SideHustle' (secondary income/business venture). If none of the preferred categories fit well, choose another concise, relevant category (e.g., "Travel", "Project", "Hobby"). Respond with ONLY the single chosen category name as plain text, without any explanation, preamble, or quotation marks.`
        },
        {
          role: "user",
          content: content // Send the plain text content
        }
      ],
      temperature: 0.2, // Lower temperature for more deterministic classification
      max_tokens: 20 
    });

    const metaTag = completion.choices[0]?.message?.content?.trim() || null;
    console.log('Meta API: Generated metaTag:', metaTag);

    // Basic validation (optional)
    if (!metaTag) {
      console.warn('Meta API: Meta tag generation failed or returned empty. Skipping DB update.');
      // Return null but indicate success (generation itself didn't fail)
      return NextResponse.json({ success: true, metaTag: null }); 
    }

    // *** ADDED: Database Update Logic ***
    let supabase;
    try {
        console.log('Meta API: Attempting to create Supabase client...');
        supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        console.log('Meta API: Supabase client created successfully.');
    } catch (clientError) {
        console.error('Meta API: Error creating Supabase client:', clientError);
        return NextResponse.json({ error: 'Failed to create Supabase client' }, { status: 500 });
    }

    try {
        console.log(`Meta API: Attempting to update DB for entryId: ${entryId} with metaTag: ${metaTag}`);
        const { error: updateError } = await supabase
            .from('entries')
            .update({ meta_tag: metaTag }) // Update the meta_tag column
            .eq('id', entryId);

        if (updateError) {
            console.error('Meta API: Database Update Error:', updateError);
            return NextResponse.json({ error: 'Failed to update entry meta tag in database' }, { status: 500 });
        } else {
             console.log(`Meta API: Successfully updated meta tag for entry ${entryId}`);
        }
    } catch (dbError) {
         console.error('Meta API: Unexpected error during database update:', dbError);
         return NextResponse.json({ error: 'Unexpected error during database update' }, { status: 500 });
    }
    // *** END: Database Update Logic ***

    // Return success and the generated tag (client doesn't use it, but good practice)
    return NextResponse.json({ success: true, metaTag });

  } catch (error: any) {
    console.error('Meta Tag API Error (Outer Catch):', error);
    // Return null tag on error to avoid breaking the save flow, but indicate error
    return NextResponse.json({ error: 'Failed to generate meta tag' }, { status: 500 });
  }
} 
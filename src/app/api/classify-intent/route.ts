import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

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

    // Basic validation (optional)
    if (!intentTag) {
      console.warn('Intent tag generation failed or returned empty.');
      return NextResponse.json({ intentTag: null });
    }

    // Potentially add more validation

    return NextResponse.json({ intentTag });

  } catch (error: any) {
    console.error('Intent Tag API Error:', error);
    // Return null tag on error to avoid breaking the save flow
    return NextResponse.json({ intentTag: null }, { status: 500 });
  }
} 
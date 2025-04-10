import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Ensure OpenAI API key is configured
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PREFERRED_META_TAGS = [
  'Work',
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
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or potentially a faster/cheaper model if sufficient
      messages: [
        {
          role: "system",
          content: `You are an assistant that classifies journal entries into a single meta category. Analyze the content and determine the primary life domain it relates to. Choose ONLY ONE category. Prefer one of the following categories if applicable: ${PREFERRED_META_TAGS.join(', ')}. If none of those fit well, choose another concise, relevant category (e.g., "Travel", "Project", "Hobby"). Respond with ONLY the single chosen category name as plain text, without any explanation, preamble, or quotation marks.`
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

    // Basic validation (optional)
    if (!metaTag) {
      console.warn('Meta tag generation failed or returned empty.');
      return NextResponse.json({ metaTag: null }); 
    }
    
    // Potentially add more validation, e.g., against a dynamic list or length limit

    return NextResponse.json({ metaTag });

  } catch (error: any) {
    console.error('Meta Tag API Error:', error);
    // Return null tag on error to avoid breaking the save flow
    return NextResponse.json({ metaTag: null }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    console.log('Summarize API: Received request');
    const { content } = await request.json();
    console.log('Summarize API: Content received:', content);

    if (!content) {
      console.log('Summarize API: No content provided');
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    console.log('Summarize API: Calling OpenAI API');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates concise summaries of journal entries. Create a brief, 2-3 sentence summary that captures the main points and emotional tone of the entry. Focus on the key themes and feelings expressed."
        },
        {
          role: "user",
          content: content
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    console.log('Summarize API: OpenAI response:', completion.choices[0]?.message?.content);
    
    const summary = completion.choices[0]?.message?.content || '';
    console.log('Summarize API: Final summary:', summary);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summarize API: Error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
} 
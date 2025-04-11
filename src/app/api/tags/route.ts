import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    console.log('Tags API: Received request');
    const { content } = await request.json();
    console.log('Tags API: Content received:', content);

    if (!content) {
      console.log('Tags API: No content provided');
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
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
    
    let tags;
    try {
      const rawResponse = completion.choices[0]?.message?.content || '[]';
      const cleanedResponse = rawResponse.replace(/```json\n?|```/g, '').trim();
      tags = JSON.parse(cleanedResponse);
      console.log('Tags API: Parsed tags:', tags);
    } catch (error) {
      console.error('Tags API: Error parsing tags:', error);
      tags = [];
    }

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Tags API: Error:', error);
    return NextResponse.json({ error: 'Failed to generate tags' }, { status: 500 });
  }
} 
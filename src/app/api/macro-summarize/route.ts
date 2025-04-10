import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    console.log('Macro-Summarize API: Received request');
    const { entries } = await request.json();
    console.log('Macro-Summarize API: Received entries:', entries.length);

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      console.log('Macro-Summarize API: No entries provided');
      return NextResponse.json({ error: 'Entries are required' }, { status: 400 });
    }

    // Combine all entries into a single text
    const combinedContent = entries
      .map(entry => entry.content)
      .join('\n\n---\n\n');

    console.log('Macro-Summarize API: Calling OpenAI API');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that analyzes journal entries and generates a concise, structured overview. 
          Generate a JSON response with the following structure:
          {
            "mood": "A single word describing the overall mood (e.g., Positive, Reflective, Challenged)",
            "moodEmoji": "An appropriate emoji for the mood",
            "focusAreas": [
              {
                "category": "Category name (e.g., Work, Personal, Health)",
                "icon": "A relevant emoji for the category",
                "highlight": "One key point or achievement"
              }
            ],
            "keyTakeaway": "One concise sentence capturing the day's essence"
          }
          
          Rules:
          - Keep each highlight to one sentence
          - Use only 3-4 most significant focus areas
          - Make the key takeaway impactful but brief
          - Choose appropriate emojis that match the content`
        },
        {
          role: "user",
          content: `Here are all the journal entries for this day:\n\n${combinedContent}`
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    console.log('Macro-Summarize API: OpenAI response:', completion.choices[0]?.message?.content);
    
    let macroSummary;
    try {
      macroSummary = JSON.parse(completion.choices[0]?.message?.content || '{}');
      console.log('Macro-Summarize API: Parsed summary:', macroSummary);
    } catch (error) {
      console.error('Macro-Summarize API: Error parsing summary:', error);
      macroSummary = {
        mood: "Unknown",
        moodEmoji: "🤔",
        focusAreas: [],
        keyTakeaway: "Unable to generate summary"
      };
    }

    return NextResponse.json({ macroSummary });
  } catch (error) {
    console.error('Macro-Summarize API: Error:', error);
    return NextResponse.json({ error: 'Failed to generate macro-summary' }, { status: 500 });
  }
} 
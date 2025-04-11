import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client 
// Ensure OPENAI_API_KEY is set in your .env.local
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60 * 1000, // Optional: 60 seconds timeout
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messagesText = body.messagesText as string | undefined;

    if (!messagesText) {
      return NextResponse.json({ error: 'Missing messagesText in request body.' }, { status: 400 });
    }

    console.log('[process-messages] Received text for processing:', messagesText.substring(0, 200) + '...'); // Log snippet

    // --- Define the prompt for the AI --- 
    const systemPrompt = "You are a helpful assistant. Analyze the following Slack conversation snippet and extract key action items or decisions. If no clear action items are found, summarize the main topic.";
    const userPrompt = `Conversation Snippet:\n---\n${messagesText}\n---\nExtracted Actions/Summary:`;

    // --- Call OpenAI Chat Completions API --- 
    console.log('[process-messages] Sending request to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or use gpt-4 if preferred/available
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5, // Adjust temperature for creativity vs. consistency
      max_tokens: 150, // Limit response length
    });

    const result = completion.choices[0]?.message?.content?.trim() || 'No response content from AI.';
    console.log('[process-messages] Received result from OpenAI:', result);

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('[process-messages] Error processing Slack messages:', error);
    // Consider more specific error handling (e.g., OpenAI API errors)
    let errorMessage = error.message || 'Internal Server Error';
    if (error.response?.data?.error?.message) { // Check for OpenAI specific error message
      errorMessage = `OpenAI Error: ${error.response.data.error.message}`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 
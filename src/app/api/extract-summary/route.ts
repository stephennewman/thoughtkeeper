// src/app/api/extract-summary/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Ensure the OpenAI API key is set in environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  console.log("POST /api/extract-summary received");
  try {
    const { content } = await request.json();
    console.log("Content received:", content?.substring(0, 100) + "...");

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.error("Validation Error: Content is required and must be a non-empty string.");
      return NextResponse.json({ error: 'Content is required and must be a non-empty string.' }, { status: 400 });
    }

    // Define the prompt for OpenAI
    const systemPrompt = `
You are an AI assistant specialized in analyzing and summarizing text, such as journal entries or notes.
Your task is to read the provided text and generate a concise, bullet-point summary capturing the main points, themes, or key information.
Aim for clarity and brevity. Each bullet point should be a complete sentence or a meaningful phrase.
Format the output strictly as a JSON object containing a single key "summary" which holds a JSON array of strings, where each string is a bullet point.
Example: {"summary": ["Discussed project progress with the team.", "Feeling optimistic about the upcoming deadline.", "Need to follow up on action items."]}
If the text is too short or contains no summarizable information, return {"summary": []}.
Do not include any explanations or introductory text in your response, only the JSON object.
`;

    // Call OpenAI API
    console.log("Calling OpenAI API for summary extraction...");
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Or consider 'gpt-4o-mini'
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5, // Slightly higher temperature for summarization creativity
    });
    console.log("OpenAI API response received.");

    const messageContent = response.choices[0]?.message?.content;

    if (!messageContent) {
      console.error('OpenAI response content is null or undefined.');
      return NextResponse.json([]); // Return empty array structure directly
    }
    console.log("Raw OpenAI response content:", messageContent);

    // Attempt to parse the JSON string from the AI response
    let extractedSummaryPoints: string[];
    try {
      // Expecting {"summary": ["point1", "point2"]}
      const parsedJson = JSON.parse(messageContent);

      if (typeof parsedJson === 'object' && parsedJson !== null && Array.isArray(parsedJson.summary)) {
        extractedSummaryPoints = parsedJson.summary;
        console.log(`Successfully parsed ${extractedSummaryPoints.length} summary points from AI response.`);
      } else {
        console.warn('Parsed JSON from AI does not match expected structure {"summary": [...]}:', parsedJson);
        extractedSummaryPoints = [];
      }
    } catch (parseError) {
      console.error('Error parsing JSON from OpenAI response:', parseError);
      return NextResponse.json([]); // Return empty array structure directly
    }

     // Ensure we have an array of strings (extra safety check)
    if (!extractedSummaryPoints.every(item => typeof item === 'string')) {
        console.warn('Extracted summary data is not an array of strings after parsing:', extractedSummaryPoints);
        extractedSummaryPoints = [];
    }

    console.log("Formatted summary points:", extractedSummaryPoints);
    // Return the array of summary strings directly
    return NextResponse.json(extractedSummaryPoints);

  } catch (error) {
    console.error('Error in /api/extract-summary:', error);
    let errorMessage = 'Internal Server Error';
    let statusCode = 500;

    if (error instanceof OpenAI.APIError) {
      errorMessage = error.message || 'Error calling OpenAI API';
      statusCode = error.status || 500;
      console.error('OpenAI API Error Details:', { status: error.status, message: error.message, code: error.code, type: error.type });
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
} 
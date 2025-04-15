// src/app/api/extract-actions/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Ensure the OpenAI API key is set in environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define a type for the action items for clarity from entryService
// Note: This might cause type duplication. Consider a shared types file if it becomes complex.
type ActionItem = {
    task: string;
    completed: boolean;
};

export async function POST(request: Request) {
  console.log("POST /api/extract-actions received"); // Log entry point
  try {
    const { content } = await request.json();
     console.log("Content received:", content?.substring(0, 100) + "..."); // Log received content (truncated)

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
       console.error("Validation Error: Content is required and must be a non-empty string.");
      return NextResponse.json({ error: 'Content is required and must be a non-empty string.' }, { status: 400 });
    }

    // Define the prompt for OpenAI
    const systemPrompt = `
You are an AI assistant specialized in analyzing text, such as journal entries or notes.
Your task is to identify and extract only the actionable to-do items or tasks mentioned in the provided text.
Ignore conversational parts, reflections, ideas, questions, or statements that do not represent a clear task.
Format the output strictly as a JSON object containing a single key "actions" which holds a JSON array of strings, where each string is a distinct task.
Example: {"actions": ["Call Sarah about the project", "Draft the meeting agenda", "Submit the report by Friday"]}
If no actionable tasks are found, return {"actions": []}.
Do not include any explanations or introductory text in your response, only the JSON object.
`;

    // Call OpenAI API
     console.log("Calling OpenAI API for action extraction...");
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Or consider 'gpt-4o-mini' for potentially better quality/cost balance
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content },
      ],
      response_format: { type: 'json_object' }, // Request JSON output format
      temperature: 0.2, // Lower temperature for more deterministic task extraction
    });
     console.log("OpenAI API response received.");

    const messageContent = response.choices[0]?.message?.content;

    if (!messageContent) {
      console.error('OpenAI response content is null or undefined.');
      // Return empty array if AI gives no content, preventing downstream errors
      return NextResponse.json([]); // Return empty array structure directly
    }
     console.log("Raw OpenAI response content:", messageContent);

    // Attempt to parse the JSON string from the AI response
    let extractedTasks: string[];
    try {
      // The AI is asked for a JSON *object* like {"actions": ["task1", "task2"]}
      const parsedJson = JSON.parse(messageContent);

      if (typeof parsedJson === 'object' && parsedJson !== null && Array.isArray(parsedJson.actions)) {
          extractedTasks = parsedJson.actions;
           console.log(`Successfully parsed ${extractedTasks.length} tasks from AI response.`);
      } else {
          console.warn('Parsed JSON from AI does not match expected structure {"actions": [...]}:', parsedJson);
          extractedTasks = []; // Default to empty array if structure is unexpected
      }
    } catch (parseError) {
      console.error('Error parsing JSON from OpenAI response:', parseError);
      // Return empty array if parsing fails
      return NextResponse.json([]); // Return empty array structure directly
    }

    // Ensure we have an array of strings before mapping (extra safety check)
    if (!extractedTasks.every(item => typeof item === 'string')) {
        console.warn('Extracted tasks data is not an array of strings after parsing:', extractedTasks);
        extractedTasks = []; // Sanitize to empty array if format is incorrect
    }


    // Format the tasks into the desired structure [{ task: string, completed: false }, ...]
    const formattedActions: ActionItem[] = extractedTasks.map(task => ({
      task: task,
      completed: false,
    }));
     console.log("Formatted actions:", formattedActions);

    return NextResponse.json(formattedActions);

  } catch (error) {
    console.error('Error in /api/extract-actions:', error);
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
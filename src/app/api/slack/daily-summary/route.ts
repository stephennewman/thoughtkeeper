import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { startOfDay, endOfDay } from 'date-fns';

// Initialize OpenAI client 
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120 * 1000, // Increase timeout for potentially longer summaries
});

// Define type for message data expected from the internal fetch
interface SlackMessage {
  id: string;
  ts: string;
  user: string;
  userName: string;
  text: string;
  date: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Expect single channelId now
    const channelId = body.channelId as string | undefined; 
    const targetDate = body.date as string | undefined; // Expect YYYY-MM-DD

    if (!channelId || !targetDate) {
      return NextResponse.json({ error: 'Missing channelId or date in request body.' }, { status: 400 });
    }

    console.log(`[daily-summary] Generating summary for date: ${targetDate}, channel: ${channelId}`);

    // Calculate start/end timestamps for the target date
    let oldestTs: string | undefined = undefined;
    let latestTs: string | undefined = undefined;
    try {
        const dateObj = new Date(targetDate + 'T00:00:00'); // Ensure parsing as local start of day
        if (isNaN(dateObj.getTime())) throw new Error('Invalid date format');
        const start = startOfDay(dateObj);
        const end = endOfDay(dateObj);
        oldestTs = (start.getTime() / 1000).toString();
        latestTs = (end.getTime() / 1000).toString();
    } catch(e) {
        return NextResponse.json({ error: 'Invalid date format provided. Use YYYY-MM-DD.' }, { status: 400 });
    }

    // Get the base URL for internal API calls
    const host = req.headers.get('host');
    const protocol = host?.startsWith('localhost') ? 'http' : 'https'; // Use HTTP for local internal calls (NODE_TLS_REJECT_UNAUTHORIZED handles cert)
    const absoluteUrl = `${protocol}://${host}`;

    // Fetch messages for the single specified channel for the target date
    let messages: SlackMessage[] = [];
    try {
      const res = await fetch(`${absoluteUrl}/api/slack/messages/${channelId}?oldest=${oldestTs}&latest=${latestTs}`); 
      const data = await res.json();
      if (!res.ok) {
        console.error(`Error fetching messages for ${channelId} on ${targetDate}:`, data.error || res.status);
        // If fetching fails, return specific error instead of empty summary
        throw new Error(data.error || `Failed to fetch messages for channel ${channelId}`);
      }
      messages = data.messages || [];
    } catch (error: any) {
      console.error(`Network error fetching internal messages for ${channelId} on ${targetDate}:`, error);
      // Propagate fetch error
      throw error;
    }
    
    if (messages.length === 0) {
      return NextResponse.json({ summary: 'No Slack messages found for this channel on this date.' });
    }

    // Sort messages chronologically (optional but good practice for summary context)
    messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

    // Combine message texts for the summary prompt
    const combinedText = messages.map(msg => `${msg.userName}: ${msg.text}`).join('\n---\n');

    // --- Define the prompt for the AI --- 
    const systemPrompt = "You are a helpful assistant. Summarize the key topics, decisions, and any action items from the following Slack conversation transcript for the day.";
    const userPrompt = `Daily Slack Conversation Transcript:\n---\n${combinedText}\n---\nDaily Summary:`;

    // --- Call OpenAI Chat Completions API --- 
    console.log('[daily-summary] Sending request to OpenAI for summary...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 250, // Allow for a longer summary
    });

    const summary = completion.choices[0]?.message?.content?.trim() || 'Could not generate summary.';
    console.log('[daily-summary] Received summary from OpenAI:', summary);

    return NextResponse.json({ summary });

  } catch (error: any) {
    console.error('[daily-summary] Error generating daily summary:', error);
    let errorMessage = error.message || 'Internal Server Error';
    if (error.response?.data?.error?.message) { 
      errorMessage = `OpenAI Error: ${error.response.data.error.message}`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 
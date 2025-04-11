import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import OpenAI from 'openai';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';

// Initialize Slack WebClient
const slackToken = process.env.SLACK_BOT_TOKEN;
const slackClient = new WebClient(slackToken);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to fetch messages for a single channel within a date range
async function fetchChannelMessages(channelId: string, oldest: string, latest: string): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
  console.log(`Fetching messages for channel ${channelId} between ${oldest} and ${latest}`);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  let cursor: string | undefined = undefined;
  const userCache: { [userId: string]: string } = {}; // Cache for user names

  try {
    do {
      const result = await slackClient.conversations.history({
        channel: channelId,
        oldest: oldest,
        latest: latest,
        limit: 200, // Adjust limit as needed, max 1000 generally, but history is 100 default, 200 safe-ish
        cursor: cursor,
      });

      if (!result.ok || !result.messages) {
        console.error(`Error fetching messages for channel ${channelId}:`, result.error);
        break; // Stop fetching for this channel on error
      }

      // Process messages and fetch user names if needed
      for (const message of result.messages) {
        if (message.user && message.text && !message.subtype) { // Only include regular user messages with text
          let userName = userCache[message.user];
          if (!userName) {
            try {
              const userResult = await slackClient.users.info({ user: message.user });
              if (userResult.ok && userResult.user?.profile?.display_name_normalized) {
                userName = userResult.user.profile.display_name_normalized;
                userCache[message.user] = userName; // Cache the name
              } else {
                userName = message.user; // Fallback to user ID
              }
            } catch (userError) {
              console.warn(`Could not fetch user info for ${message.user}:`, userError);
              userName = message.user; // Fallback on error
            }
          }
          // Prepend channel name and user for context in the digest prompt
          messages.push({
             role: "user", // Representing the Slack message content
             // Format: "[#channel-name] UserName: message text" - Adjust as needed
             content: `[${channelId}] ${userName}: ${message.text}`
          });
        }
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    console.log(`Fetched ${messages.length} messages for channel ${channelId}`);
  } catch (error) {
    console.error(`Error fetching history for channel ${channelId}:`, error);
    // Don't throw here, allow digest generation with potentially partial data
  }
  return messages;
}

// Helper to fetch channel names (optional, for better context string)
async function getChannelNames(channelIds: string[]): Promise<Record<string, string>> {
    const names: Record<string, string> = {};
    try {
        const results = await Promise.all(channelIds.map(id =>
            slackClient.conversations.info({ channel: id }).catch(e => {
                console.warn(`Could not fetch info for channel ${id}:`, e);
                return null; // Handle case where bot might not be in channel or channel deleted
            })
        ));
        results.forEach((res, index) => {
            if (res?.ok && res.channel?.name) {
                names[channelIds[index]] = `#${res.channel.name}`;
            } else {
                names[channelIds[index]] = channelIds[index]; // Fallback to ID
            }
        });
    } catch (error) {
        console.error("Error fetching channel names:", error);
        // Fallback to IDs if bulk fetch fails
        channelIds.forEach(id => { names[id] = id; });
    }
    return names;
}


export async function POST(request: Request) {
  console.log("Received POST request to /api/slack/daily-digest");
  try {
    const body = await request.json();
    const { date, channelIds } = body;

    // --- Input Validation ---
    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid or missing date parameter (YYYY-MM-DD required)' }, { status: 400 });
    }
    if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0 || !channelIds.every(id => typeof id === 'string')) {
       return NextResponse.json({ error: 'Invalid or missing channelIds parameter (array of strings required)' }, { status: 400 });
    }
    if (!slackToken) {
        return NextResponse.json({ error: 'Slack token not configured' }, { status: 500 });
    }
     if (!openai.apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });
    }

    console.log(`Processing digest request for Date: ${date}, Channels: ${channelIds.join(', ')}`);

    // --- Calculate Time Range ---
    const targetDate = parseISO(date); // Parse YYYY-MM-DD string
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);
    const oldestTimestamp = (start.getTime() / 1000).toString();
    const latestTimestamp = (end.getTime() / 1000).toString();

    console.log(`Time range: ${start.toISOString()} (${oldestTimestamp}) to ${end.toISOString()} (${latestTimestamp})`);

    // --- Fetch Messages Concurrently ---
    const channelNames = await getChannelNames(channelIds); // Get names for context
    // Modify message content to include channel names if available
    const messageFetchPromises = channelIds.map(async (channelId) => {
        const fetchedMessages = await fetchChannelMessages(channelId, oldestTimestamp, latestTimestamp);
        const channelDisplayName = channelNames[channelId] || channelId;
        // Update content to use channel name, ensuring content is a string
        return fetchedMessages.map(msg => {
            let updatedContent = '';
            if (typeof msg.content === 'string') {
                updatedContent = msg.content.replace(`[${channelId}]`, `[${channelDisplayName}]`);
            } else {
                // Handle non-string content if necessary, though unlikely given our fetch logic
                console.warn("Encountered non-string message content:", msg.content);
                // Fallback: attempt to stringify or just leave empty/original?
                // For now, let's keep it empty if it wasn't a string we expected.
            }
            return {
                ...msg,
                content: updatedContent
            };
        });
    });

    const results = await Promise.all(messageFetchPromises);
    const allMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = results.flat(); // Flatten the array of arrays

    console.log(`Total messages fetched across ${channelIds.length} channels: ${allMessages.length}`);

    // --- Generate Digest with OpenAI ---
    if (allMessages.length === 0) {
      console.log("No messages found for the given date and channels.");
      return NextResponse.json({ digest: "No messages found for this day across the selected channels." }); // Return specific message
    }

    // Construct messages for OpenAI API
    const messagesForOpenAI: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
            role: "system",
            content: `You are a helpful assistant. You will be given a series of Slack messages from multiple channels for a specific day (${date}). Each message is prefixed with its channel name/ID and the user who sent it (e.g., "[#channel-name] User Name: message text"). 
Your primary task is to generate a concise, synthesized digest summarizing the key discussions, decisions, questions, and action items across all provided channels for that day. Focus on the most important information and avoid excessive detail. Use bullet points if appropriate for clarity. If there are very few messages, provide a brief summary. Ignore pleasantries or messages without substance.

After the main digest, add a distinct section starting exactly with "Key Topics:", followed by a comma-separated list of the 3-5 most important keywords, themes, or project names discussed throughout the messages. 

Output only the digest and the Key Topics section.`
        },
        // Spread the fetched messages here
        ...allMessages
    ];


    console.log(`Sending ${allMessages.length} messages to OpenAI for digest generation...`);

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Or your preferred model
            messages: messagesForOpenAI,
            temperature: 0.5, // Adjust temperature for desired creativity/factuality
            max_tokens: 300, // Limit output length
        });

        const digest = completion.choices[0]?.message?.content?.trim();
        console.log("OpenAI Digest Generated:", digest);

        if (!digest) {
            console.error("OpenAI returned an empty digest.");
            // Fallback message instead of erroring?
             return NextResponse.json({ digest: "Could not generate a digest for this day." });
        }

        return NextResponse.json({ digest });

    } catch (openaiError) {
         console.error("Error calling OpenAI API:", openaiError);
         return NextResponse.json({ error: 'Failed to generate digest via OpenAI' }, { status: 500 });
    }

  } catch (error) {
    console.error("Error in /api/slack/daily-digest:", error);
    // Generic error for unexpected issues
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// Optional: Add handler for GET or other methods if needed, or OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust for production
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 
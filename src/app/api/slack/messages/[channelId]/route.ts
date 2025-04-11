import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { format } from 'date-fns';

// Initialize Slack Web API client (reuse from previous route or re-initialize)
const slackToken = process.env.SLACK_BOT_TOKEN;
// It's generally safe to re-initialize; avoids module-level state issues if deployed serverlessly
const slackClient = new WebClient(slackToken);

interface RouteParams {
  params: {
    channelId: string;
  };
}

// Simple cache for user info (In-memory, reset on server restart/redeploy)
// For production, consider a more persistent cache (Redis, etc.)
const userInfoCache = new Map<string, { name: string | undefined }>();

async function getUserInfo(userId: string): Promise<{ name: string | undefined }> {
  if (userInfoCache.has(userId)) {
    return userInfoCache.get(userId)!;
  }
  try {
    const result = await slackClient.users.info({ user: userId });
    if (result.ok && result.user) {
      const info = { name: result.user.real_name || result.user.name }; // Fallback to username
      userInfoCache.set(userId, info);
      return info;
    }
  } catch (error) {
    console.error(`Failed to fetch user info for ${userId}:`, error);
  }
  // Cache failed lookup briefly to avoid hammering API for invalid IDs
  userInfoCache.set(userId, { name: undefined }); 
  return { name: undefined }; 
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { channelId } = params;
  // Get optional oldest/latest from query params
  const url = new URL(request.url);
  const oldest = url.searchParams.get('oldest'); // Slack uses epoch seconds
  const latest = url.searchParams.get('latest'); // Slack uses epoch seconds

  if (!slackToken) {
    console.error('SLACK_BOT_TOKEN is not set in environment variables.');
    return NextResponse.json({ error: 'Slack API token is not configured.' }, { status: 500 });
  }

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required.' }, { status: 400 });
  }

  try {
    console.log(`Fetching messages for channel ${channelId}${oldest ? ` from ${oldest}` : ''}${latest ? ` until ${latest}` : ''}...`);
    
    // Call the conversations.history method with optional time range
    const result = await slackClient.conversations.history({
      channel: channelId,
      limit: 1000, // Fetch more messages for daily summary (max 1000 per page)
      oldest: oldest ?? undefined,
      latest: latest ?? undefined,
      // TODO: Handle pagination if > 1000 messages per day is possible
    });

    if (!result.ok) {
      console.error('Slack API error (conversations.history):', result.error);
      throw new Error(`Slack API error: ${result.error}`);
    }

    console.log('Successfully fetched messages:', result.messages?.length);

    // Get unique user IDs from messages (both senders and mentions)
    const userIds = new Set<string>();
    const mentionRegex = /<@([A-Z0-9]+)>/g; // Regex to find mentions

    result.messages?.forEach(msg => {
      if (msg.user) userIds.add(msg.user); // Add sender
      // Find all mentions in the text
      let match;
      if (msg.text) {
        while ((match = mentionRegex.exec(msg.text)) !== null) {
          userIds.add(match[1]); // Add mentioned user ID (group 1)
        }
      }
      // Reset regex lastIndex for the next message if needed (usually ok here)
      mentionRegex.lastIndex = 0; 
    });

    // Fetch user info for all unique users concurrently
    const userInfoPromises = Array.from(userIds).map(id => getUserInfo(id));
    await Promise.all(userInfoPromises); // Wait for all lookups (populates cache)

    // Map messages, enrich with sender userName, replace mentions, add date and id
    const messages = result.messages?.map(msg => {
      const senderInfo = msg.user ? userInfoCache.get(msg.user) : undefined;
      
      // Replace mentions in the text
      let processedText = msg.text || '';
      processedText = processedText.replace(mentionRegex, (match, mentionedUserId) => {
        const mentionedUserInfo = userInfoCache.get(mentionedUserId);
        return `@${mentionedUserInfo?.name || mentionedUserId}`; 
      });

      // Convert Slack timestamp (string like "1711485457.070369") to YYYY-MM-DD date
      let messageDate = '';
      if (msg.ts) {
        try {
          const timestampMs = parseFloat(msg.ts) * 1000;
          const dateObj = new Date(timestampMs);
          if (!isNaN(dateObj.getTime())) {
             messageDate = format(dateObj, 'yyyy-MM-dd');
          }
        } catch (e) {
            console.error(`Failed to parse timestamp ${msg.ts}:`, e);
        }
      }

      return {
        id: msg.ts, // Use timestamp as unique ID
        ts: msg.ts, 
        user: msg.user, 
        userName: senderInfo?.name || 'Unknown User', 
        text: processedText, 
        date: messageDate, // Add the formatted date
      };
    }) || [];

    return NextResponse.json({ messages });

  } catch (error: any) {
    console.error(`Error fetching Slack messages for channel ${channelId}:`, error);
    // Provide more specific error feedback if possible (e.g., channel_not_found)
    let errorMessage = `Internal Server Error: ${error.message}`;
    if (error.message?.includes('channel_not_found') || error.data?.error === 'channel_not_found') {
      errorMessage = 'Slack channel not found or the bot is not a member.';
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 
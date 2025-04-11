import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

// Initialize Slack Web API client
const slackToken = process.env.SLACK_BOT_TOKEN;
const slackClient = new WebClient(slackToken);

export async function GET() {
  if (!slackToken) {
    console.error('SLACK_BOT_TOKEN is not set in environment variables.');
    return NextResponse.json({ error: 'Slack API token is not configured.' }, { status: 500 });
  }

  try {
    console.log('Attempting to fetch Slack channels...');
    // Call the conversations.list method using the WebClient
    const result = await slackClient.conversations.list({
      // Optional: Fetch only public channels
      types: 'public_channel',
      limit: 200 // Fetch up to 200 channels
    });

    if (!result.ok) {
      console.error('Slack API error (conversations.list):', result.error);
      throw new Error(`Slack API error: ${result.error}`);
    }

    console.log('Successfully fetched channels:', result.channels?.length);
    // Return only channel names and IDs for simplicity
    const channels = result.channels?.map(channel => ({ 
        id: channel.id, 
        name: channel.name 
    })) || [];

    return NextResponse.json({ channels });

  } catch (error: any) {
    console.error('Error fetching Slack channels:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
} 
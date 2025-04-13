import { NextResponse } from 'next/server';
import fsPromises from 'fs/promises'; // Use promises API for async operations like mkdir, access, unlink, writeFile
import fs from 'fs'; // Use standard fs for createReadStream
import path from 'path';
import os from 'os';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// Ensure OpenAI API key is available
if (!process.env.OPENAI_API_KEY) {
  // Log the error but don't throw here, handle in POST
  console.error("CRITICAL: Missing OpenAI API Key environment variable.");
}

// Initialize OpenAI client cautiously
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
} else {
    console.error("OpenAI client not initialized due to missing API key.");
}


// Increase timeout for Vercel serverless function
// (Adjust as needed, max typically 60s for Hobby/Pro plans unless configured higher)
export const maxDuration = 60;

// Define a temporary directory for uploads
const uploadDir = path.join(os.tmpdir(), 'thoughtkeeper-uploads');

async function ensureUploadDirExists() {
  try {
    await fsPromises.access(uploadDir); // Use promises API
  } catch (error) {
    // Directory does not exist, create it
    console.log(`Creating temporary upload directory: ${uploadDir}`);
    await fsPromises.mkdir(uploadDir, { recursive: true }); // Use promises API
  }
}

// Helper to safely delete a file
async function safeUnlink(filepath: string | undefined | null) {
    if (filepath) {
        try {
            await fsPromises.unlink(filepath); // Use promises API
            console.log(`Cleaned up temporary file: ${filepath}`);
        } catch (unlinkErr: any) {
            // Ignore if file doesn't exist (already cleaned up or failed to save)
            if (unlinkErr.code !== 'ENOENT') {
                console.error(`Error deleting temporary file ${filepath}:`, unlinkErr);
            }
        }
    }
}


export async function POST(request: Request) {
  console.log('POST /api/transcribe received');
  await ensureUploadDirExists();

  let tempFilePath: string | null = null;

  try {
    // Check if OpenAI client is initialized
    if (!openai) {
        throw new Error("Server configuration error: OpenAI client not available (Missing API Key?).");
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Basic check for potentially allowed types (less strict than formidable filter)
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp3']; // Added mp3
    if (!allowedTypes.includes(audioFile.type)) {
         console.warn(`Received potentially unsupported audio type: ${audioFile.type}. Attempting transcription...`);
         // Allow it for now, Whisper might handle it
    }

    // Check file size (Whisper has a 25MB limit)
    const maxFileSize = 25 * 1024 * 1024;
    if (audioFile.size > maxFileSize) {
        console.error(`Audio file size ${audioFile.size} exceeds limit of ${maxFileSize} bytes.`);
        return NextResponse.json({ error: `Audio file exceeds size limit of ${maxFileSize / 1024 / 1024}MB.` }, { status: 413 }); // 413 Payload Too Large
    }


    // Generate unique filename and path
    const uniqueFilename = `${uuidv4()}-audio.${audioFile.name.split('.').pop() || 'webm'}`;
    tempFilePath = path.join(uploadDir, uniqueFilename);

    // Convert Blob to Buffer and save temporarily
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    await fsPromises.writeFile(tempFilePath, audioBuffer); // Use promises API
    console.log(`Audio file saved temporarily to: ${tempFilePath}`);

    // --- START REAL TRANSCRIPTION ---
    console.log(`Transcribing audio file: ${tempFilePath}`);

    // --- Use fs.createReadStream for the API call ---
    const fileReadStream = fs.createReadStream(tempFilePath); // Use standard fs API

    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: fileReadStream, // Pass the file stream directly
      model: 'whisper-1',
      // You can add optional parameters here if needed, e.g.:
      // response_format: 'json', // Default is json
      // language: 'en' // Optional: hint the language
    });

    const transcript = transcriptionResponse.text;
    console.log(`Transcription successful. Length: ${transcript?.length ?? 0}`);
    // --- END REAL TRANSCRIPTION ---

    return NextResponse.json({ transcript }); // Return just the transcript text

  } catch (error: any) {
    console.error('Transcription API Error:', error);
    // Default error message and status
    let errorMessage = 'Failed to transcribe audio.';
    let statusCode = 500;

    // Check for OpenAI specific errors
    if (error instanceof OpenAI.APIError) {
        console.error(`OpenAI API Error: Status ${error.status}, Message: ${error.message}`);
        errorMessage = error.message || 'Error communicating with OpenAI API.';
        statusCode = error.status || 500;
        if (statusCode === 401) {
             errorMessage = 'Invalid OpenAI API Key provided.';
        } else if (statusCode === 429) {
             errorMessage = 'OpenAI Rate Limit Exceeded or Quota Reached.';
        } else if (statusCode === 400) {
             errorMessage = `Invalid request to OpenAI: ${error.message}`; // e.g., unsupported audio format by Whisper
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
        // Re-check for specific non-OpenAI errors if needed
        if (errorMessage.includes("Missing API Key")) {
            statusCode = 503; // Service Unavailable
            errorMessage = "Server configuration error: Missing OpenAI API Key.";
        }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });

  } finally {
    // Clean up the temporary file
    await safeUnlink(tempFilePath);
  }
} 
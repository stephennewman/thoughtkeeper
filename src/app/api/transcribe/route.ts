import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // For unique filenames

// Ensure OPENAI_API_KEY is set
if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY environment variable");
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Helper to safely delete a file
async function safeUnlink(filepath: string | undefined) {
    if (filepath) {
        try {
            await fs.promises.unlink(filepath);
            console.log(`Cleaned up temporary file: ${filepath}`);
        } catch (unlinkErr: any) {
            if (unlinkErr.code !== 'ENOENT') {
                console.error(`Error deleting temporary file ${filepath}:`, unlinkErr);
            }
        }
    }
}

export async function POST(req: Request) {
    console.log("POST /api/transcribe received");
    let tempFilePath: string | undefined = undefined;

    try {
        if (!process.env.OPENAI_API_KEY) {
             throw new Error("Server configuration error: Missing API Key.");
        }

        const formData = await req.formData();
        const audioFile = formData.get('audio');

        // Check if audio file exists and is a File object
        if (!audioFile || !(audioFile instanceof File)) {
            return NextResponse.json({ error: 'No audio file uploaded or invalid format.' }, { status: 400 });
        }

        // Basic check for potentially allowed types (less strict than formidable filter)
        const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/webm', 'audio/ogg'];
        if (!allowedTypes.includes(audioFile.type)) {
             console.warn(`Received potentially unsupported audio type: ${audioFile.type}`);
             // Allow it for now, Whisper might handle it
        }

        // Check file size (e.g., 10MB limit)
        const maxFileSize = 10 * 1024 * 1024;
        if (audioFile.size > maxFileSize) {
            return NextResponse.json({ error: `Audio file exceeds size limit of ${maxFileSize / 1024 / 1024}MB.` }, { status: 400 });
        }

        // Convert File (Blob) to Buffer
        const buffer = Buffer.from(await audioFile.arrayBuffer());

        // Create a temporary file path
        const tempDir = path.join(os.tmpdir(), 'thoughtkeeper-uploads');
        await fs.promises.mkdir(tempDir, { recursive: true }); // Ensure directory exists
        const tempFileName = `${uuidv4()}-${audioFile.name}`; // Use UUID for uniqueness
        tempFilePath = path.join(tempDir, tempFileName);

        // Write buffer to temporary file
        await fs.promises.writeFile(tempFilePath, buffer);
        console.log(`Audio file saved temporarily to: ${tempFilePath}`);

        // Call Whisper API with the file stream
        console.log(`Transcribing audio file: ${tempFilePath}`);
        const transcription = await openai.audio.transcriptions.create({
            model: 'whisper-1',
            file: fs.createReadStream(tempFilePath),
        });

        console.log("Transcription successful.");

        // Return the transcription text
        return NextResponse.json({ transcription: transcription.text || '' });

    } catch (error: any) {
        console.error("Error in /api/transcribe:", error);
        let errorMessage = 'Failed to transcribe audio.';
        let statusCode = 500;

        if (error.response) { // Error from OpenAI API
            errorMessage = error.response.data?.error?.message || errorMessage;
            statusCode = error.response.status || statusCode;
        } else if (error.message) {
            errorMessage = error.message;
             // Basic check for size limit errors potentially caught before API call
            if (errorMessage.includes("limit")) statusCode = 400;
        }

        return NextResponse.json({ error: errorMessage }, { status: statusCode });

    } finally {
        // Clean up the temporary file
        await safeUnlink(tempFilePath);
    }
}

// Set max duration for Vercel
export const maxDuration = 60; 
import { ElevenLabsClient } from 'elevenlabs';
import dotenv from 'dotenv';

dotenv.config();

async function listVoices() {
  const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY!.trim() });
  try {
    const voices = await client.voices.getAll();
    console.log('--- Available Voices ---');
    voices.voices.slice(0, 5).forEach(v => {
      console.log(`Name: ${v.name}, ID: ${v.voice_id}`);
    });
  } catch (error: any) {
    console.error('Error listing voices:', error.message);
  }
}

listVoices();
